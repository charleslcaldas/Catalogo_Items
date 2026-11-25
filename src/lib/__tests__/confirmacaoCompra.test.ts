import { describe, expect, it } from 'vitest'

import {
  avaliarMoq,
  calcularVendaConfirmacao,
  canonicalize,
  cadeiaCoerente,
  operacaoNoEscopo,
  resolverIdentidade,
  MEI_INTEGRATION_USER_ID,
  ofertaEstaVencida,
  payloadCanonico,
  validarPayload,
  validarPrecoNaoEhAlvo,
  type ConfirmarCompraPayload,
} from '../confirmacaoCompra'
import { computeVenda, isValidMargin } from '../money'

const payloadBase: ConfirmarCompraPayload = {
  cotacao_iten_id: 'abc123',
  potencial_iten_id: 'pi123',
  rodada_resposta_id: 'rr123',
  versoes_esperadas: { pi123: 'v1' },
  versao: '2026-01-01 00:00:00.000Z',
  idempotency_key: 'confirmar-compra:abc123:-:v1',
  margem_versao_esperada: 1,
}

describe('canonicalização do payload de idempotência', () => {
  it('ordem de propriedades não muda o hash (retry seguro)', () => {
    const a = payloadCanonico(payloadBase)
    const b = payloadCanonico(
      Object.fromEntries(
        Object.entries(payloadBase).reverse(),
      ) as unknown as ConfirmarCompraPayload,
    )
    expect(canonicalize(a)).toBe(canonicalize(b))
  })

  it('payload diferente com a MESMA chave deve ser rejeitado (hash difere)', () => {
    const a = canonicalize(payloadCanonico(payloadBase))
    const b = canonicalize(payloadCanonico({ ...payloadBase, ajustar_quantidade_para_moq: true }))
    expect(a).not.toBe(b)
  })

  it('cópia do mesmo corpo preserva o cânone', () => {
    const a = payloadCanonico(payloadBase)
    const b = payloadCanonico({ ...payloadBase })
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

  it('idempotency_key > 120 caracteres rejeitada', () => {
    const erros = validarPayload({ ...payloadBase, idempotency_key: 'k'.repeat(121) })
    expect(erros.some((e) => e.message.includes('120'))).toBe(true)
  })

  it('margem não inicializada e evidência ausente são rejeitadas', () => {
    expect(validarPayload({ ...payloadBase, margem_versao_esperada: 0 }).length).toBeGreaterThan(0)
    expect(validarPayload({ ...payloadBase, rodada_resposta_id: '' }).length).toBeGreaterThan(0)
  })
})

describe('escopo preliminar do cliente — não concede autorização', () => {
  it('anônimo → NEGADO (sem auth; 401 já coberto pelo middleware requireAuth)', () => {
    expect(resolverIdentidade(null).status).toBe('anonimo')
    expect(resolverIdentidade(undefined).status).toBe('anonimo')
    expect(operacaoNoEscopo(resolverIdentidade(null), 'cotacoes_itens', 'update')).toBe(false)
    expect(operacaoNoEscopo(resolverIdentidade(undefined), 'potenciais', 'view')).toBe(false)
  })

  it('usuário Mei → NEGADO em qualquer coleção/operação (integração excluída do serviço)', () => {
    const mei = resolverIdentidade({ id: MEI_INTEGRATION_USER_ID })
    expect(mei.status).toBe('mei')
    expect(operacaoNoEscopo(mei, 'cotacoes_itens', 'view')).toBe(false)
    expect(operacaoNoEscopo(mei, 'cotacoes_itens', 'update')).toBe(false)
    expect(operacaoNoEscopo(mei, 'potenciais', 'create')).toBe(false)
    expect(operacaoNoEscopo(mei, 'potencial_itens', 'update')).toBe(false)
    expect(operacaoNoEscopo(mei, 'historico_precos', 'create')).toBe(false)
    expect(operacaoNoEscopo(mei, 'c2_idempotency_keys', 'list')).toBe(false)
  })

  it('escopo de operações da UI; servidor reavalia todas as permissões', () => {
    const time = resolverIdentidade({ id: 'usuario_time_1' })
    expect(time.status).toBe('time')
    expect(operacaoNoEscopo(time, 'cotacoes_itens', 'view')).toBe(true)
    expect(operacaoNoEscopo(time, 'cotacoes_itens', 'update')).toBe(true)
    expect(operacaoNoEscopo(time, 'cotacoes_fornecedor', 'view')).toBe(true)
    expect(operacaoNoEscopo(time, 'cotacoes_rodadas', 'list')).toBe(true)
    expect(operacaoNoEscopo(time, 'cotacoes_rodadas', 'create')).toBe(true)
    expect(operacaoNoEscopo(time, 'c2_idempotency_keys', 'list')).toBe(false)
    expect(operacaoNoEscopo(time, 'c2_idempotency_keys', 'create')).toBe(false)
    expect(operacaoNoEscopo(time, 'potenciais', 'view')).toBe(true)
    expect(operacaoNoEscopo(time, 'potencial_itens', 'list')).toBe(true)
    expect(operacaoNoEscopo(time, 'potencial_itens', 'view')).toBe(true)
    expect(operacaoNoEscopo(time, 'potencial_itens', 'update')).toBe(true)
    expect(operacaoNoEscopo(time, 'historico_precos', 'create')).toBe(true)
    expect(operacaoNoEscopo(time, 'itens', 'view')).toBe(true)
    expect(operacaoNoEscopo(time, 'fornecedores', 'view')).toBe(true)
  })

  it('identidade não-resolvida / indeterminado → NEGADO (negar por padrão)', () => {
    const indet = resolverIdentidade({ id: 42 })
    expect(indet.status).toBe('indeterminado')
    expect(operacaoNoEscopo(indet, 'cotacoes_itens', 'update')).toBe(false)
    expect(operacaoNoEscopo(resolverIdentidade({ id: '' }), 'potenciais', 'view')).toBe(false)
    // caso qualquer fora da matriz: negado por omissão
    const time = resolverIdentidade({ id: 'usuario_time_1' })
    expect(operacaoNoEscopo(time, 'users', 'view')).toBe(false)
    expect(operacaoNoEscopo(time, 'cotacoes_itens', 'delete')).toBe(false)
  })

  it('sem papel novo: "time" é exatamente autenticado ≠ Mei', () => {
    expect(resolverIdentidade({ id: MEI_INTEGRATION_USER_ID }).status).toBe('mei')
    expect(resolverIdentidade({ id: 'qq_usuario_autenticado' }).status).toBe('time')
  })
})

describe('autorização — checagem anti-escopo (cadeia de relações coerente)', () => {
  const base = {
    oferta: { id: 'of1', cotacao_fornecedor_id: 'cf1', item_id: 'it1' },
    cotacaoFornecedor: { id: 'cf1', potencial_id: 'pot1' },
    potencial: { id: 'pot1' },
    potencialIten: { potencial_id: 'pot1', item_id: 'it1' },
  }

  it('cadeia coerente → PERMITIDO prosseguir', () => {
    expect(cadeiaCoerente(base)).toBe(true)
    expect(cadeiaCoerente({ ...base, potencialIten: null })).toBe(true)
  })

  it('cotacao_fornecedor.potencial_id aponta para OUTRO potencial → NEGADO', () => {
    expect(
      cadeiaCoerente({ ...base, cotacaoFornecedor: { id: 'cf1', potencial_id: 'pot2' } }),
    ).toBe(false)
  })

  it('potencial_iten de outro potencial (escopo cruzado) → NEGADO', () => {
    expect(
      cadeiaCoerente({ ...base, potencialIten: { potencial_id: 'pot9', item_id: 'it1' } }),
    ).toBe(false)
  })

  it('potencial_iten de outro item (escopo cruzado) → NEGADO', () => {
    expect(
      cadeiaCoerente({ ...base, potencialIten: { potencial_id: 'pot1', item_id: 'it2' } }),
    ).toBe(false)
  })

  it('oferta não pertence à cotação do fornecedor informada → NEGADO', () => {
    expect(
      cadeiaCoerente({ ...base, cotacaoFornecedor: { id: 'cf99', potencial_id: 'pot1' } }),
    ).toBe(false)
  })

  it('indeterminado (registro ausente ou id vazio em elo obrigatório) → NEGADO', () => {
    expect(cadeiaCoerente({ ...base, oferta: null })).toBe(false)
    expect(cadeiaCoerente({ ...base, cotacaoFornecedor: null })).toBe(false)
    expect(cadeiaCoerente({ ...base, potencial: null })).toBe(false)
    expect(cadeiaCoerente({ ...base, oferta: { ...base.oferta, cotacao_fornecedor_id: '' } })).toBe(
      false,
    )
    expect(cadeiaCoerente({ ...base, cotacaoFornecedor: { id: 'cf1', potencial_id: '' } })).toBe(
      false,
    )
    expect(cadeiaCoerente({ ...base, potencialIten: { potencial_id: '', item_id: 'it1' } })).toBe(
      false,
    )
  })
})

describe('alvo exige resposta do fornecedor', () => {
  it('preco == preco_contraproposta > 0 → preco_eh_alvo', () => {
    expect(validarPrecoNaoEhAlvo(4.5, 4.5)?.code).toBe('preco_eh_alvo')
    expect(validarPrecoNaoEhAlvo(4.5, 4.5, true)).toBeNull()
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

describe('margem AUTORITATIVA PERSISTIDA / precisão 2-3 (nunca 7,5 fixo)', () => {
  it('margem negociada 12% PERSISTIDA vence o padrão 7,5 da linha', () => {
    // compra 4.5 com margem PERSISTIDA 12 → 4.5 / 0.88 = 5.113636… → 5.11 (2 casas);
    // com o padrão 7,5 seria 4.864… — o serviço NUNCA usa o padrão da linha.
    const r = calcularVendaConfirmacao(4.5, 12, 2, 0, 0)
    expect(r.pendencia).toBeNull()
    expect(r.venda).toBe(5.11)
    // prova da diferença: 7,5 daria outro valor (a persistida é a única fonte)
    expect(calcularVendaConfirmacao(4.5, 7.5, 2, 0, 0).venda).toBe(4.86)
    expect(r.venda).not.toBe(calcularVendaConfirmacao(4.5, 7.5, 2, 0, 0).venda)
  })

  it('cálculo puro usa somente a margem persistida; payload adulterado é testado no servidor', () => {
    // a função não aceita margem do cliente — só a persistida + versão esperada.
    // Qualquer "margem: 50" que o cliente envie no body não muda o cálculo:
    // o servidor lê margem_negociada do registro (espelho do hook).
    const r = calcularVendaConfirmacao(4.5, 12, 2, 3, 3)
    expect(r.pendencia).toBeNull()
    expect(r.venda).toBe(5.11)
    // mesmo pedido com versão adulterada divergente → rejeitado, não recalculado
    const conflito = calcularVendaConfirmacao(4.5, 12, 2, 3, 2)
    expect(conflito.pendencia?.code).toBe('conflito_margem')
    expect(conflito.venda).toBeUndefined()
  })

  it('margem ausente/vazia → pendencia_margem (não inventa 7,5)', () => {
    expect(calcularVendaConfirmacao(4.5, null, 2, 0, 0).pendencia?.code).toBe('pendencia_margem')
    expect(calcularVendaConfirmacao(4.5, undefined, 2, 0, 0).pendencia?.code).toBe(
      'pendencia_margem',
    )
    expect(calcularVendaConfirmacao(4.5, null, 2, 0, 0).venda).toBeUndefined()
  })

  it('margem_versao divergente → conflito_margem (rejeita, não calcula)', () => {
    const r = calcularVendaConfirmacao(4.5, 12, 2, 4, 3)
    expect(r.pendencia?.code).toBe('conflito_margem')
    expect(r.venda).toBeUndefined()
  })

  it('margem inválida: 0 é válido; negativa, ≥ 100 e não finita → margem_invalida', () => {
    expect(calcularVendaConfirmacao(4.5, 0, 2, 0, 0).pendencia).toBeNull()
    expect(calcularVendaConfirmacao(4.5, -0.1, 2, 0, 0).pendencia?.code).toBe('margem_invalida')
    expect(calcularVendaConfirmacao(4.5, 100, 2, 0, 0).pendencia?.code).toBe('margem_invalida')
    expect(calcularVendaConfirmacao(4.5, 150, 2, 0, 0).pendencia?.code).toBe('margem_invalida')
    expect(calcularVendaConfirmacao(4.5, Number.NaN, 2, 0, 0).pendencia?.code).toBe(
      'pendencia_margem',
    )
  })

  it('fórmula venda = compra / (1 - m/100), arredondada na precisão', () => {
    // 2 casas: 4.5 / 0.88 = 5.1136… → 5.11; 3 casas → 5.114
    expect(calcularVendaConfirmacao(4.5, 12, 2, 0, 0).venda).toBe(5.11)
    expect(calcularVendaConfirmacao(4.5, 12, 3, 0, 0).venda).toBe(5.114)
    // 12,5%: 4.5 / 0.875 = 5.142857… → 5.14 / 5.143
    expect(calcularVendaConfirmacao(4.5, 12.5, 2, 0, 0).venda).toBe(5.14)
    expect(calcularVendaConfirmacao(4.5, 12.5, 3, 0, 0).venda).toBe(5.143)
  })

  it('precisão: ausente → precisao_ausente; fora de 2/3 → precisao_invalida (sem default silencioso)', () => {
    const ausente = calcularVendaConfirmacao(4.5, 12, undefined, 0, 0)
    expect(ausente.pendencia?.code).toBe('precisao_ausente')
    expect(ausente.venda).toBeUndefined()
    const invalida = calcularVendaConfirmacao(4.5, 12, 5, 0, 0)
    expect(invalida.pendencia?.code).toBe('precisao_invalida')
    expect(invalida.venda).toBeUndefined()
  })

  it('coerência com computeVenda/isValidMargin de money.ts', () => {
    expect(computeVenda(100, 12.5)).toBeCloseTo(114.2857, 4)
    expect(isValidMargin(100)).toBe(false)
    expect(isValidMargin(12.5)).toBe(true)
  })
})

describe('margem_versao_esperada — validação de payload (borda do cliente)', () => {
  it('obrigatória: ausente → payload_invalido', () => {
    const erros = validarPayload({ ...payloadBase, margem_versao_esperada: undefined })
    expect(erros.map((e) => e.code)).toContain('payload_invalido')
  })

  it('negativa, não finita ou fracionada → payload_invalido', () => {
    expect(
      validarPayload({ ...payloadBase, margem_versao_esperada: -1 }).map((e) => e.code),
    ).toContain('payload_invalido')
    expect(
      validarPayload({ ...payloadBase, margem_versao_esperada: Number.NaN }).map((e) => e.code),
    ).toContain('payload_invalido')
    expect(
      validarPayload({ ...payloadBase, margem_versao_esperada: 1.5 }).map((e) => e.code),
    ).toContain('payload_invalido')
  })

  it('entra no cânone de idempotência (retry com outra versão → hash diferente)', () => {
    const a = canonicalize(payloadCanonico(payloadBase))
    const b = canonicalize(payloadCanonico({ ...payloadBase, margem_versao_esperada: 2 }))
    expect(a).not.toBe(b)
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
