// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useItemDetailReadData } from './use-item-detail-read-data'

const mocks = vi.hoisted(() => ({
  getList: vi.fn(),
  loadCommercialHistory: vi.fn(),
  loadDocumentLinks: vi.fn(),
  loadPartnerLinks: vi.fn(),
}))

vi.mock('@/lib/pocketbase/client', () => ({
  default: {
    collection: () => ({ getList: mocks.getList }),
  },
}))

vi.mock('@/services/item-intelligence', () => ({
  loadItemCommercialHistory: mocks.loadCommercialHistory,
  loadItemDocumentLinks: mocks.loadDocumentLinks,
  loadItemPartnerLinks: mocks.loadPartnerLinks,
}))

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

type PendingReads = {
  transactions: Deferred<{ items: Array<{ id: string }> }>
  commercial: Deferred<{
    events: Array<{ id: string }>
    legacy: Array<{ id: string }>
  }>
  partners: Deferred<{
    clients: Array<{ id: string }>
    suppliers: Array<{ id: string }>
  }>
  documents: Deferred<Array<{ id: string }>>
}

const reads = new Map<string, PendingReads>()

function pendingReads(itemId: string) {
  const pending: PendingReads = {
    transactions: deferred(),
    commercial: deferred(),
    partners: deferred(),
    documents: deferred(),
  }
  reads.set(itemId, pending)
  return pending
}

function resolveReads(pending: PendingReads, itemId: string) {
  pending.transactions.resolve({ items: [{ id: `transaction-${itemId}` }] })
  pending.commercial.resolve({
    events: [{ id: `event-${itemId}` }],
    legacy: [{ id: `legacy-${itemId}` }],
  })
  pending.partners.resolve({
    clients: [{ id: `client-${itemId}` }],
    suppliers: [{ id: `supplier-${itemId}` }],
  })
  pending.documents.resolve([{ id: `document-${itemId}` }])
}

beforeEach(() => {
  reads.clear()
  mocks.getList.mockReset()
  mocks.loadCommercialHistory.mockReset()
  mocks.loadDocumentLinks.mockReset()
  mocks.loadPartnerLinks.mockReset()

  mocks.getList.mockImplementation(
    (_page: number, _perPage: number, options: { filter: string }) => {
      const itemId = [...reads.keys()].find((id) => options.filter.includes(id))
      return reads.get(itemId || '')!.transactions.promise
    },
  )
  mocks.loadCommercialHistory.mockImplementation(
    (itemId: string) => reads.get(itemId)!.commercial.promise,
  )
  mocks.loadPartnerLinks.mockImplementation((itemId: string) => reads.get(itemId)!.partners.promise)
  mocks.loadDocumentLinks.mockImplementation(
    (itemId: string) => reads.get(itemId)!.documents.promise,
  )
})

