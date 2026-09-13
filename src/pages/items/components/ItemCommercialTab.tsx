import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  COMMERCIAL_EVENT_TYPES,
  classifyCommercialEventType,
  isTrustedCommercialEvent,
  selectLatestCommercialEvents,
} from '@/lib/item-intelligence/commercial-events'
import type { ItemCommercialEventRecord, LegacyPriceRecord } from '@/types/item-intelligence'

const sourceLabels = {
  skip: 'Skip',
  zoho_books: 'Zoho Books',
  zoho_crm: 'Zoho CRM',
  importacao: 'Importação',
} as const

type CommercialHistoryRow =
  | { kind: 'event'; date: string; record: ItemCommercialEventRecord }
  | { kind: 'legacy'; date: string; record: LegacyPriceRecord }

function eventCounterparty(event: ItemCommercialEventRecord) {
  const isClientEvent = event.tipo === 'cotacao_cliente' || event.tipo === 'venda_books'
  const primary = isClientEvent ? event.expand?.cliente_id?.nome : event.expand?.fornecedor_id?.nome
  const secondary = isClientEvent
    ? event.expand?.fornecedor_id?.nome
    : event.expand?.cliente_id?.nome

  return primary || secondary || 'Contraparte não informada'
}

function historyTimestamp(date: string) {
  return Date.parse(date) || 0
}

function formatDate(date: string) {
  return historyTimestamp(date) ? new Date(date).toLocaleDateString('pt-BR') : 'Sem data'
}

function formatMoney(valueMicros: number, currency: string) {
  const value = valueMicros / 1_000_000
  const currencyCode = currency || 'USD'

  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value)
  } catch (error) {
    if (!(error instanceof RangeError)) throw error

    const formattedValue = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value)
    return `${formattedValue} ${currencyCode}`
  }
}

export function ItemCommercialTab({
  events,
  legacy,
}: {
  events: ItemCommercialEventRecord[]
  legacy: LegacyPriceRecord[]
}) {
  const latest = selectLatestCommercialEvents(events)
  const history: CommercialHistoryRow[] = [
    ...events
      .filter(isTrustedCommercialEvent)
      .map((record) => ({ kind: 'event' as const, date: record.ocorrido_em, record })),
    ...legacy.map((record) => ({
      kind: 'legacy' as const,
      date: record.data_cotacao || record.created,
      record,
    })),
  ].sort((left, right) => historyTimestamp(right.date) - historyTimestamp(left.date))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COMMERCIAL_EVENT_TYPES.map((type) => {
          const event = latest[type] as ItemCommercialEventRecord | null
          const metadata = classifyCommercialEventType(type)
          return (
            <Card key={type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">{metadata.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {event ? (
                  <>
                    <div className="text-lg font-semibold">
                      {formatMoney(event.valor_unitario_micros, event.moeda)}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                      <span>{new Date(event.ocorrido_em).toLocaleDateString('pt-BR')}</span>
                      <Badge variant="outline">
                        {sourceLabels[event.sistema_origem] || event.sistema_origem}
                      </Badge>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem registro.</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Histórico comercial</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum registro comercial.</p>
          ) : (
            <div role="list" aria-label="Histórico comercial" className="space-y-2">
              {history.map((row) => {
                if (row.kind === 'event') {
                  const event = row.record
                  const metadata = classifyCommercialEventType(event.tipo)

                  return (
                    <div
                      key={`event-${event.id}`}
                      role="listitem"
                      className="flex flex-col gap-2 rounded-lg border p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{metadata.label}</span>
                          <Badge variant="outline">Fato novo</Badge>
                        </div>
                        <div className="text-muted-foreground">{eventCounterparty(event)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Origem: {sourceLabels[event.sistema_origem] || event.sistema_origem} ·
                          Chave: {event.chave_origem}
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="font-medium">
                          {formatMoney(event.valor_unitario_micros, event.moeda)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatDate(row.date)}
                        </div>
                      </div>
                    </div>
                  )
                }

                const record = row.record
                const metadata = classifyCommercialEventType(record.tipo || '')
                return (
                  <div
                    key={`legacy-${record.id}`}
                    role="listitem"
                    className="flex flex-col gap-2 rounded-lg border p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{metadata.label}</span>
                        <Badge variant="outline">Referência legada</Badge>
                      </div>
                      <div className="text-muted-foreground">
                        {record.fornecedor || record.cliente || 'Contraparte não estruturada'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Origem: historico_precos · Registro: {record.id}
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="font-medium">
                        {typeof record.preco === 'number' ? record.preco.toFixed(6) : 'Sem valor'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatDate(row.date)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
