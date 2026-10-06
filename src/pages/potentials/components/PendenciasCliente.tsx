import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertCircle } from 'lucide-react'

interface SolicitacaoItemCliente {
  id: string
  potencial_id: string
  descricao_cliente_original: string
  quantidade: number
  unidade_medida?: string
  item_candidato_id: string
  status?: string
  origem?: string
  aprovacao_ref?: string
  chave_idempotencia: string
  expand?: {
    item_candidato_id?: {
      id: string
      sku: string
      descr_pt?: string
    }
  }
}

interface PendenciasClienteProps {
  potencialId?: string | null
}

export default function PendenciasCliente({ potencialId }: PendenciasClienteProps) {
  const [pendencias, setPendencias] = useState<SolicitacaoItemCliente[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!potencialId) {
      setPendencias([])
      return
    }

    let isMounted = true
    setLoading(true)

    pb.collection('solicitacoes_itens_cliente')
      .getFullList<SolicitacaoItemCliente>({
        filter: `potencial_id="${potencialId}"`,
        expand: 'item_candidato_id',
        sort: 'created',
      })
      .then((records) => {
        if (isMounted) {
          setPendencias(records)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar pendencias do cliente:', err)
        if (isMounted) {
          setPendencias([])
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [potencialId])

  if (!potencialId || loading || pendencias.length === 0) {
    return null
  }

  return (
    <Card className="m-4 border-amber-300/60 bg-amber-50/20 dark:bg-amber-950/10">
      <CardHeader className="py-3 px-4 pb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <CardTitle className="text-sm font-semibold text-amber-900 dark:text-amber-300">
            Pendências do Cliente (Solicitações Originais)
          </CardTitle>
          <Badge
            variant="outline"
            className="text-xs border-amber-400 text-amber-700 bg-amber-100/50"
          >
            {pendencias.length} {pendencias.length === 1 ? 'item' : 'itens'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold">Descrição Original do Cliente</TableHead>
              <TableHead className="text-xs font-semibold w-24 text-right">Qtd</TableHead>
              <TableHead className="text-xs font-semibold w-20">Unidade</TableHead>
              <TableHead className="text-xs font-semibold w-32">Status</TableHead>
              <TableHead className="text-xs font-semibold">
                Item Candidato (SKU + Descrição)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendencias.map((p) => {
              const itemCandidato = p.expand?.item_candidato_id
              return (
                <TableRow key={p.id} className="text-xs">
                  <TableCell className="font-mono text-xs whitespace-pre-wrap py-2">
                    {p.descricao_cliente_original}
                  </TableCell>
                  <TableCell className="text-right font-medium py-2">{p.quantidade}</TableCell>
                  <TableCell className="text-muted-foreground py-2">
                    {p.unidade_medida || '—'}
                  </TableCell>
                  <TableCell className="py-2">
                    {p.status ? (
                      <Badge variant="secondary" className="text-[11px] font-normal">
                        {p.status}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    {itemCandidato ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground">{itemCandidato.sku}</span>
                        {itemCandidato.descr_pt && (
                          <span className="text-muted-foreground line-clamp-2">
                            {itemCandidato.descr_pt}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{p.item_candidato_id}</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
