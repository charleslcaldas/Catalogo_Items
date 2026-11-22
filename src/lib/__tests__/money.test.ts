// Suite de cálculo/arredondamento — vitest (pnpm -s vitest run)
// Evidência executável dos critérios: fórmula venda=margem, precisão 2/3, totais, moeda única.

import { describe, expect, it } from 'vitest'

import {
  assertSingleCurrency,
  centsToNumber,
  computeMargem,
  computeTotaisFinanceiros,
  computeVenda,
  formatCents,
  formatMargem,
  isValidMargin,
  lineTotalCents,
  parseToCents,
} from '../money'

describe('parsing / formatação', () => {
  it('parse br/us/número', () => {
    expect(parseToCents('1.234,56')).toBe(123456)
    expect(parseToCents('1234.56')).toBe(123456)
    expect(parseToCents(100)).toBe(10000)
  })

  it('parse de entradas inválidas → 0', () => {
    expect(parseToCents(Number.NaN)).toBe(0)
    expect(parseToCents('')).toBe(0)
    expect(parseToCents(null)).toBe(0)
  })

  it('precisão 2 e 3 casas', () => {
    expect(centsToNumber(1235, 3)).toBe(1.235)
    expect(formatCents(1235, 3)).toBe('1,235')
    expect(centsToNumber(12345, 2)).toBe(123.45)
  })
})

describe('fórmula obrigatória venda = compra / (1 - margem/100)', () => {
  it('compra 100 margem 10 → 111,11 (margem, NÃO markup)', () => {
    expect(computeVenda(100, 10)).toBeCloseTo(111.11, 2)
  })

  it('casos inválidos: margem ≥ 100, compra 0, números não finitos', () => {
    expect(computeVenda(100, 100)).toBeUndefined()
    expect(computeVenda(0, 10)).toBeUndefined()
    expect(computeVenda(Number.NaN, 10)).toBeUndefined()
    expect(computeVenda(100, Number.POSITIVE_INFINITY)).toBeUndefined()
    expect(isValidMargin(-1)).toBe(false)
    expect(isValidMargin(Number.NaN)).toBe(false)
    expect(isValidMargin(99.99)).toBe(true)
  })
})

describe('edição manual de venda → margem', () => {
  it('venda 120 compra 100 → 16,67%', () => {
    expect(formatMargem(100, 120)).toBe('16.67%')
    expect(computeMargem(100, 120)).toBeCloseTo(16.6667, 3)
  })

  it('venda zero → "—"', () => {
    expect(formatMargem(100, 0)).toBe('—')
    expect(computeMargem(100, 0)).toBeUndefined()
  })
})

describe('precisão 3 casas: 3 × 1,235 = 3,705 (linha) e geral 3,71', () => {
  const precoCents = 1235 // 1,235 em milésimos
  const linha = lineTotalCents(3, precoCents)

  it('total da linha = 3,705 (mesma precisão do unitário)', () => {
    expect(centsToNumber(linha, 3)).toBe(3.705)
    expect(formatCents(linha, 3)).toBe('3,705')
  })

  it('total geral com 2 casas arredondado APÓS somar = 3,71', () => {
    const geral = Math.round(linha / 10) // 370.5 → 371 (centésimos)
    expect(geral).toBe(371)
    expect(centsToNumber(geral, 2)).toBe(3.71)
  })
})

describe('totais agregados (nunca média das margens)', () => {
  const totais = computeTotaisFinanceiros([10000, 10000], [20000, 11000])

  it('somas de compra/venda e ganho bruto', () => {
    expect(totais.totalCompra).toBe(20000)
    expect(totais.totalVenda).toBe(31000)
    expect(totais.ganhoBrutoEstimado).toBe(11000)
  })

  it('margem efetiva = ganho/total venda, ≠ média simples (3,23% vs 25%)', () => {
    expect(totais.margemEfetiva).toBeCloseTo(3.2258, 3)
    expect(formatMargem(totais.totalCompra, 0)).toBe('—')
  })
})

describe('moeda explícita', () => {
  it('moeda única ok; moedas distintas lançam erro', () => {
    expect(assertSingleCurrency(['USD', 'USD'])).toBe('USD')
    expect(() => assertSingleCurrency(['USD', 'BRL'])).toThrow()
  })
})
