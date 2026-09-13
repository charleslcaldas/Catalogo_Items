export const COMMERCIAL_EVENT_TYPES = [
  'cotacao_fornecedor',
  'compra_books',
  'cotacao_cliente',
  'venda_books',
] as const

export type CommercialEventType = (typeof COMMERCIAL_EVENT_TYPES)[number]
export type LegacyCommercialEventType = 'compra' | 'venda'

export type CommercialEvent = {
  id: string
  tipo: CommercialEventType | LegacyCommercialEventType | string
  ocorrido_em: string
  item_id?: string
  cliente_id?: string
  fornecedor_id?: string
  quantidade?: number
  unidade?: string
  valor_unitario_micros?: number
  moeda?: string
  sistema_origem?: string
  chave_origem?: string
}

type EventMetadata = {
  type: CommercialEventType | 'legado_compra' | 'legado_venda' | 'nao_classificado'
  label: string
  isRealTransaction: boolean
  isLegacy: boolean
}

const metadata: Record<CommercialEventType, EventMetadata> = {
  cotacao_fornecedor: {
    type: 'cotacao_fornecedor',
    label: 'Cotação recebida do fornecedor',
    isRealTransaction: false,
    isLegacy: false,
  },
  compra_books: {
    type: 'compra_books',
    label: 'Compra real',
    isRealTransaction: true,
    isLegacy: false,
  },
  cotacao_cliente: {
    type: 'cotacao_cliente',
    label: 'Cotação enviada ao cliente',
    isRealTransaction: false,
    isLegacy: false,
  },
  venda_books: {
    type: 'venda_books',
    label: 'Venda real',
    isRealTransaction: true,
    isLegacy: false,
  },
}

export function classifyCommercialEventType(type: string): EventMetadata {
  if (type === 'compra') {
    return {
      type: 'legado_compra',
      label: 'Referência de custo legada',
      isRealTransaction: false,
      isLegacy: true,
    }
  }

  if (type === 'venda') {
    return {
      type: 'legado_venda',
      label: 'Referência legada de venda/cotação',
      isRealTransaction: false,
      isLegacy: true,
    }
  }

  if (COMMERCIAL_EVENT_TYPES.includes(type as CommercialEventType)) {
    return metadata[type as CommercialEventType]
  }

  return {
    type: 'nao_classificado',
    label: 'Evento não classificado',
    isRealTransaction: false,
    isLegacy: true,
  }
}

export function isTrustedCommercialEvent(event: CommercialEvent) {
  if (!COMMERCIAL_EVENT_TYPES.includes(event.tipo as CommercialEventType)) return false

  const type = event.tipo as CommercialEventType
  return (
    (type !== 'compra_books' && type !== 'venda_books') || event.sistema_origem === 'zoho_books'
  )
}

export function selectLatestCommercialEvents(events: CommercialEvent[]) {
  const latest = Object.fromEntries(COMMERCIAL_EVENT_TYPES.map((type) => [type, null])) as Record<
    CommercialEventType,
    CommercialEvent | null
  >

  for (const event of events) {
    if (!isTrustedCommercialEvent(event)) continue

    const type = event.tipo as CommercialEventType
    const current = latest[type]
    if (!current || Date.parse(event.ocorrido_em) > Date.parse(current.ocorrido_em)) {
      latest[type] = event
    }
  }

  return latest
}

type LegacyCostReference = {
  id: string
  tipo?: string
  data_cotacao?: string
  created?: string
}

export function selectLatestLegacyCostReference<T extends LegacyCostReference>(records: T[]) {
  return (
    records
      .filter((record) => record.tipo === 'compra')
      .sort((left, right) => {
        const leftDate = Date.parse(left.data_cotacao || left.created || '') || 0
        const rightDate = Date.parse(right.data_cotacao || right.created || '') || 0
        return rightDate - leftDate
      })[0] || null
  )
}
