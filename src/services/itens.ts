import pb from '@/lib/pocketbase/client'
import type { Item } from '@/types'
import { buildFieldAccentCondition } from '@/lib/utils'

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
    const fields = [
      'sku',
      'descr_pt',
      'descr_en',
      'tamanho',
      'acabamento_id.codigo',
      'acabamento_id.nome_pt',
    ]
    filter = terms
      .map((term) => {
        const clauses = fields.map((f) => buildFieldAccentCondition(f, term, 2)).filter(Boolean)
        return `(${clauses.join(' || ')})`
      })
      .filter((clause) => clause !== '()')
      .join(' && ')
  }
  return pb.collection<Item>('itens').getList(page, perPage, {
    filter,
    sort,
    expand: 'linha_id,linha_id.categoria_id,acabamento_id,ncm_id,descricao_base_id,unidade_id',
  })
}
