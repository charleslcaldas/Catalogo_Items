/**
 * Regras puras da confirmação de compra — ESPELHO das validações server-side
 * do hook pocketbase/hooks/confirmar_compra.js (rota POST /backend/v1/cotacoes/confirmar-compra).
 *
 * O hook roda na JSVM do PocketBase (Goja) e não pode importar este módulo; a
 * lógica aqui é a MESMA, mantida em paralelo para: (a) contrato tipado do
 * frontend, (b) testes executáveis de margem/precisão/MOQ/canonicalização e
 * (c) validação de payload ANTES de chamar o endpoint (economiza ida e volta).
 *
 * Qualquer mudança de regra DEVE ser aplicada nos dois lugares.
 *
 * AUTORIZAÇÃO (v0.0.264): espelho EXATO das API rules auditadas das coleções
 * envolvidas — negar por padrão, reavaliada dentro da transação (hook). A
 * matriz completa PERMITIDO/NEGADO está em AUTORIZACAO_CONFIRMACAO (abaixo) e
 * é testada em src/lib/__tests__/confirmacaoCompra.test.ts.
 */

import { computeVenda, isValidMargin } from './money'

// ---------- códigos de erro (estáveis, espelham o hook) ----------

export type ConfirmarCompraErrorCode =
  | 'payload_invalido'
  | 'preco_invalido'
  | 'moq_invalido'
  | 'acesso_negado'
  | 'nao_autenticado'
  | 'identidade_nao_resolvida'
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
  | 'pendencia_dados'
  | 'precisao_ausente'
  | 'margem_invalida'
  | 'conflito_versao'
  | 'conflito_idempotencia'
  | 'falha_transacao'

// ---------- payload ----------

export interface ConfirmarCompraPayload {
  cotacao_iten_id: string
  potencial_iten_id?: string
  /** valor `updated` do registro cotacoes_itens lido pelo cliente (optimistic concurrency) */
  versao: string
  idempotency_key: string
  ajustar_quantidade_para_moq?: boolean
  moq?: number
  oferta_validade?: string
}

// ---------- canonicalização (mesma do hook) ----------

/**
 * Canonical JSON: chaves ordenadas, sem ambiguidade de ordem de propriedades.
 * Mesma chave de idempotência + payload semanticamente igual → mesmo hash,
 * independente da ordem das chaves no objeto.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return JSON.stringify(value)
  }
  const keys = Object.keys(value as Record<string, unknown>).sort()
  const parts = keys.map(
    (k) => JSON.stringify(k) + ':' + canonicalize((value as Record<string, unknown>)[k]),
  )
  return '{' + parts.join(',') + '}'
}

/** Cânone do payload de idempotência — campos semânticos APENAS (sem extradata). */
export function payloadCanonico(p: ConfirmarCompraPayload) {
  return {
    cotacao_iten_id: p.cotacao_iten_id ?? '',
    potencial_iten_id: p.potencial_iten_id ?? '',
    versao: p.versao ?? '',
    ajustar_quantidade_para_moq: p.ajustar_quantidade_para_moq === true,
    moq: typeof p.moq === 'number' && Number.isFinite(p.moq) ? p.moq : null,
    oferta_validade: p.oferta_validade ?? '',
  }
}

// ---------- AUTORIZAÇÃO: matriz PERMITIDO/NEGADO (espelho das API rules) ----------

/**
 * REGRA REAL AUDITADA (v0.0.264), nas coleções cotacoes_itens,
 * cotacoes_fornecedor, cotacoes_rodadas e c2_idempotency_keys (list/view/
 * create/update/delete), e — para o time — em potenciais, potencial_itens e
 * historico_precos:
 *
 *   ((@request.auth.id != '') && @request.auth.id != "meiqw9s6c4r2t8a")
 *
 * potenciais/potencial_itens/historico_precos têm cláusulas "||" EXCLUSIVAS do
 * usuário Mei (potenciais create: status="Rascunho" e proprietario="Mei";
 * potencial_itens create: potencial proprietario="Mei", status="Rascunho",
 * item ativo, quantidade 1..1000000, preco_unitario 0..1000000, observacoes="",
 * unidade KPC/MPC/Pcs). Como a integração Mei é EXCLUÍDA da confirmação de
 * compra, a regra EFETIVA para este serviço é a do time, acima.
 *
 * LACUNAS documentadas (não implementáveis no estado atual):
 *  - o JSVM do PocketBase não expõe API para avaliar as filter rules
 *    declarativas das coleções — o espelhamento explícito é a abordagem;
 *  - a coleção users não tem campo de bloqueio além de `verified` (sistema):
 *    "conta bloqueada" não tem representação no schema atual; identidade
 *    existente e ≠ Mei → autorizada conforme a regra espelhada;
 *  - o serviço lê/grava via API de servidor, que NÃO passa pelas API rules —
 *    a checagem espelhada é o que sustenta o controle de acesso.
 */