describe('useItemDetailReadData', () => {
  it('clears item-scoped state when the selected item changes', async () => {
    const itemA = pendingReads('item-a')
    resolveReads(itemA, 'item-a')
    const { result, rerender } = renderHook(
      ({ itemId }: { itemId?: string }) => useItemDetailReadData(itemId),
      { initialProps: { itemId: 'item-a' } },
    )

    await waitFor(() => expect(result.current.documentLinks[0]?.id).toBe('document-item-a'))

    pendingReads('item-b')
    rerender({ itemId: 'item-b' })

    expect(result.current.transactions).toEqual([])
    expect(result.current.priceHistory).toEqual([])
    expect(result.current.commercialEvents).toEqual([])
    expect(result.current.clientLinks).toEqual([])
    expect(result.current.supplierLinks).toEqual([])
    expect(result.current.documentLinks).toEqual([])
  })

  it('ignores late responses from the previously selected item', async () => {
    const itemA = pendingReads('item-a')
    const { result, rerender } = renderHook(
      ({ itemId }: { itemId?: string }) => useItemDetailReadData(itemId),
      { initialProps: { itemId: 'item-a' } },
    )

    const itemB = pendingReads('item-b')
    resolveReads(itemB, 'item-b')
    rerender({ itemId: 'item-b' })

    await waitFor(() => expect(result.current.documentLinks[0]?.id).toBe('document-item-b'))

    await act(async () => {
      resolveReads(itemA, 'item-a')
      await Promise.all([
        itemA.transactions.promise,
        itemA.commercial.promise,
        itemA.partners.promise,
        itemA.documents.promise,
      ])
    })

    expect(result.current.transactions[0]?.id).toBe('transaction-item-b')
    expect(result.current.commercialEvents[0]?.id).toBe('event-item-b')
    expect(result.current.priceHistory[0]?.id).toBe('legacy-item-b')
    expect(result.current.clientLinks[0]?.id).toBe('client-item-b')
    expect(result.current.supplierLinks[0]?.id).toBe('supplier-item-b')
    expect(result.current.documentLinks[0]?.id).toBe('document-item-b')
  })

  it('exposes a non-sensitive error for a failed current-item read', async () => {
    const itemA = pendingReads('item-a')
    const { result } = renderHook(() => useItemDetailReadData('item-a'))

    await act(async () => {
      itemA.transactions.resolve({ items: [] })
      itemA.commercial.reject(new Error('network failed with token=secret-value'))
      itemA.partners.resolve({ clients: [], suppliers: [] })
      itemA.documents.resolve([])
      await Promise.allSettled([
        itemA.transactions.promise,
        itemA.commercial.promise,
        itemA.partners.promise,
        itemA.documents.promise,
      ])
    })

    await waitFor(() =>
      expect(result.current.readError).toBe('Não foi possível carregar os dados complementares.'),
    )
    expect(result.current.readError).not.toContain('secret-value')
  })

  it('exposes an error when related quotations cannot be loaded', async () => {
    const itemA = pendingReads('item-a')
    const { result } = renderHook(() => useItemDetailReadData('item-a'))

    await act(async () => {
      itemA.transactions.reject(new Error('quotation read failed'))
      itemA.commercial.resolve({ events: [], legacy: [] })
      itemA.partners.resolve({ clients: [], suppliers: [] })
      itemA.documents.resolve([])
      await Promise.allSettled([
        itemA.transactions.promise,
        itemA.commercial.promise,
        itemA.partners.promise,
        itemA.documents.promise,
      ])
    })

    await waitFor(() =>
      expect(result.current.readError).toBe('Não foi possível carregar os dados complementares.'),
    )
  })

  it('keeps the newest same-item refresh when an older refresh resolves later', async () => {
    const initial = pendingReads('item-a')
    resolveReads(initial, 'item-a')
    const { result } = renderHook(() => useItemDetailReadData('item-a'))

    await waitFor(() => expect(result.current.commercialEvents[0]?.id).toBe('event-item-a'))

    const olderRefresh = deferred<{
      events: Array<{ id: string }>
      legacy: Array<{ id: string }>
    }>()
    const newerRefresh = deferred<{
      events: Array<{ id: string }>
      legacy: Array<{ id: string }>
    }>()
    mocks.loadCommercialHistory
      .mockImplementationOnce(() => olderRefresh.promise)
      .mockImplementationOnce(() => newerRefresh.promise)

    let olderCall!: Promise<void>
    let newerCall!: Promise<void>
    act(() => {
      olderCall = result.current.refreshCommercialHistory()
      newerCall = result.current.refreshCommercialHistory()
    })

    await act(async () => {
      newerRefresh.resolve({ events: [{ id: 'event-newest' }], legacy: [] })
      await newerCall
    })
    expect(result.current.commercialEvents[0]?.id).toBe('event-newest')

    await act(async () => {
      olderRefresh.resolve({ events: [{ id: 'event-stale' }], legacy: [] })
      await olderCall
    })
    expect(result.current.commercialEvents[0]?.id).toBe('event-newest')
  })

  it('ignores a stale same-item refresh failure after a newer refresh succeeds', async () => {
    const initial = pendingReads('item-a')
    resolveReads(initial, 'item-a')
    const { result } = renderHook(() => useItemDetailReadData('item-a'))

    await waitFor(() => expect(result.current.commercialEvents[0]?.id).toBe('event-item-a'))

    const staleRefresh = deferred<{
      events: Array<{ id: string }>
      legacy: Array<{ id: string }>
    }>()
    const newerRefresh = deferred<{
      events: Array<{ id: string }>
      legacy: Array<{ id: string }>
    }>()
    mocks.loadCommercialHistory
      .mockImplementationOnce(() => staleRefresh.promise)
      .mockImplementationOnce(() => newerRefresh.promise)

    let staleCall!: Promise<void>
    let newerCall!: Promise<void>
    act(() => {
      staleCall = result.current.refreshCommercialHistory()
      newerCall = result.current.refreshCommercialHistory()
    })

    await act(async () => {
      newerRefresh.resolve({ events: [{ id: 'event-newest' }], legacy: [] })
      await newerCall
    })
    await act(async () => {
      staleRefresh.reject(new Error('stale refresh failed'))
      await staleCall
    })

    expect(result.current.commercialEvents[0]?.id).toBe('event-newest')
    expect(result.current.readError).toBeNull()
  })

  it('ignores a late error from the previously selected item', async () => {
    const itemA = pendingReads('item-a')
    const { result, rerender } = renderHook(
      ({ itemId }: { itemId?: string }) => useItemDetailReadData(itemId),
      { initialProps: { itemId: 'item-a' } },
    )

    const itemB = pendingReads('item-b')
    resolveReads(itemB, 'item-b')
    rerender({ itemId: 'item-b' })

    await waitFor(() => expect(result.current.documentLinks[0]?.id).toBe('document-item-b'))
    expect(result.current.readError).toBeNull()

    await act(async () => {
      itemA.transactions.resolve({ items: [] })
      itemA.commercial.reject(new Error('late failure from item-a'))
      itemA.partners.resolve({ clients: [], suppliers: [] })
      itemA.documents.resolve([])
      await Promise.allSettled([
        itemA.transactions.promise,
        itemA.commercial.promise,
        itemA.partners.promise,
        itemA.documents.promise,
      ])
    })

    expect(result.current.readError).toBeNull()
    expect(result.current.commercialEvents[0]?.id).toBe('event-item-b')
  })
})
