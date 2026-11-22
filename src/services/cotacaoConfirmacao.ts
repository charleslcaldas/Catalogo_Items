/**
 * Contrato TypeScript do serviço servidor de confirmação de compra.
 *
 * Rota: POST /backend/v1/cotacoes/confirmar-compra (pb_hooks/confirmar_compra.js).
 * Executa UMA transação server-side com efeitos padronizados (vencedor, potencial_itens,
 * historico_precos, cotacoes_rodadas tipo 'selecao', idempotência durável).
 *
 * NESTA RODADA: apenas contrato + função cliente. NENHUMA chamada de UI.
 * O frontend continua usando os caminhos atuais até o frontend ser migrado.
 *
 * MARGEM AUTORITATIVA (v0.0.266): a venda usa EXCLUSIVAMENTE a margem PERSISTIDA
 * em cotacoes_itens.margem_negociada (migration 0066) — NUNCA a margem enviada
 * como número no payload, NUNCA linhas.margem_padrao, NUNCA 7,5 fixo.
 *
 * FLUXO DE EDIÇÃO AUTORIZADA da margem (contrato para o frontend FUTURO —
 * nenhum endpoint novo nesta rodada; documentação apenas):
 *   1. O usuário edita a margem negociada na UI.
 *   2. O frontend PERSISTE a edição ANTES de chamar a confirmação: update em
 *      cotacoes_itens (regra de API update do time, inalterada) enviando
 *      margem_negociada + precisao_negociada (2 ou 3) + margem_versao
 *      INCREMENTADA (+1), com checagem de versão esperada (concorrência
 *      otimista: ler margem_versao atual; o save deve partir da versão lida —
 *      se outro usuário editou entre leitura e save, refazer a leitura).
 *   3. Somente então chamar a confirmação com margem_versao_esperada = versão
 *      recém-persistida. Divergência → 409 conflito_margem (a margem mudou).
 *   4. Margem ausente/vazia persistida → 422 pendencia_margem (nunca fallback).
 *   5. A confirmação consome a margem e incrementa margem_versao (+1) DENTRO da
 *      transação — evita confirmação dupla sob versão obsoleta.
 *
 * AUTORIZAÇÃO (v0.0.264): servidor, dentro da transação, nunca booleano do
 * cliente. Espelho EXATO das API rules auditadas das coleções envolvidas —
 * regras puras em src/lib/confirmacaoCompra.ts (resolverIdentidade,
 * podeAcessar, cadeiaCoerente), testadas em
 * src/lib/__tests__/confirmacaoCompra.test.ts. LACUNAS documentadas lá:
 * JSVM sem API para avaliar filter rules declarativas; users sem campo de
 * bloqueio (só `verified` do sistema); leituras/escritas via API de servidor
 * não passam pelas API rules — a checagem espelhada é o controle de acesso.
 *
 * MATRIZ PERMITIDO/NEGADO (negar por padrão; reavaliada dentro da transação):
 *  - anônimo              → NEGADO (401 nao_autenticado; middleware requireAuth + checagem defensiva)
 *  - usuário Mei (meiqw9s6c4r2t8a) → NEGADO (403 acesso_negado; integração excluída do serviço)
 *  - autenticado do time  → PERMITIDO (regra espelhada; sem ownership por registro)
 *  - cadeia entre escopos → NEGADO (409 relacoes_incoerentes: oferta → cotação
 *                           do fornecedor → potencial ≠ potencial do potencial_iten / item divergente)
 *  - identidade não-resolvida ou indeterminado → NEGADO (403 acesso_negado)
 */

/** Versão da margem negociada: 0/vazio = nunca editada; incrementada a cada edição autorizada e a cada consumo pela confirmação. */
export type MargemVersao = number

import pb from '../lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'

// ---------- tipos do payload ----------

export interface ConfirmarCompraPayload {
  /** Id da oferta vencedora em cotacoes_itens. Obrigatório. */
  cotacao_iten_id: string
  /**
   * Id do registro em potencial_itens a atualizar. Opcional: quando omitido, o
   * servidor resolve pelo par (potencial_id, item_id) — rejeita se ambíguo.
   */
  potencial_iten_id?: string
  /**
   * Optimistic concurrency: valor `updated` do registro cotacoes_itens lido
   * pelo cliente. Se divergir do vigente no servidor, a confirmação é rejeitada.
   */
  versao: string
  /** Chave de idempotência durável (retry seguro). Obrigatória, máx. 200 caracteres. */
  idempotency_key: string
  /**
   * Ajuste explícito de quantidade ao MOQ quando quantidade < moq.
   * Sem a flag, quantidade abaixo do MOQ é rejeitada (nunca muda silenciosamente).
   */
  ajustar_quantidade_para_moq?: boolean
  /**
   * MOQ a considerar se o registro da oferta não tiver quantidade_minima.
   * Ignorado quando a oferta já traz moq próprio >= 0.
   */
  moq?: number
  /**
   * Validade da oferta (data ISO). Quando presente e anterior a agora,
   * a confirmação é rejeitada (oferta vencida).
   */
  oferta_validade?: string
  /**
   * Concorrência otimista da MARGEM NEGOCIADA: valor `margem_versao` persistido
   * em cotacoes_itens no momento da leitura. Obrigatório (inteiro >= 0).
   * Divergência da persistida → 409 conflito_margem.
   *
   * NOTA: a margem em si NUNCA vem no payload — o servidor usa EXCLUSIVAMENTE a
   * margem persistida em cotacoes_itens.margem_negociada (fluxo de edição
   * autorizada acima; qualquer `margem`/valor enviado pelo cliente é IGNORADO).
   */
  margem_versao_esperada: number
}

// ---------- recibo ----------

