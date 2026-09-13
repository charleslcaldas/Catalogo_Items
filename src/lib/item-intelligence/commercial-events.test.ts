import { describe, expect, it } from 'vitest'
import {
  COMMERCIAL_EVENT_TYPES,
  classifyCommercialEventType,
  selectLatestCommercialEvents,
  selectLatestLegacyCostReference,
  type CommercialEvent,
} from './commercial-events'

describe('commercial event classification', () => {
  it('keeps the four business facts distinct', () => {
    expect(COMMERCIAL_EVENT_TYPES).toEqual([
      'cotacao_fornecedor',
      'compra_books',
      'cotacao_cliente',
      'venda_books',
    ])

    expect(classifyCommercialEventType('cotacao_fornecedor')).toMatchObject({
      label: 'Cotação recebida do fornecedor',
      isRealTransaction: false,
    })
    expect(classifyCommercialEventType('compra_books')).toMatchObject({
      label: 'Compra real',
      isRealTransaction: true,
    })
  })

  it('does not promote legacy compra or venda to real transactions', () => {
    expect(classifyCommercialEventType('compra')).toEqual({
      type: 'legado_compra',
      label: 'Referência de custo legada',
      isRealTransaction: false,
      isLegacy: true,
    })
    expect(classifyCommercialEventType('venda')).toEqual({
      type: 'legado_venda',
      label: 'Referência legada de venda/cotação',
      isRealTransaction: false,
      isLegacy: true,
    })
  })
})

describe('selectLatestCommercialEvents', () => {
  it('selects the newest event independently for each of the four types', () => {
    const events: CommercialEvent[] = [
      { id: '1', tipo: 'cotacao_fornecedor', ocorrido_em: '2026-01-01T00:00:00Z' },
      { id: '2', tipo: 'cotacao_fornecedor', ocorrido_em: '2026-02-01T00:00:00Z' },
      {
        id: '3',
        tipo: 'venda_books',
        ocorrido_em: '2026-03-01T00:00:00Z',
        sistema_origem: 'zoho_books',
      },
      { id: '4', tipo: 'compra', ocorrido_em: '2026-04-01T00:00:00Z' },
    ]

    const latest = selectLatestCommercialEvents(events)

    expect(latest.cotacao_fornecedor?.id).toBe('2')
    expect(latest.compra_books).toBeNull()
    expect(latest.cotacao_cliente).toBeNull()
    expect(latest.venda_books?.id).toBe('3')
  })

  it('does not place Books transaction types from another source in real cards', () => {
    const events: CommercialEvent[] = [
      {
        id: 'valid-purchase',
        tipo: 'compra_books',
        ocorrido_em: '2026-01-01T00:00:00Z',
        sistema_origem: 'zoho_books',
      },
      {
        id: 'invalid-newer-purchase',
        tipo: 'compra_books',
        ocorrido_em: '2026-02-01T00:00:00Z',
        sistema_origem: 'importacao',
      },
      {
        id: 'invalid-sale',
        tipo: 'venda_books',
        ocorrido_em: '2026-03-01T00:00:00Z',
        sistema_origem: 'zoho_crm',
      },
    ]

    const latest = selectLatestCommercialEvents(events)

    expect(latest.compra_books?.id).toBe('valid-purchase')
    expect(latest.venda_books).toBeNull()
  })
})

describe('selectLatestLegacyCostReference', () => {
  it('ignores newer venda records when selecting the legacy purchase reference', () => {
    const result = selectLatestLegacyCostReference([
      { id: 'sale', tipo: 'venda', data_cotacao: '2026-03-01T00:00:00Z' },
      { id: 'purchase', tipo: 'compra', data_cotacao: '2026-02-01T00:00:00Z' },
    ])

    expect(result?.id).toBe('purchase')
  })
})
