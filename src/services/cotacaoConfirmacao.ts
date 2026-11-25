/** LOCAL CANDIDATE. Both server routes remain authenticated and unconditionally 503.
 * The candidate UI now uses these routes; no client CRUD fallback. See review/LOCAL_REVIEW.md for schema and activation prerequisites.
 * Authorization requires explicit server-side user capability and PocketBase canAccessRecord with current collection rules inside
 * the writer transaction. No client permission flag or static team-role substitute.
 * Margin editing must use salvarMargemNegociada atomically; ordinary REST PATCH is
 * not a compare-and-swap and must not be presented as concurrent-edit protection.
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
   * Id obrigatório do registro em potencial_itens a atualizar.
   */
  potencial_iten_id: string
  /** Recorded supplier response/received offer, never the C2 target. */
  rodada_resposta_id: string
  /** updated timestamps of supplier quote, potential item, potential, supplier, catalog item, response. */
  versoes_esperadas: Record<string, string>
  /**
   * Optimistic concurrency: valor `updated` do registro cotacoes_itens lido
   * pelo cliente. Se divergir do vigente no servidor, a confirmação é rejeitada.
   */
  versao: string
  /** Chave de idempotência durável (retry seguro). Obrigatória, 8 a 120 caracteres. */
  idempotency_key: string
  /**
   * Ajuste explícito de quantidade ao MOQ quando quantidade < moq.
   * Sem a flag, quantidade abaixo do MOQ é rejeitada (nunca muda silenciosamente).
   */
  ajustar_quantidade_para_moq?: boolean
  /**
   * Concorrência otimista da MARGEM NEGOCIADA: valor `margem_versao` persistido
   * em cotacoes_itens no momento da leitura. Obrigatório (inteiro >= 1).
   * Divergência da persistida → 409 conflito_margem.
   *
   * NOTA: a margem em si NUNCA vem no payload — o servidor usa EXCLUSIVAMENTE a
   * margem persistida em cotacoes_itens.margem_negociada (fluxo de edição
   * autorizada acima; qualquer `margem`/valor enviado pelo cliente é REJEITADO).
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
    const data = (err.response ?? {}) as { error?: string; message?: string }
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
    payload.margem_versao_esperada < 1 ||
    payload.margem_versao_esperada !== Math.floor(payload.margem_versao_esperada)
  ) {
    throw new ConfirmarCompraError(
      400,
      'payload_invalido',
      'margem_versao_esperada é obrigatória (número inteiro >= 1).',
    )
  }

  if (!payload.potencial_iten_id || !payload.rodada_resposta_id || !payload.versoes_esperadas) {
    throw new ConfirmarCompraError(
      400,
      'payload_invalido',
      'Item, resposta e versões são obrigatórios.',
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
  return ['confirmar-compra', cotacaoItenId, potencialItenId ?? '-', versao]
    .join(':')
    .replace(/[^A-Za-z0-9:_-]/g, '_')
    .slice(0, 120)
}

export interface SalvarMargemPayload {
  cotacao_iten_id: string
  versao: string
  margem_versao_esperada: number
  margem_negociada: number
  precisao_negociada: 2 | 3
}
/** Candidate endpoint is still blocked with 503; used by the candidate review UI. */
export async function salvarMargemNegociada(payload: SalvarMargemPayload) {
  return pb.send<SalvarMargemPayload & { margem_versao: number }>(
    '/backend/v1/cotacoes/salvar-margem',
    { method: 'POST', body: payload },
  )
}
