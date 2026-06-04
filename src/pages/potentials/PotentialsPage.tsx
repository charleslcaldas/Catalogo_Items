import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import pb from '@/lib/pocketbase/client'
import type { Potencial } from '@/types'
import { useRealtime } from '@/hooks/use-realtime'

export default function PotentialsPage() {
  const [potentials, setPotentials] = useState<Potencial[]>([])
  const [itemStatuses, setItemStatuses] = useState<
    Record<string, 'empty' | 'incomplete' | 'complete'>
  >({})
  const [itemTotals, setItemTotals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstagio, setFilterEstagio] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDateStart, setFilterDateStart] = useState('')
  const [filterDateEnd, setFilterDateEnd] = useState('')

  const loadPotentials = async () => {
    setLoading(true)
    try {
      const filters = []
      if (search) {
        const t = search.replace(/"/g, '')

        const pItens = await pb
          .collection('potencial_itens')
          .getFullList({
            filter: `item_id.descr_pt ~ "${t}" || item_id.descr_en ~ "${t}" || item_id.acabamento_id.nome_pt ~ "${t}" || item_id.acabamento_id.nome_en ~ "${t}"`,
            fields: 'potencial_id',
          })
          .catch(() => [])

        const matchedPotIds = Array.from(new Set(pItens.map((p) => p.potencial_id)))
        const extraFilter =
          matchedPotIds.length > 0
            ? ` || ${matchedPotIds.map((id) => `id="${id}"`).join(' || ')}`
            : ''

        filters.push(
          `((numero_potencial ~ "${t}" || cliente ~ "${t}" || nome_potencial ~ "${t}" || proprietario ~ "${t}")${extraFilter})`,
        )
      }
      if (filterEstagio !== 'all') {
        filters.push(`estagio = "${filterEstagio}"`)
      }
      if (filterStatus !== 'all') {
        filters.push(`status = "${filterStatus}"`)
      }
      if (filterDateStart) {
        filters.push(`created >= "${filterDateStart} 00:00:00"`)
      }
      if (filterDateEnd) {
        filters.push(`created <= "${filterDateEnd} 23:59:59"`)
      }

      const res = await pb.collection<Potencial>('potenciais').getList(1, 50, {
        filter: filters.join(' && '),
        sort: '-created',
      })

      const ids = res.items.map((p) => p.id)
      if (ids.length > 0) {
        const itemsFilter = ids.map((id) => `potencial_id = "${id}"`).join(' || ')
        const itemsRes = await pb
          .collection('potencial_itens')
          .getFullList({ filter: itemsFilter, fields: 'id,potencial_id,quantidade,preco_unitario' })

        const statuses: Record<string, 'empty' | 'incomplete' | 'complete'> = {}
        const totals: Record<string, number> = {}

        ids.forEach((id) => {
          statuses[id] = 'empty'
          totals[id] = 0
        })

        const itemsByPotential: Record<string, any[]> = {}
        itemsRes.forEach((item) => {
          if (!itemsByPotential[item.potencial_id]) itemsByPotential[item.potencial_id] = []
          itemsByPotential[item.potencial_id].push(item)
        })

        Object.entries(itemsByPotential).forEach(([pid, items]) => {
          if (items.length === 0) {
            statuses[pid] = 'empty'
            totals[pid] = 0
          } else {
            const hasIncomplete = items.some((i) => !i.quantidade || !i.preco_unitario)
            statuses[pid] = hasIncomplete ? 'incomplete' : 'complete'
            totals[pid] = items.reduce(
              (acc, i) => acc + (i.quantidade || 0) * (i.preco_unitario || 0),
              0,
            )
          }
        })

        setItemStatuses(statuses)
        setItemTotals(totals)
      } else {
        setItemStatuses({})
        setItemTotals({})
      }
      setPotentials(res.items)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const delay = setTimeout(() => {
      loadPotentials()
    }, 300)
    return () => clearTimeout(delay)
  }, [search, filterEstagio, filterStatus, filterDateStart, filterDateEnd])

  useRealtime('potenciais', () => {
    loadPotentials()
  })

  useRealtime('potencial_itens', () => {
    loadPotentials()
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getStatusBadge = (p: Potencial) => {
    const status = p.status || 'Sem Itens'

    if (status === 'Completo') {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 font-normal h-5 text-[10px] px-2 rounded-full">
          ✅ Completo
        </Badge>
      )
    }

    if (status === 'Incompleto' || status === 'rascunho') {
      return (
        <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200 font-normal h-5 text-[10px] px-2 rounded-full">
          ⚠️ Itens incompletos
        </Badge>
      )
    }

    return (
      <Badge
        variant="secondary"
        className="bg-slate-100 text-slate-600 border-slate-200 font-normal h-5 text-[10px] px-2 rounded-full"
      >
        🚫 Sem Itens
      </Badge>
    )
  }

  return (
    <div className="flex flex-col p-4 md:p-6 max-w-[1600px] mx-auto w-full h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cotações (Potenciais)</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as cotações e potenciais de vendas
          </p>
        </div>
        <Button asChild>
          <Link to="/potenciais/adicionar">
            <Plus className="mr-2 h-4 w-4" /> Nova Cotação
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-4 shrink-0 bg-slate-50/50">
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar cotação..."
              className="pl-8 h-8 text-xs rounded-full bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              className="h-8 rounded-full border-input bg-white px-3 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos Status</option>
              <option value="Completo">Completo</option>
              <option value="Incompleto">Incompleto</option>
              <option value="Sem Itens">Sem Itens</option>
            </select>

            <select
              className="h-8 rounded-full border-input bg-white px-3 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border"
              value={filterEstagio}
              onChange={(e) => setFilterEstagio(e.target.value)}
            >
              <option value="all">Todos Estágios</option>
              <option value="Qualificação">Qualificação</option>
              <option value="Proposta">Proposta</option>
              <option value="Negociação">Negociação</option>
              <option value="Fechado Ganho">Fechado Ganho</option>
              <option value="Fechado Perdido">Fechado Perdido</option>
            </select>

            <div className="flex items-center gap-2 bg-white rounded-full border px-3 h-8">
              <span className="text-xs text-muted-foreground font-medium">De:</span>
              <input
                type="date"
                className="text-xs focus:outline-none bg-transparent"
                value={filterDateStart}
                onChange={(e) => setFilterDateStart(e.target.value)}
              />
              <span className="text-xs text-muted-foreground font-medium">Até:</span>
              <input
                type="date"
                className="text-xs focus:outline-none bg-transparent"
                value={filterDateEnd}
                onChange={(e) => setFilterDateEnd(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow className="h-8">
                <TableHead className="text-[11px] py-1">Número Potencial</TableHead>
                <TableHead className="text-[11px] py-1">Cliente</TableHead>
                <TableHead className="text-[11px] py-1">Nome Potencial</TableHead>
                <TableHead className="text-[11px] py-1">Proprietário</TableHead>
                <TableHead className="text-[11px] py-1">Estágio</TableHead>
                <TableHead className="text-[11px] py-1">Status</TableHead>
                <TableHead className="text-[11px] py-1 text-right">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && potentials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <span className="text-sm">Carregando...</span>
                  </TableCell>
                </TableRow>
              ) : potentials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-sm">
                    Nenhuma cotação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                potentials.map((p) => (
                  <TableRow key={p.id} className="h-9 py-0 hover:bg-slate-50/50">
                    <TableCell className="py-1 text-[11px] font-medium">
                      <Link
                        to={`/potenciais/adicionar?id=${p.id}`}
                        className="text-primary hover:underline"
                      >
                        {p.numero_potencial}
                      </Link>
                    </TableCell>
                    <TableCell className="py-1 text-[11px]">{p.cliente || '-'}</TableCell>
                    <TableCell className="py-1 text-[11px] font-medium">
                      {p.nome_potencial ? (
                        <Link
                          to={`/potenciais/adicionar?id=${p.id}`}
                          className="text-primary hover:underline"
                        >
                          {p.nome_potencial}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="py-1 text-[11px] text-muted-foreground">
                      {p.proprietario || '-'}
                    </TableCell>
                    <TableCell className="py-1 text-[11px] text-muted-foreground">
                      {p.estagio || '-'}
                    </TableCell>
                    <TableCell className="py-1">{getStatusBadge(p)}</TableCell>
                    <TableCell className="py-1 text-[11px] text-right font-medium">
                      {itemTotals[p.id] ? formatCurrency(itemTotals[p.id]) : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
