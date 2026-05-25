import pb from '@/lib/pocketbase/client'
import type { Item } from '@/types'

export const getItensPaginated = (
  page: number,
  perPage: number = 20,
  searchTerm: string = '',
  sort: string = 'sku',
) => {
  let filter = ''
  if (searchTerm) {
    const term = searchTerm.replace(/"/g, '')
    filter = `sku ~ "${term}" || descr_pt ~ "${term}" || descr_en ~ "${term}"`
  }
  return pb.collection<Item>('itens').getList(page, perPage, {
    filter,
    sort,
    expand: 'acabamento_id',
  })
}
