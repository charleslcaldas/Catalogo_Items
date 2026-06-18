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
    const terms = searchTerm
      .split(' ')
      .map((t) => t.trim().replace(/"/g, ''))
      .filter(Boolean)
    filter = terms
      .map(
        (term) =>
          `(sku ~ "${term}" || descr_pt ~ "${term}" || descr_en ~ "${term}" || tamanho ~ "${term}" || acabamento_id.codigo ~ "${term}" || acabamento_id.nome_pt ~ "${term}")`,
      )
      .join(' && ')
  }
  return pb.collection<Item>('itens').getList(page, perPage, {
    filter,
    sort,
    expand: 'linha_id,linha_id.categoria_id,acabamento_id,ncm_id,descricao_base_id,unidade_id',
  })
}
