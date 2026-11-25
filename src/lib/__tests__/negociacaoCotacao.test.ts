import { describe, it, expect, vi } from 'vitest'
vi.mock('../pocketbase/client', () => ({ default: { collection: vi.fn(), send: vi.fn() } }))
import {
  validadeResposta,
  numeroDecimal,
  payloadConfirmacao,
  mensagemNegociacao,
  type NegociacaoContexto,
} from '../../services/negociacaoCotacao'
import { ConfirmarCompraError } from '../../services/cotacaoConfirmacao'
const record = (id: string) => ({ id, updated: '2026-11-23 12:00:00.123Z' })
const context = {
  oferta: { ...record('offer'), margem_versao: 3, preco_contraproposta: 1 },
  cotacao: record('cf'),
  linha: record('pi'),
  produto: record('item'),
  potencial: record('pot'),
  fabricante: record('supplier'),
  resposta: { ...record('response'), preco: 4.5 },
  rodadas: [],
  confirmada: false,
} as unknown as NegociacaoContexto
describe('negociação no cliente', () => {
  it('aceita vírgula decimal e zero explícito; recusa vazio e texto ambíguo', () => {
    expect(numeroDecimal('7,5')).toBe(7.5)
    expect(numeroDecimal('0')).toBe(0)
    for (const x of ['', '1.234,56', '-1', '1abc', 'Infinity']) expect(numeroDecimal(x)).toBeNaN()
  })
  it('confirma pela resposta, versões e margem persistidas; alvo não entra como preço', () => {
    const p = payloadConfirmacao(context, true)
    expect(p.rodada_resposta_id).toBe('response')
    expect(p.margem_versao_esperada).toBe(3)
    expect(p.versoes_esperadas).toEqual(
      Object.fromEntries(
        ['cf', 'pi', 'item', 'pot', 'supplier', 'response'].map((id) => [
          id,
          '2026-11-23 12:00:00.123Z',
        ]),
      ),
    )
    expect(p.ajustar_quantidade_para_moq).toBe(true)
    expect(p).not.toHaveProperty('preco')
    expect(p).not.toHaveProperty('margem')
  })
  it('não cria confirmação sem resposta do fabricante', () => {
    expect(() => payloadConfirmacao({ ...context, resposta: undefined }, false)).toThrow(
      'resposta do fabricante',
    )
  })
  it('preserva a mesma chave para repetir exatamente a revisão', () => {
    expect(payloadConfirmacao(context, false)).toEqual(payloadConfirmacao(context, false))
  })
  it('explica conflito e bloqueio sem oferecer fallback para gravações parciais', () => {
    expect(
      mensagemNegociacao(new ConfirmarCompraError(503, 'confirmacao_em_validacao', '')),
    ).toContain('temporariamente indisponível')
    expect(mensagemNegociacao(new ConfirmarCompraError(409, 'conflito_margem', ''))).toContain(
      'outra pessoa',
    )
  })
  it('mantém mensagens de validação local legíveis', () => {
    expect(mensagemNegociacao(new Error('Informe uma margem válida.'))).toBe(
      'Informe uma margem válida.',
    )
  })
})

describe('validade em formato brasileiro', () => {
  it('valida o calendário sem normalizar dias inexistentes', () => {
    expect(validadeResposta('31/12/2026')).toBeTruthy()
    for (const x of ['31/02/2026', '29/02/2027', '2026-12-31', '01/13/2026', ''])
      expect(validadeResposta(x)).toBeUndefined()
    expect(validadeResposta('29/02/2028')).toBeTruthy()
  })
})
