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
 */

import { computeVenda, isValidMargin } from './money'

// ---------- códigos de erro (estáveis, espelham o hook) ----------

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
