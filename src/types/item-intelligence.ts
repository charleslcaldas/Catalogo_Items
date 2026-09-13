export type PartnerValidationStatus = 'proposto' | 'validado' | 'rejeitado' | 'inativo'

export type Cliente = {
  id: string
  nome: string
  zoho_crm_id?: string
  zoho_books_id?: string
  ativo: boolean
}

export type ItemClienteLink = {
  id: string
  item_id: string
  cliente_id: string
  codigo_original?: string
  codigo_normalizado?: string
  descricao_original: string
  idioma?: string
  unidade_cliente?: string
  status_validacao: PartnerValidationStatus
  origem?: string
  validado_por?: string
  validado_em?: string
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
  }
}

export type ItemFornecedorLink = {
  id: string
  item_id: string
  fornecedor_id: string
  codigo_original?: string
  codigo_normalizado?: string
  descricao_original: string
  idioma?: string
  unidade_fornecedor?: string
  principal?: boolean
  status_validacao: PartnerValidationStatus
  origem?: string
  validado_por?: string
  validado_em?: string
  created: string
  updated: string
  expand?: {
    fornecedor_id?: {
      id: string
      nome: string
    }
  }
}

export type ItemCommercialEventRecord = {
  id: string
  tipo: 'cotacao_fornecedor' | 'compra_books' | 'cotacao_cliente' | 'venda_books'
  item_id: string
  cliente_id?: string
  fornecedor_id?: string
  ocorrido_em: string
  quantidade?: number
  unidade?: string
  valor_unitario_micros: number
  moeda: string
  sistema_origem: 'skip' | 'zoho_books' | 'zoho_crm' | 'importacao'
  chave_origem: string
  documento_revisao_id?: string
  created: string
  expand?: {
    cliente_id?: Cliente
    fornecedor_id?: {
      id: string
      nome: string
    }
  }
}

export type LegacyPriceRecord = {
  id: string
  item_id: string
  preco?: number
  fornecedor?: string
  cliente?: string
  tipo?: 'compra' | 'venda' | string
  data_cotacao?: string
  created: string
}

export type ItemDocumentLink = {
  id: string
  item_id: string
  documento_revisao_id: string
  cliente_id?: string
  fornecedor_id?: string
  tipo_vinculo: 'c2' | 'cliente' | 'fornecedor' | 'aplicacao'
  aplicacao?: string
  observacoes?: string
  created: string
  expand?: {
    documento_revisao_id?: {
      id: string
      revisao: string
      workdrive_url: string
      vigente: boolean
      data_documento?: string
      expand?: {
        documento_id?: {
          id: string
          codigo?: string
          titulo: string
          tipo: string
          origem_tipo: string
        }
      }
    }
    cliente_id?: Cliente
    fornecedor_id?: {
      id: string
      nome: string
    }
  }
}
