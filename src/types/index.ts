export type Categoria = {
  id: string
  nome_pt: string
  nome_en: string
  created: string
  updated: string
  expand?: {
    acabamento_id?: Acabamento
    linha_id?: Linha
    ncm_id?: NCM
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
  descricao_extra?: string
  tipo?: string
  subtipo?: string
  voltagem?: string
  potencia?: string
  marca?: string
  espessura?: string
  dimensao?: string
  tipo_vidro?: string
  foto_arquivo?: string
  created: string
  updated: string
  expand?: {
    acabamento_id?: Acabamento
    linha_id?: Linha
    ncm_id?: NCM
  }
}
