export type Categoria = {
  id: string
  nome_pt: string
  nome_en: string
  color?: string
  data_atualizacao?: string
  validade_preco?: string
  descricao_catalogo_pt?: string
  descricao_catalogo_en?: string
  created: string
  updated: string
  expand?: {
    acabamento_id?: Acabamento
    linha_id?: Linha
    ncm_id?: NCM
  }
}

export type FotoCatalogo = {
  id: string
  tipo: string
  subtipo?: string
  tamanho: string
  acabamento_id: string
  url_foto: string
  arquivo?: string
  descricao?: string
  created: string
  updated: string
  expand?: {
    acabamento_id?: Acabamento
  }
}

export type Linha = {
  id: string
  categoria_id: string
  ncm_id?: string
  nome_pt: string
  nome_en: string
  superlinha_pt: string
  superlinha_en: string
  color?: string
  created: string
  updated: string
  expand?: {
    categoria_id?: Categoria
    ncm_id?: NCM
  }
}

export type Acabamento = {
  id: string
  codigo: string
  nome_pt: string
  nome_en: string
  cor_hex?: string
  created: string
  updated: string
}

export type AtributoLinha = {
  id: string
  linha_id: string
  tipo_atributo: string
  nome_campo_customizado: string
  created: string
  updated: string
}

export type NCM = {
  id: string
  codigo: string
  ii: number
  ipi: number
  pis: number
  cofins: number
  created: string
  updated: string
}

export type Potencial = {
  id: string
  numero_potencial: string
  cliente: string
  status: string
  observacoes?: string
  created: string
  updated: string
}

export type PotencialItem = {
  id: string
  potencial_id: string
  item_id: string
  quantidade: number
  unidade_medida?: string
  preco_unitario: number
  observacoes: string
  created: string
  updated: string
  expand?: {
    item_id?: Item
  }
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
  classe?: string
  norma?: string
  descricao_base_pt?: string
  descricao_base_en?: string
  classe_material?: string
  tipo_rosca?: string
  comprimento_rosca?: string
  informacao_extra?: string
  informacao_extra_en?: string
  descricao_extra?: string
  descricao_extra_en?: string
  descricao_curta?: string
  descricao_curta_en?: string
  tipo?: string
  subtipo?: string
  voltagem?: string
  potencia?: string
  marca?: string
  espessura?: string
  dimensao?: string
  tipo_vidro?: string
  foto_arquivo?: string
  fornecedor_ultima_atualizacao?: string
  unidade?: string
  created: string
  updated: string
  expand?: {
    acabamento_id?: Acabamento
    linha_id?: Linha
    ncm_id?: NCM
  }
}
