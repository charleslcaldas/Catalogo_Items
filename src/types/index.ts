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
  margem_padrao?: number
  created: string
  updated: string
  expand?: {
    categoria_id?: Categoria
    ncm_id?: NCM
  }
}

export type UnidadeMedida = {
  id: string
  nome: string
  created: string
  updated: string
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
  tipo_atributo?: string
  nome_campo_customizado?: string
  campo_sistema: string
  nome_customizado: string
  ativo: boolean
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
  observacoes?: string
  created: string
  updated: string
}

export type HistoricoPreco = {
  id: string
  item_id: string
  preco: number
  fornecedor: string
  data_cotacao: string
  tipo?: string
  cliente?: string
  potencial_id?: string
  created: string
  updated: string
}

export type NcmAuditLog = {
  id: string
  ncm_id: string
  user_id?: string
  action: string
  previous_values?: any
  new_values?: any
  created: string
  updated: string
  expand?: {
    user_id?: {
      id: string
      name: string
      email: string
    }
  }
}

export type StatusPotencial = {
  id: string
  nome: string
  cor_hex: string
  created: string
  updated: string
}

export type Fornecedor = {
  id: string
  collectionId: string
  collectionName: string
  nome: string
  contato?: string
  email?: string
  cnpj?: string
  telefone?: string
  website?: string
  endereco?: string
  cidade?: string
  estado?: string
  pais?: string
  cep?: string
  itens_base_produz?: string
  linhas_ids?: string[]
  observacoes?: string
  ativo: boolean
  auditado?: boolean
  incoterm?: string
  tempo_fabricacao?: string
  condicao_pagamento?: string
  created: string
  updated: string
  expand?: {
    linhas_ids?: Linha[]
    [key: string]: any
  }
  [key: string]: any
}

export type ContatoFornecedor = {
  id: string
  collectionId: string
  collectionName: string
  fabricante_id: string
  nome: string
  sobrenome?: string
  cargo?: string
  telefone?: string
  email?: string
  whatsapp?: string
  wechat?: string
  observacoes?: string
  ativo?: boolean
  created: string
  updated: string
  expand?: {
    fabricante_id?: Fornecedor
  }
  [key: string]: any
}

export type EstagioPotencial = {
  id: string
  nome: string
  cor_hex?: string
  ordem?: number
  created: string
  updated: string
}

export type Potencial = {
  id: string
  collectionId?: string
  collectionName?: string
  numero_potencial: string
  cliente: string
  status: string
  nome_potencial?: string
  proprietario?: string
  estagio?: string
  estagio_id?: string
  observacoes?: string
  nome_comprador?: string
  notas?: string
  anexos?: string[]
  created: string
  updated: string
  expand?: {
    estagio_id?: EstagioPotencial
  }
}

export type PotencialItem = {
  id: string
  potencial_id: string
  item_id: string
  quantidade: number
  unidade_medida?: string
  preco_unitario: number
  observacoes: string
  ordem?: number
  referencia_preco?: number
  referencia_fornecedor?: string
  referencia_data?: string
  created: string
  updated: string
  expand?: {
    item_id?: Item
  }
}

export type Item = {
  id: string
  collectionId: string
  collectionName: string
  sku: string
  linha_id: string
  descr_pt: string
  descr_en: string
  tamanho: string
  acabamento_id: string
  ncm_id: string
  material?: string
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
  classe_material_en?: string
  tipo_rosca?: string
  tipo_rosca_en?: string
  comprimento_rosca?: string
  comprimento_rosca_en?: string
  grau?: string
  informacao_extra?: string
  informacao_extra_en?: string
  descricao_extra?: string
  descricao_extra_en?: string
  descricao_curta?: string
  descricao_curta_en?: string
  descricao_catalogo_pt?: string
  descricao_catalogo_en?: string
  tipo?: string
  subtipo?: string
  foto_arquivo?: string
  fornecedor_ultima_atualizacao?: string
  unidade?: string
  unidade_id?: string
  descricao_base_id?: string
  foto_catalogo_id?: string
  data_atualizacao?: string
  validade_preco?: string
  ii?: number
  ipi?: number
  pis?: number
  cofins?: number
  created: string
  updated: string
  expand?: {
    acabamento_id?: Acabamento
    linha_id?: Linha
    ncm_id?: NCM
    unidade_id?: UnidadeMedida
    foto_catalogo_id?: FotoCatalogo
    descricao_base_id?: any
  }
}