export const MEI_INTEGRATION_USER_ID = 'meiqw9s6c4r2t8a'

/** Status de identidade para a matriz de autorização (negar por padrão). */
export type IdentidadeStatus = 'anonimo' | 'mei' | 'time' | 'indeterminado'

export interface IdentidadeConfirmacao {
  status: IdentidadeStatus
  id: string
}

/** Operação equivalente exigida por coleção envolvida na confirmação. */
export const OPERACOES_CONFIRMACAO: ReadonlyArray<{
  colecao: string
  operacoes: readonly ('list' | 'view' | 'create' | 'update' | 'delete')[]
}> = [
  { colecao: 'cotacoes_itens', operacoes: ['view', 'update'] },
  { colecao: 'cotacoes_fornecedor', operacoes: ['view'] },
  { colecao: 'cotacoes_rodadas', operacoes: ['list', 'create'] },
  { colecao: 'c2_idempotency_keys', operacoes: ['list', 'create'] },
  { colecao: 'potenciais', operacoes: ['view'] },
  { colecao: 'potencial_itens', operacoes: ['list', 'view', 'update'] },
  { colecao: 'historico_precos', operacoes: ['create'] },
  { colecao: 'itens', operacoes: ['view'] },
  { colecao: 'fornecedores', operacoes: ['view'] },
]

/**
 * Matriz PERMITIDO/NEGADO (negar por padrão):
 *  - anonimo       → NEGADO (401 no middleware requireAuth; defensivo aqui)
 *  - mei           → NEGADO (excluído pela regra efetiva do serviço)
 *  - time          → PERMITIDO conforme OPERACOES_CONFIRMACAO (coleção/operação)
 *  - indeterminado → NEGADO (identidade não-resolvida, caso qualquer)
 *
 * O time não tem papel novo: "time" é exatamente o conjunto da regra espelhada
 * (autenticado ≠ Mei). Nenhum caso é tratado como permitido por omissão.
 */
export function resolverIdentidade(
  authUser: { id?: unknown } | null | undefined,
): IdentidadeConfirmacao {
  if (authUser === null || authUser === undefined) {
    return { status: 'anonimo', id: '' }
  }
  if (typeof authUser.id !== 'string' || authUser.id === '') {
    return { status: 'indeterminado', id: '' }
  }
  if (authUser.id === MEI_INTEGRATION_USER_ID) {
    return { status: 'mei', id: authUser.id }
  }
  return { status: 'time', id: authUser.id }
}

/** Matriz: time → permitido para coleção/oper do escopo; qualquer outra combinação → NEGADO. */
export function podeAcessar(
  identidade: IdentidadeConfirmacao,
  colecao: string,
  operacao: 'list' | 'view' | 'create' | 'update' | 'delete',
): boolean {
  if (identidade.status !== 'time') return false
  for (const o of OPERACOES_CONFIRMACAO) {
    if (o.colecao === colecao && o.operacoes.includes(operacao)) return true
  }
  return false
}

/**
 * Checagem anti-escopo: a cadeia oferta → cotação do fornecedor → potencial →
 * potencial_iten deve apontar para o MESMO potencial e o MESMO item.
 * Divergência em qualquer elo → NEGADO (tentativa entre escopos).
 * Indeterminado (registro ausente ou id vazio em elo obrigatório) → NEGADO.
 */
export function cadeiaCoerente(input: {
  oferta: { id: string; cotacao_fornecedor_id: string; item_id: string } | null
  cotacaoFornecedor: { id: string; potencial_id: string } | null
  potencial: { id: string } | null
  potencialIten: { potencial_id: string; item_id: string } | null
}): boolean {
  const { oferta, cotacaoFornecedor, potencial, potencialIten } = input
  if (!oferta || !cotacaoFornecedor || !potencial) return false
  if (!oferta.id || !oferta.cotacao_fornecedor_id || !oferta.item_id) return false
  if (!cotacaoFornecedor.id || !cotacaoFornecedor.potencial_id) return false
  if (!potencial.id) return false
  if (oferta.cotacao_fornecedor_id !== cotacaoFornecedor.id) return false
  if (cotacaoFornecedor.potencial_id !== potencial.id) return false
  if (potencialIten) {
    if (!potencialIten.potencial_id || !potencialIten.item_id) return false
    if (potencialIten.potencial_id !== potencial.id) return false
    if (potencialIten.item_id !== oferta.item_id) return false
  }
  return true
}

// ---------- validações server-side (espelho) ----------

export interface Pendencia {
  code: ConfirmarCompraErrorCode
  message: string
}

