import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ItemClienteLink, ItemFornecedorLink } from '@/types/item-intelligence'

const statusLabels = {
  proposto: 'Proposto',
  validado: 'Validado',
  rejeitado: 'Rejeitado',
  inativo: 'Inativo',
} as const

function ReferenceCard({
  company,
  code,
  description,
  status,
  origin,
}: {
  company: string
  code?: string
  description: string
  status: keyof typeof statusLabels
  origin?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-3 text-xs space-y-2">
      <div className="flex items-start justify-between gap-2">
        <strong className="text-sm">{company}</strong>
        <Badge variant={status === 'validado' ? 'default' : 'outline'}>
          {statusLabels[status]}
        </Badge>
      </div>
      <div>
        <span className="text-muted-foreground">Código: </span>
        <span className="font-mono font-medium">{code?.trim() || 'Não informado'}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Descrição: </span>
        <span>{description}</span>
      </div>
      {origin && <div className="text-[10px] text-muted-foreground">Origem: {origin}</div>}
    </div>
  )
}

export function ItemPartnersTab({
  clients,
  suppliers,
}: {
  clients: ItemClienteLink[]
  suppliers: ItemFornecedorLink[]
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Referências de clientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {clients.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum vínculo de cliente registrado.</p>
          ) : (
            clients.map((link) => (
              <ReferenceCard
                key={link.id}
                company={link.expand?.cliente_id?.nome || 'Cliente não identificado'}
                code={link.codigo_original}
                description={link.descricao_original}
                status={link.status_validacao}
                origin={link.origem}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Referências de fornecedores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {suppliers.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhum vínculo de fornecedor registrado.
            </p>
          ) : (
            suppliers.map((link) => (
              <ReferenceCard
                key={link.id}
                company={link.expand?.fornecedor_id?.nome || 'Fornecedor não identificado'}
                code={link.codigo_original}
                description={link.descricao_original}
                status={link.status_validacao}
                origin={link.origem}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
