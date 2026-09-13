import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isValidWorkDriveUrl } from '@/lib/item-intelligence/workdrive-url'
import type { ItemDocumentLink } from '@/types/item-intelligence'
import { ExternalLink } from 'lucide-react'

type ItemTransaction = {
  id: string
  quantidade?: number
  created?: string
  expand?: {
    potencial_id?: {
      numero_potencial?: string
      cliente?: string
    }
  }
}

export function ItemDocumentsApplicationsTab({
  documents,
  transactions,
}: {
  documents: ItemDocumentLink[]
  transactions: ItemTransaction[]
}) {
  const applications = [
    ...new Set(
      documents
        .filter((link) => link.tipo_vinculo === 'aplicacao')
        .map((link) => link.aplicacao?.trim())
        .filter((application): application is string => Boolean(application)),
    ),
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Aplicações do item</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-xs">Nenhuma aplicação vinculada.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-4 text-xs">
              {applications.map((application) => (
                <li key={application}>{application}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Documentos técnicos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum documento vinculado.</p>
          ) : (
            documents.map((link) => {
              const revision = link.expand?.documento_revisao_id
              const document = revision?.expand?.documento_id
              const validWorkDriveUrl =
                revision?.workdrive_url && isValidWorkDriveUrl(revision.workdrive_url)
              return (
                <div key={link.id} className="rounded-lg border p-3 text-xs space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <strong className="text-sm">
                      {[document?.codigo, document?.titulo].filter(Boolean).join(' — ') ||
                        'Documento sem identificação'}
                    </strong>
                    {revision?.vigente && <Badge>Vigente</Badge>}
                  </div>
                  <div className="text-muted-foreground">
                    Revisão {revision?.revisao || 'não informada'}
                  </div>
                  {validWorkDriveUrl ? (
                    <a
                      href={revision.workdrive_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      Abrir no WorkDrive <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : revision?.workdrive_url ? (
                    <span className="text-muted-foreground">Link do WorkDrive inválido.</span>
                  ) : null}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Cotações e aplicações relacionadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {transactions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma cotação relacionada.</p>
          ) : (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex justify-between gap-3 rounded-lg border p-3 text-xs"
              >
                <div>
                  <div className="font-medium">
                    Potencial {transaction.expand?.potencial_id?.numero_potencial || 'sem número'}
                  </div>
                  <div className="text-muted-foreground">
                    {transaction.expand?.potencial_id?.cliente || 'Cliente não informado'}
                  </div>
                </div>
                <div>
                  {transaction.quantidade ? `${transaction.quantidade} un` : 'Sem quantidade'}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