/** Valida o payload na borda do cliente — o servidor revalida tudo. */
export function validarPayload(p: Partial<ConfirmarCompraPayload>): Pendencia[] {
  const erros: Pendencia[] = []
  if (!p.cotacao_iten_id) {
    erros.push({ code: 'payload_invalido', message: 'cotacao_iten_id é obrigatório.' })
  }
  if (!p.idempotency_key || !p.idempotency_key.trim()) {
    erros.push({ code: 'payload_invalido', message: 'idempotency_key é obrigatória.' })
  }
  if (p.idempotency_key && p.idempotency_key.length > 200) {
    erros.push({ code: 'payload_invalido', message: 'idempotency_key excede 200 caracteres.' })
  }
  if (!p.versao) {
    erros.push({
      code: 'payload_invalido',
      message: 'versao (updated do registro cotacoes_itens) é obrigatória.',
    })
  }
  if (p.moq !== undefined && (!Number.isFinite(p.moq) || p.moq < 0)) {
    erros.push({ code: 'moq_invalido', message: 'moq deve ser um número >= 0.' })
  }
  return erros
}

/**
 * O alvo (preco_contraproposta) NUNCA confirma compra: exige preço de oferta
 * confirmada distinto do alvo. Retorna pendência quando preco == alvo > 0.
 */
export function validarPrecoNaoEhAlvo(
  preco: number,
  precoContraproposta: number,
): Pendencia | null {
  if (
    Number.isFinite(precoContraproposta) &&
    precoContraproposta > 0 &&
    precoContraproposta === preco
  ) {
    return {
      code: 'preco_eh_alvo',
      message: 'O preço informado é o alvo (contraproposta C2). Não confirma compra.',
    }
  }
  return null
}

/**
 * MOQ nunca muda quantidade silenciosamente: quantidade < moq é rejeitada, a não
 * ser com a flag explícita ajustar_quantidade_para_moq=true (ajusta ao moq).
 */
export function avaliarMoq(
  quantidade: number,
  moq: number,
  ajustarFlag: boolean,
): { ok: boolean; quantidadeFinal: number; pendencia: Pendencia | null } {
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return {
      ok: false,
      quantidadeFinal: 0,
      pendencia: {
        code: 'quantidade_invalida',
        message: 'quantidade do item do potencial deve ser > 0.',
      },
    }
  }
  if (moq > 0 && quantidade < moq && !ajustarFlag) {
    return {
      ok: false,
      quantidadeFinal: quantidade,
      pendencia: {
        code: 'quantidade_abaixo_moq',
        message: 'Quantidade abaixo do MOQ. Envie ajustar_quantidade_para_moq=true.',
      },
    }
  }
  return {
    ok: true,
    quantidadeFinal: moq > 0 && quantidade < moq && ajustarFlag ? moq : quantidade,
    pendencia: null,
  }
}

/** Validade da oferta: quando presente e anterior a agora → oferta vencida. */
export function ofertaEstaVencida(validade: string | undefined, agora = new Date()): boolean {
  if (!validade) return false
  const d = new Date(String(validade).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return true // data inválida não passa
  return d.getTime() < agora.getTime()
}

/**
 * Venda da confirmação: margem VIGENTE do item/linha (nunca 7,5 fixo),
 * fórmula venda = compra / (1 - margem/100), arredondada na precisão 2/3 do item.
 * Margem ausente/inválida → pendência explícita (não inventa valor).
 */
export function calcularVendaConfirmacao(
  precoCompra: number,
  margemVigente: number | null | undefined,
  precisaoPreco: number | null | undefined,
): { venda: number | undefined; precisao: 2 | 3; pendencia: Pendencia | null } {
  const precisao: 2 | 3 = Number(precisaoPreco) === 3 ? 3 : 2
  if (!isValidMargin(margemVigente ?? undefined)) {
    return {
      venda: undefined,
      precisao,
      pendencia: {
        code: 'pendencia_margem',
        message:
          'Margem vigente da linha ausente ou inválida (>= 100) — pendência explícita. Nada foi gravado.',
      },
    }
  }
  const vendaBruta = computeVenda(precoCompra, margemVigente as number)
  if (vendaBruta === undefined) {
    return {
      venda: undefined,
      precisao,
      pendencia: {
        code: 'venda_invalida',
        message: 'Cálculo de venda resultou inválido — nada gravado.',
      },
    }
  }
  const fator = precisao === 3 ? 1000 : 100
  const venda = Math.round(vendaBruta * fator) / fator
  if (!Number.isFinite(venda) || venda <= 0) {
    return {
      venda: undefined,
      precisao,
      pendencia: {
        code: 'venda_invalida',
        message: 'Arredondamento da venda resultou inválido — nada gravado.',
      },
    }
  }
  return { venda, precisao, pendencia: null }
}
