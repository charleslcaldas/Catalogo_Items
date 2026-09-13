import { ClientResponseError } from 'pocketbase'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const pocketbase = vi.hoisted(() => {
  const getFullList = vi.fn()
  const getList = vi.fn()
  const collection = vi.fn((name: string) => ({
    getFullList: (options: unknown) => getFullList(name, options),
    getList: (page: number, perPage: number, options: unknown) =>
      getList(name, page, perPage, options),
  }))
  const filter = vi.fn((_expression: string, params: { itemId: string }) => {
    return `item_id="${params.itemId}"`
  })
  return { collection, filter, getFullList, getList }
})

vi.mock('@/lib/pocketbase/client', () => ({
  default: pocketbase,
}))

import {
  loadItemCommercialHistory,
  loadItemDocumentLinks,
  loadItemPartnerLinks,
} from './item-intelligence'

const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

afterAll(() => warnSpy.mockRestore())

describe('item intelligence read service', () => {
  beforeEach(() => {
    pocketbase.collection.mockClear()
    pocketbase.filter.mockClear()
    pocketbase.getFullList.mockReset()
    pocketbase.getList.mockReset()
    warnSpy.mockClear()
    pocketbase.getFullList.mockImplementation((collectionName: string) =>
      Promise.resolve([{ id: collectionName }]),
    )
    pocketbase.getList.mockImplementation((collectionName: string) =>
      Promise.resolve({ items: [{ id: collectionName }] }),
    )
  })

  it('loads partner, commercial and document data using read calls only', async () => {
    const partners = await loadItemPartnerLinks('item-1')
    const commercial = await loadItemCommercialHistory('item-1')
    const documents = await loadItemDocumentLinks('item-1')

    expect(partners.clients).toEqual([{ id: 'item_clientes' }])
    expect(partners.suppliers).toEqual([{ id: 'item_fornecedores' }])
    expect(commercial.events).toEqual([{ id: 'item_eventos_comerciais' }])
    expect(commercial.legacy).toEqual([{ id: 'historico_precos' }])
    expect(documents).toEqual([{ id: 'documento_vinculos' }])
    expect(warnSpy).not.toHaveBeenCalled()

    expect(pocketbase.getFullList).toHaveBeenCalledTimes(3)
    expect(pocketbase.getList).toHaveBeenCalledTimes(2)
    expect(pocketbase.getList).toHaveBeenCalledWith('item_eventos_comerciais', 1, 100, {
      filter: 'item_id="item-1"',
      sort: '-ocorrido_em',
      expand: 'cliente_id,fornecedor_id',
    })
    expect(pocketbase.getList).toHaveBeenCalledWith('historico_precos', 1, 50, {
      filter: 'item_id="item-1"',
      sort: '-data_cotacao,-created',
    })
    expect(pocketbase.filter).toHaveBeenCalledWith('item_id = {:itemId}', { itemId: 'item-1' })
    expect(pocketbase.collection.mock.results.every(({ value }) => !('create' in value))).toBe(true)
    expect(pocketbase.collection.mock.results.every(({ value }) => !('update' in value))).toBe(true)
    expect(pocketbase.collection.mock.results.every(({ value }) => !('delete' in value))).toBe(true)
  })

  it('returns empty optional data only when PocketBase reports a missing collection', async () => {
    const missingCollection = new ClientResponseError({
      status: 404,
      data: { code: 404, message: 'Missing collection.' },
    })
    pocketbase.getFullList.mockRejectedValue(missingCollection)
    pocketbase.getList.mockImplementation((collectionName: string) =>
      collectionName === 'item_eventos_comerciais'
        ? Promise.reject(missingCollection)
        : Promise.resolve({ items: [{ id: collectionName }] }),
    )

    await expect(loadItemPartnerLinks('item-1')).resolves.toEqual({ clients: [], suppliers: [] })
    await expect(loadItemCommercialHistory('item-1')).resolves.toEqual({
      events: [],
      legacy: [{ id: 'historico_precos' }],
    })
    await expect(loadItemDocumentLinks('item-1')).resolves.toEqual([])
    expect(warnSpy).toHaveBeenCalledTimes(4)
  })

  it('rethrows a missing required legacy history collection', async () => {
    const missingCollection = new ClientResponseError({
      status: 404,
      data: { code: 404, message: 'Missing collection.' },
    })
    pocketbase.getList.mockImplementation((collectionName: string) =>
      collectionName === 'historico_precos'
        ? Promise.reject(missingCollection)
        : Promise.resolve({ items: [{ id: collectionName }] }),
    )

    await expect(loadItemCommercialHistory('item-1')).rejects.toBe(missingCollection)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('rethrows PocketBase authorization errors', async () => {
    const unauthorized = new ClientResponseError({
      status: 401,
      data: { code: 401, message: 'Unauthorized.' },
    })
    pocketbase.getFullList.mockRejectedValue(unauthorized)

    await expect(loadItemDocumentLinks('item-1')).rejects.toBe(unauthorized)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('rethrows generic network errors', async () => {
    const networkError = new Error('network unavailable')
    pocketbase.getList.mockRejectedValue(networkError)

    await expect(loadItemCommercialHistory('item-1')).rejects.toBe(networkError)
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
