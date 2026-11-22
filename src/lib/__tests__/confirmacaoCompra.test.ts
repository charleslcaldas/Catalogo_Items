// Testes do contrato/regras puras da confirmação de compra — vitest.
// Espelham as validações server-side do hook (JSVM não importa módulos TS;
// as regras são mantidas em paralelo e testadas AQUI como evidência executável).
//
// Execução: pnpm -s vitest run (vitest 5.1.1 já em dependencies).
// NÃO EXECUTADOS nesta rodada: a suíte não roda no pipeline automático — a
// plataforma não tem etapa de testes no run_qa (apenas setup/lint/typecheck/build).
// Rodar localmente antes do merge para evidência completa.

import { describe, expect, it } from 'vitest'

import {
  avaliarMoq,
  calcularVendaConfirmacao,
  canonicalize,
  ofertaEstaVencida,
  payloadCanonico,
  validarPayload,
  validarPrecoNaoEhAlvo,
  type ConfirmarCompraPayload,
} from '../confirmacaoCompra'
import { computeVenda, isValidMargin } from '../money'

const payloadBase: ConfirmarCompraPayload = {
  cotacao_iten_id: 'abc123',
  versao: '2026-01-01 00:00:00.000Z',
  idempotency_key: 'confirmar-compra:abc123:-:v1',
}

describe('canonicalização do payload de idempotência', () => {
  it('ordem de propriedades não muda o hash (retry seguro)', () => {
    const a = payloadCanonico(payloadBase)
    const b = payloadCanonico({
      idempotency_key: 'confirmar-compra:abc123:-:v1',
      versao: '2026-01-01 00:00:00.000Z',
      cotacao_iten_id: 'abc123',
    })
    expect(canonicalize(a)).toBe(canonicalize(b))
  })

  it('payload diferente com a MESMA chave deve ser rejeitado (hash difere)', () => {
    const a = canonicalize(payloadCanonico(payloadBase))
    const b = canonicalize(payloadCanonico({ ...payloadBase, moq: 1000 }))
    expect(a).not.toBe(b)
  })

  it('moq ausente vs undefined vs null → mesmo cânone (sem falsa divergência)', () => {
    const a = payloadCanonico(payloadBase)
    const b = payloadCanonico({ ...payloadBase, moq: undefined })
    expect(canonicalize(a)).toBe(canonicalize(b))
  })
})

describe('validarPayload (borda do cliente; servidor revalida)', () => {
  it('payload completo → sem pendências', () => {
    expect(validarPayload(payloadBase)).toEqual([])
  })

  it('campos obrigatórios ausentes', () => {
    const erros = validarPayload({})
    const codes = erros.map((e) => e.code)
    expect(codes).toContain('payload_invalido')
    expect(erros.length).toBeGreaterThanOrEqual(2)
  })

  it('idempotency_key > 200 caracteres rejeitada', () => {
    const erros = validarPayload({ ...payloadBase, idempotency_key: 'k'.repeat(201) })
    expect(erros.some((e) => e.message.includes('200'))).toBe(true)
  })

  it('moq negativo ou não finito rejeitado', () => {
    expect(validarPayload({ ...payloadBase, moq: -1 }).map((e) => e.code)).toContain('moq_invalido')
    expect(validarPayload({ ...payloadBase, moq: Number.NaN }).map((e) => e.code)).toContain(
      'moq_invalido',
    )
  })
})

describe('alvo (contraproposta) nunca confirma compra', () => {
  it('preco == preco_contraproposta > 0 → preco_eh_alvo', () => {
    expect(validarPrecoNaoEhAlvo(4.5, 4.5)?.code).toBe('preco_eh_alvo')
    expect(validarPrecoNaoEhAlvo(4.5, 0)).toBeNull()
    expect(validarPrecoNaoEhAlvo(4.5, 5)).toBeNull()
  })
})

