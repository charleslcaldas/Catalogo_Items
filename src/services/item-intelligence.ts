import { ClientResponseError } from 'pocketbase'
import pb from '@/lib/pocketbase/client'
import type {
  ItemClienteLink,
  ItemCommercialEventRecord,
  ItemDocumentLink,
  ItemFornecedorLink,
  LegacyPriceRecord,
} from '@/types/item-intelligence'

function handleOptionalCollectionError(collectionName: string, error: unknown): [] {
  if (error instanceof ClientResponseError && error.status === 404) {
    console.warn(`Coleção opcional indisponível: ${collectionName}`, error)
    return []
  }

  throw error
}

async function readItemCollection<T>(
  collectionName: string,
  itemId: string,
  options: Record<string, unknown> = {},
): Promise<T[]> {
  try {
    return await pb.collection<T>(collectionName).getFullList({
      filter: pb.filter('item_id = {:itemId}', { itemId }),
      ...options,
    })
  } catch (error) {
    return handleOptionalCollectionError(collectionName, error)
  }
}

async function readItemPage<T>(
  collectionName: string,
  itemId: string,
  perPage: number,
  missingCollectionIsOptional: boolean,
  options: Record<string, unknown> = {},
): Promise<T[]> {
  try {
    const result = await pb.collection<T>(collectionName).getList(1, perPage, {
      filter: pb.filter('item_id = {:itemId}', { itemId }),
      ...options,
    })
    return result.items
  } catch (error) {
    if (missingCollectionIsOptional) {
      return handleOptionalCollectionError(collectionName, error)
    }

    throw error
  }
}

export async function loadItemPartnerLinks(itemId: string) {
  const [clients, suppliers] = await Promise.all([
    readItemCollection<ItemClienteLink>('item_clientes', itemId, {
      sort: '-updated',
      expand: 'cliente_id',
    }),
    readItemCollection<ItemFornecedorLink>('item_fornecedores', itemId, {
      sort: '-principal,-updated',
      expand: 'fornecedor_id',
    }),
  ])

  return { clients, suppliers }
}

export async function loadItemCommercialHistory(itemId: string) {
  const [events, legacy] = await Promise.all([
    readItemPage<ItemCommercialEventRecord>('item_eventos_comerciais', itemId, 100, true, {
      sort: '-ocorrido_em',
      expand: 'cliente_id,fornecedor_id',
    }),
    readItemPage<LegacyPriceRecord>('historico_precos', itemId, 50, false, {
      sort: '-data_cotacao,-created',
    }),
  ])

  return { events, legacy }
}

export function loadItemDocumentLinks(itemId: string) {
  return readItemCollection<ItemDocumentLink>('documento_vinculos', itemId, {
    sort: '-created',
    expand: 'cliente_id,fornecedor_id,documento_revisao_id,documento_revisao_id.documento_id',
  })
}
