export type Categoria = {
  id: string
  nome_pt: string
  nome_en: string
  criado_em: string
  atualizado_em: string
}

export type Linha = {
  id: string
  categoria_id: string
  nome_pt: string
  nome_en: string
  superlinha_pt: string
  superlinha_en: string
  criado_em: string
  atualizado_em: string
}

export type Acabamento = {
  id: string
  codigo: string
  nome_pt: string
  nome_en: string
  criado_em: string
  atualizado_em: string
}

export type NCM = {
  id: string
  codigo: string
  ii: number
  ipi: number
  pis: number
  cofins: number
  criado_em: string
  atualizado_em: string
}

export type Item = {
  id: string
  sku: string
  linha_id: string
  descr_pt: string
  descr_en: string
  tamanho: string
  acabamento_id: string
  ncm_id: string
  material: string
  preco_compra: number
  preco_venda: number
  item_id_books: string
  foto_url: string
  ativo: boolean
  sincronizado_com_zoho: boolean
  data_sincronizacao: string | null
  criado_em: string
  atualizado_em: string
}