describe('MOQ: nunca muda quantidade silenciosamente', () => {
  it('quantidade < moq sem flag → rejeita (quantidade_abaixo_moq)', () => {
    const r = avaliarMoq(500, 1000, false)
    expect(r.ok).toBe(false)
    expect(r.pendencia?.code).toBe('quantidade_abaixo_moq')
  })

  it('com flag explícita → ajusta quantidade ao moq', () => {
    const r = avaliarMoq(500, 1000, true)
    expect(r.ok).toBe(true)
    expect(r.quantidadeFinal).toBe(1000)
  })

  it('quantidade >= moq → quantidade preservada (flag ignorada)', () => {
    expect(avaliarMoq(2000, 1000, true).quantidadeFinal).toBe(2000)
  })

  it('moq 0/ausente → nada muda', () => {
    expect(avaliarMoq(500, 0, true).quantidadeFinal).toBe(500)
    expect(avaliarMoq(500, 0, false).ok).toBe(true)
  })

  it('quantidade <= 0 → quantidade_invalida', () => {
    expect(avaliarMoq(0, 100, true).pendencia?.code).toBe('quantidade_invalida')
  })
})

describe('margem vigente / precisão 2-3 (nunca 7,5 fixo)', () => {
  it('venda calculada com margem da linha (12,5%) e arredondamento 2 casas', () => {
    const r = calcularVendaConfirmacao(4.5, 12.5, 2)
    expect(r.pendencia).toBeNull()
    // 4.5 / 0.875 = 5.142857… → 5.14
    expect(r.venda).toBe(5.14)
  })

  it('precisão 3 casas arredonda em milésimos', () => {
    const r = calcularVendaConfirmacao(4.5, 12.5, 3)
    // 5.142857… → 5.143
    expect(r.venda).toBe(5.143)
  })

  it('margem ausente → pendência explícita (não inventa 7,5)', () => {
    const r = calcularVendaConfirmacao(4.5, null, 2)
    expect(r.pendencia?.code).toBe('pendencia_margem')
    expect(r.venda).toBeUndefined()
  })

  it('margem >= 100 → pendência (guarda divisão por zero)', () => {
    expect(calcularVendaConfirmacao(4.5, 100, 2).pendencia?.code).toBe('pendencia_margem')
    expect(calcularVendaConfirmacao(4.5, 150, 2).pendencia?.code).toBe('pendencia_margem')
  })

  it('coerência com computeVenda/isValidMargin de money.ts', () => {
    expect(computeVenda(100, 12.5)).toBeCloseTo(114.2857, 4)
    expect(isValidMargin(100)).toBe(false)
    expect(isValidMargin(12.5)).toBe(true)
  })

  it('precisao_preco ausente/outra → 2 casas (fallback)', () => {
    expect(calcularVendaConfirmacao(4.5, 12.5, undefined).precisao).toBe(2)
    expect(calcularVendaConfirmacao(4.5, 12.5, 5).precisao === 2).toBe(true)
  })
})

describe('validade da oferta', () => {
  it('validade no futuro passa; no passado vence; inválida vence', () => {
    const futuro = new Date(Date.now() + 86_400_000).toISOString()
    const passado = new Date(Date.now() - 86_400_000).toISOString()
    expect(ofertaEstaVencida(futuro)).toBe(false)
    expect(ofertaEstaVencida(passado)).toBe(true)
    expect(ofertaEstaVencida('data-invalida')).toBe(true)
    expect(ofertaEstaVencida(undefined)).toBe(false)
  })
})

describe('hook — invariantes que não são executáveis aqui (NÃO EXECUTADO)', () => {
  it('documenta o que depende de execução real do backend', () => {
    // Estes comportamentos são do hook JSVM e só podem ser comprovados com
    // execução real do backend (POST com auth, dados de cotação, transação):
    //  - atomicidade (falha no meio não deixa metade aplicada) — rollback real
    //  - idempotência durável (mesma chave → mesmo recibo; chave+payload diff → 409)
    //  - conflito de versão (conflito_versao 409 em re-leitura divergente)
    //  - gravação efetiva em cotacoes_rodadas/potencial_itens/historico_precos
    //  - não-duplicação de histórico com price_history_logger/on_cotacao_finalizada
    expect(true).toBe(true)
  })
})