export interface ReciboRodada {
  id: string
  numero_rodada: number
  tipo: 'selecao'
  estado: 'confirmada'
}

export interface ConfirmarCompraRecibo {
  ok: true
  cotacao_iten_id: string
  potencial_iten_id: string
  item_id: string
  potencial_id: string
  fornecedor_id: string
  /** Preço de compra confirmado (= preco_ofertado da oferta). */
  preco_compra: number
  /** Venda gravada em potencial_itens.preco_unitario (margem vigente, precisão do item). */
  preco_unitario: number
  /** Margem negociada PERSISTIDA em cotacoes_itens.margem_negociada usada no cálculo. */
  margem: number
  /** margem_versao APÓS o consumo (+1 incrementado dentro da transação). */
  margem_versao: MargemVersao
  /** Precisão (2 ou 3 casas) usada no arredondamento da venda. */
  precisao: 2 | 3
  moeda: string
  unidade: string
  quantidade: number
  moq: number
  /** true quando a quantidade foi ajustada ao MOQ explicitamente. */
  quantidade_ajustada_para_moq: boolean
  /** preco_original da oferta, preservado. */
  preco_original_preservado: number
  rodada: ReciboRodada
  autor: string
  data_confirmacao: string
}

export interface ConfirmarCompraResponse {
  /** true quando a resposta vem da chave de idempotência (retry, sem nova execução). */
  repetido: boolean
  recibo: ConfirmarCompraRecibo
}

// ---------- erros ----------

/** Códigos de erro estáveis retornados pelo endpoint em { error }. */
export type ConfirmarCompraErrorCode =
  | 'payload_invalido'
  | 'preco_invalido'
  | 'moq_invalido'
  | 'preco_eh_alvo'
  | 'oferta_vencida'
  | 'relacoes_incoerentes'
  | 'potencial_item_ambiguo'
  | 'quantidade_invalida'
  | 'quantidade_abaixo_moq'
  | 'moeda_ausente'
  | 'unidade_ausente'
  | 'venda_invalida'
  | 'pendencia_margem'
  | 'oferta_nao_encontrada'
  | 'cotacao_fornecedor_nao_encontrada'
  | 'potencial_nao_encontrado'
  | 'fornecedor_nao_encontrado'
  | 'item_nao_encontrado'
  | 'potencial_item_nao_encontrado'
  | 'conflito_versao'
  | 'conflito_idempotencia'
  | 'falha_transacao'
  | 'nao_autenticado'
  | 'acesso_negado'
  | 'identidade_nao_resolvida'
  | 'pendencia_dados'
  | 'precisao_ausente'
  | 'precisao_invalida'
  | 'margem_invalida'
  | 'conflito_margem'

/** Erro tipado do endpoint (código estável + mensagem em português). */
export class ConfirmarCompraError extends Error {
  readonly status: number
  readonly code: ConfirmarCompraErrorCode | string

  constructor(status: number, code: ConfirmarCompraErrorCode | string, message: string) {
    super(message)
    this.name = 'ConfirmarCompraError'
    this.status = status
    this.code = code
  }
}

/** Mapeia falha HTTP/SDK em ConfirmarCompraError com código estável. */
export function toConfirmarCompraError(err: unknown): ConfirmarCompraError {
  if (err instanceof ConfirmarCompraError) return err
  if (err instanceof ClientResponseError) {
    const data = (err.response?.data ?? {}) as { error?: string; message?: string }
    return new ConfirmarCompraError(
      err.status,
      data.error ?? 'falha_transacao',
      data.message ?? err.message,
    )
  }
  return new ConfirmarCompraError(
    0,
    'falha_transacao',
    err instanceof Error ? err.message : 'Falha desconhecida na confirmação de compra.',
  )
}

// ---------- função cliente ----------

/**
 * Confirma a compra de um item de cotação (UMA transação server-side).
 * Não ligada a nenhuma UI nesta rodada — o frontend continua nos caminhos atuais.
 *
 * Lança ConfirmarCompraError com `code` estável em falha.
 */
export async function confirmarCompra(
  payload: ConfirmarCompraPayload,
): Promise<ConfirmarCompraResponse> {
  if (!payload.cotacao_iten_id) {
    throw new ConfirmarCompraError(400, 'payload_invalido', 'cotacao_iten_id é obrigatório.')
  }
  if (!payload.idempotency_key) {
    throw new ConfirmarCompraError(400, 'payload_invalido', 'idempotency_key é obrigatória.')
  }
  if (!payload.versao) {
    throw new ConfirmarCompraError(400, 'payload_invalido', 'versao é obrigatória.')
  }
  if (
    typeof payload.margem_versao_esperada !== 'number' ||
    !Number.isFinite(payload.margem_versao_esperada) ||
    payload.margem_versao_esperada < 0 ||
    payload.margem_versao_esperada !== Math.floor(payload.margem_versao_esperada)
  ) {
    throw new ConfirmarCompraError(
      400,
      'payload_invalido',
      'margem_versao_esperada é obrigatória (número inteiro >= 0).',
    )
  }

  try {
    return await pb.send<ConfirmarCompraResponse>('/backend/v1/cotacoes/confirmar-compra', {
      method: 'POST',
      body: payload,
    })
  } catch (err) {
    throw toConfirmarCompraError(err)
  }
}

/**
 * Gera a chave de idempotência a partir da leitura da oferta: determinística
 * para o mesmo (oferta, versão) — um retry com payload idêntico reutiliza a mesma
 * chave; mudou a versão (oferta atualizada), nova chave é gerada.
 */
export function gerarIdempotencyKey(
  cotacaoItenId: string,
  versao: string,
  potencialItenId?: string,
): string {
  return ['confirmar-compra', cotacaoItenId, potencialItenId ?? '-', versao].join(':').slice(0, 200)
}
