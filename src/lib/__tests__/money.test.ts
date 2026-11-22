// Suite de cálculo/arredondamento (executável com: node --experimental-strip-types src/lib/__tests__/money.test.ts)
// NÃO é importada pelo app; serve como evidência executável dos critérios 2, 3, 5, 6 e 13.

import {
  parseToCents,
  centsToNumber,
  formatCents,
  lineTotalCents,
  computeVenda,
  computeMargem,
  computeTotaisFinanceiros,
  formatMargem,
  assertSingleCurrency,
  isValidMargin,
} from './money'

let passed = 0
let failed = 0
const failures: string[] = []

function eq(name: string, actual: unknown, expected: unknown) {
  const okv = JSON.stringify(actual) === JSON.stringify(expected)
  if (okv) passed++
  else {
    failed++
    failures.push(`${name}: esperado ${JSON.stringify(expected)}, obtido ${JSON.stringify(actual)}`)
  }
}

function ok(name: string, cond: boolean) {
  if (cond) passed++
  else {
    failed++
    failures.push(name)
  }
}

// parse
eq('parse br', parseToCents('1.234,56'), 123456)
eq('parse us', parseToCents('1234.56'), 123456)
eq('parse num', parseToCents(100), 10000)
eq('parse nan', parseToCents(Number.NaN), 0)
eq('parse empty', parseToCents(''), 0)

// precisão
eq('cents 3 casas', centsToNumber(1235, 3), 1.235)
eq('format 3 casas', formatCents(1235, 3), '1,235')
eq('cents 2 casas', centsToNumber(12345, 2), 123.45)

// fórmula obrigatória
ok('compra 100 margem 10 → 111,11', Math.abs((computeVenda(100, 10) as number) - 111.11) < 0.005)
ok('margem 100 inválida', computeVenda(100, 100) === undefined)
ok('compra 0 inválida', computeVenda(0, 10) === undefined)
ok('margem negativa inválida', !isValidMargin(-1))
ok('margem NaN inválida', !isValidMargin(Number.NaN))

// edição manual de venda
ok('venda 120 compra 100 → 16,67%', formatMargem(100, 120) === '16.67%')
ok('venda zero → —', formatMargem(100, 0) === '—')

// exemplo obrigatório 1,235 × 3
const linha = lineTotalCents(3, parseToCents(1.235))
ok('linha 3 casas = 3,705', centsToNumber(linha, 3) === 3.705)
ok('geral 2 casas = 3,71', Math.round(linha) === 371 && centsToNumber(371, 2) === 3.71)

// totais agregados (não média de margens)
const totais = computeTotaisFinanceiros([10000, 10000], [20000, 11000])
eq('total compra', totais.totalCompra, 20000)
eq('total venda', totais.totalVenda, 31000)
eq('ganho bruto', totais.ganhoBrutoEstimado, 11000)
ok('margem efetiva ≠ média simples', Math.abs((totais.margemEfetiva as number) - 3.2258) < 0.001)
ok('venda total zero → —', formatMargem(totais.totalCompra, 0) === '—')

// moedas
ok('moeda única ok', assertSingleCurrency(['USD', 'USD']) === 'USD')
ok(
  'moedas distintas lançam',
  (() => {
    try {
      assertSingleCurrency(['USD', 'BRL'])
      return false
    } catch {
      return true
    }
  })(),
)

console.log(`Testes de cálculo: ${passed} passaram, ${failed} falharam`)
if (failed > 0) {
  failures.forEach((f) => console.error('  FALHOU: ' + f))
  process.exit(1)
}
