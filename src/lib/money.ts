/**
 * Cálculo monetário decimal em centavos (long) — evita float binário puro.
 * Precisão configurável por preço unitário: 2 ou 3 casas.
 * Fórmula obrigatória: venda = compra / (1 - margem/100). Sem markup.
 */

// ---------- parsing / formatação ----------

/** Converte string "1.234,56" | "1234.56" | número em centavos (long). */
export function parseToCents(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0
    return Math.round(value * 100)
  }
  const trimmed = String(value).trim()
  if (!trimmed) return 0
  let s = trimmed.replace(/[R$\s]/g, '')
  // Se tem vírgula decimal e ponto de milhar: "1.234,56"
  if (/,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.')
  }
  const n = parseFloat(s)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

/**
 * Converte o inteiro escalado de volta em número decimal, na precisão dada.
 * Convenção de escala: precisão 2 → inteiro = valor × 100 (centavos);
 * precisão 3 → inteiro = valor × 1000 (milésimos).
 * Correção do bug ×10: antes dividia sempre por 1000, mas com um ×10 extra
 * aplicado ao inteiro (44160 → 4416,00 em vez de 441,60).
 */
export function centsToNumber(cents: number, precision: 2 | 3 = 2): number {
  if (!Number.isFinite(cents)) return 0
  const fator = precision === 3 ? 1000 : 100
  return Number((Math.round(cents) / fator).toFixed(precision))
}

/** Formata centavos para exibição com precisão configurável. */
export function formatCents(cents: number, precision: 2 | 3 = 2): string {
  const value = centsToNumber(cents, precision)
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })
}

// ---------- operações ----------

/** Soma centavos com segurança (sem erro binário). */
export function sumCents(...values: number[]): number {
  return values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0)
}

/** Multiplica quantidade (long) × preço em centavos → centavos de linha. */
export function lineTotalCents(quantidade: number, precoCents: number): number {
  const q = Number.isFinite(quantidade) ? quantidade : 0
  const p = Number.isFinite(precoCents) ? precoCents : 0
  return Math.round(q * p)
}

/**
 * Arredonda em centavos (metade para cima) para o total financeiro geral com 2 casas.
 * Soma SEMPRE as linhas em centavos antes de arredondar — nunca média de arredondamentos.
 */
export function roundToCents(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

// ---------- margem / venda ----------

/**
 * Calcula preço de venda a partir da margem: venda = compra / (1 - margem/100).
 * margem é % inteiro ou decimal (10, 10.5, 16.67). margem >= 100 retorna undefined (inválido).
 * compra 0 → undefined (sem divisão inválida).
 */
export function computeVenda(compra: number, margemPct: number): number | undefined {
  if (!Number.isFinite(compra) || !Number.isFinite(margemPct)) return undefined
  if (compra <= 0) return undefined
  if (margemPct >= 100) return undefined
  const venda = compra / (1 - margemPct / 100)
  return Number.isFinite(venda) ? venda : undefined
}

/**
 * Margem efetiva a partir de venda e compra: (venda - compra) / venda * 100.
 * venda <= 0 → undefined (exibir "—").
 */
export function computeMargem(compra: number, venda: number): number | undefined {
  if (!Number.isFinite(compra) || !Number.isFinite(venda)) return undefined
  if (venda <= 0) return undefined
  const m = ((venda - compra) / venda) * 100
  return Number.isFinite(m) ? m : undefined
}

/** Margem efetiva formatada em % com 2 casas, ou "—" quando venda zero. */
export function formatMargem(compra: number, venda: number): string {
  const m = computeMargem(compra, venda)
  if (m === undefined) return '—'
  return `${m.toFixed(2)}%`
}

// ---------- totais financeiros gerais (2 casas) ----------

export interface TotaisFinanceiros {
  totalCompra: number
  totalVenda: number
  ganhoBrutoEstimado: number
  margemEfetiva: number | undefined // undefined quando venda zero → "—"
}

/**
 * Total Compra = soma dos totais de compra (centavos);
 * Total Venda = soma dos totais de venda (centavos);
 * Ganho Bruto = venda - compra;
 * Margem Efetiva = ganho / total venda * 100 — NUNCA média simples das margens.
 */
export function computeTotaisFinanceiros(
  linhasCompraCents: number[],
  linhasVendaCents: number[],
): TotaisFinanceiros {
  const totalCompra = sumCents(...linhasCompraCents)
  const totalVenda = sumCents(...linhasVendaCents)
  const ganho = totalVenda - totalCompra
  const margem = computeMargem(totalCompra, totalVenda)
  return {
    totalCompra,
    totalVenda,
    ganhoBrutoEstimado: ganho,
    margemEfetiva: margem,
  }
}

/** Moeda explícita; nunca somar moedas distintas sem conversão registrada. */
export function assertSingleCurrency(moedas: (string | null | undefined)[]): string {
  const presentes = moedas.filter(Boolean).map((m) => String(m).toUpperCase())
  const unique = Array.from(new Set(presentes))
  if (unique.length === 0) return 'USD'
  if (unique.length === 1) return unique[0]
  throw new Error(
    `Moedas distintas não podem ser somadas sem conversão registrada: ${unique.join(', ')}`,
  )
}

// ---------- validação de números finitos / margem < 100 ----------

export function isValidMargin(margemPct: number | null | undefined): boolean {
  if (margemPct === null || margemPct === undefined || !Number.isFinite(margemPct)) return false
  return margemPct >= 0 && margemPct < 100
}

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}
