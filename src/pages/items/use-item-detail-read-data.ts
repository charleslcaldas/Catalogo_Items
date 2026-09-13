import { useCallback, useEffect, useRef, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import {
  loadItemCommercialHistory,
  loadItemDocumentLinks,
  loadItemPartnerLinks,
} from '@/services/item-intelligence'
import type {
  ItemClienteLink,
  ItemCommercialEventRecord,
  ItemDocumentLink,
  ItemFornecedorLink,
  LegacyPriceRecord,
} from '@/types/item-intelligence'

type ItemTransaction = {
  id: string
  quantidade?: number
  created?: string
  expand?: {
    potencial_id?: {
      numero_potencial?: string
      cliente?: string
    }
  }
}

type ItemDetailReadData = {
  transactions: ItemTransaction[]
  priceHistory: LegacyPriceRecord[]
  commercialEvents: ItemCommercialEventRecord[]
  clientLinks: ItemClienteLink[]
  supplierLinks: ItemFornecedorLink[]
  documentLinks: ItemDocumentLink[]
}

const COMPLEMENTARY_READ_ERROR = 'Não foi possível carregar os dados complementares.'

const emptyData = (): ItemDetailReadData => ({
  transactions: [],
  priceHistory: [],
  commercialEvents: [],
  clientLinks: [],
  supplierLinks: [],
  documentLinks: [],
})

export function useItemDetailReadData(itemId?: string) {
  const [data, setData] = useState<ItemDetailReadData>(emptyData)
  const [readError, setReadError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const commercialRequestIdRef = useRef(0)
  const currentItemIdRef = useRef(itemId)
  currentItemIdRef.current = itemId

  useEffect(() => {
    const requestId = ++requestIdRef.current
    const commercialRequestId = ++commercialRequestIdRef.current
    setData(emptyData())
    setReadError(null)
    if (!itemId) return

    const isCurrent = () =>
      requestIdRef.current === requestId && currentItemIdRef.current === itemId
    const captureReadError = () => {
      if (isCurrent()) setReadError(COMPLEMENTARY_READ_ERROR)
    }

    pb.collection<ItemTransaction>('potencial_itens')
      .getList(1, 20, { filter: `item_id="${itemId}"`, expand: 'potencial_id' })
      .then((result) => {
        if (isCurrent()) setData((current) => ({ ...current, transactions: result.items }))
      })
      .catch(captureReadError)

    loadItemCommercialHistory(itemId)
      .then((history) => {
        if (!isCurrent() || commercialRequestIdRef.current !== commercialRequestId) return
        setData((current) => ({
          ...current,
          commercialEvents: history.events,
          priceHistory: history.legacy,
        }))
      })
      .catch(() => {
        if (isCurrent() && commercialRequestIdRef.current === commercialRequestId) {
          setReadError(COMPLEMENTARY_READ_ERROR)
        }
      })

    Promise.all([loadItemPartnerLinks(itemId), loadItemDocumentLinks(itemId)])
      .then(([partners, documents]) => {
        if (!isCurrent()) return
        setData((current) => ({
          ...current,
          clientLinks: partners.clients,
          supplierLinks: partners.suppliers,
          documentLinks: documents,
        }))
      })
      .catch(captureReadError)

    return () => {
      if (requestIdRef.current === requestId) requestIdRef.current += 1
    }
  }, [itemId])

  const refreshCommercialHistory = useCallback(async () => {
    if (!itemId) return
    const requestId = requestIdRef.current
    const commercialRequestId = ++commercialRequestIdRef.current

    try {
      const history = await loadItemCommercialHistory(itemId)
      if (
        requestIdRef.current !== requestId ||
        commercialRequestIdRef.current !== commercialRequestId ||
        currentItemIdRef.current !== itemId
      )
        return
      setData((current) => ({
        ...current,
        commercialEvents: history.events,
        priceHistory: history.legacy,
      }))
    } catch {
      if (
        requestIdRef.current === requestId &&
        commercialRequestIdRef.current === commercialRequestId &&
        currentItemIdRef.current === itemId
      ) {
        setReadError(COMPLEMENTARY_READ_ERROR)
      }
    }
  }, [itemId])

  return { ...data, readError, refreshCommercialHistory }
}
