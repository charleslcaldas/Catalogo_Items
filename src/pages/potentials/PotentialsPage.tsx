import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Loader2, LayoutGrid, LayoutList } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import pb from '@/lib/pocketbase/client'
import type { Potencial } from '@/types'
import { useRealtime } from '@/hooks/use-realtime'
import type { StatusPotencial } from '@/types'
import { getContrastColor } from '@/lib/utils'

const ESTAGIOS = [
  'Qualificação',
  'Proposta',
  'Negociação',
  'Aguardando Cotação Fornecedor',
  'Cotação Recebida',
  'Fechado Ganho',
  'Fechado Perdido',
  'Sem Estágio',
]

export default function PotentialsPage() {
  const [potentials, setPotentials] = useState<Potencial[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
  const [itemStatuses, setItemStatuses] = useState<
    Record<string, 'empty' | 'incomplete' | 'complete'>
  >({})
  const [itemTotals, setItemTotals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedEstagios, setSelectedEstagios] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterProprietario, setFilterProprietario] = useState('all')
  const [filterDateStart, setFilterDateStart] = useState('')
  const [filterDateEnd, setFilterDateEnd] = useState('')
  const [statuses, setStatuses] = useState<StatusPotencial[]>([])

  useEffect(() => {
    pb.collection('status_potencial')
      .getFullList<StatusPotencial>()
      .then(setStatuses)
      .catch(() => {})
  }, [])

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
      if (selectedEstagios.length > 0) {
        const estagioFilter = selectedEstagios
          .map((e) => (e === 'Sem Estágio' ? `estagio = ""` : `estagio = "${e}"`))
          .join(' || ')
        filters.push(`(${estagioFilter})`)
      }
      if (filterStatus !== 'all') {
        filters.push(`status = "${filterStatus}"`)
      }
      if (filterProprietario !== 'all' && filterProprietario.trim() !== '') {
        filters.push(`proprietario ~ "${filterProprietario.replace(/"/g, '')}"`)
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
  }, [search, selectedEstagios, filterStatus, filterProprietario, filterDateStart, filterDateEnd])

  useRealtime('potenciais', () => {
    loadPotentials()
  })

  useRealtime('potencial_itens', () => {
    loadPotentials()
  })

  const formatCurrency = (value: number) => {
    return `$ ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatNumber = (value: number) => {
    return value.toLocaleString('en-US')
  }

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('potencialId', id)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const onDrop = async (e: React.DragEvent, targetStage: string) => {
    const potencialId = e.dataTransfer.getData('potencialId')
    if (potencialId) {
      const newStage = targetStage === 'Sem Estágio' ? '' : targetStage

      // Optimistic update
      setPotentials((prev) =>
        prev.map((p) => (p.id === potencialId ? { ...p, estagio: newStage } : p)),
      )

      try {
        await pb.collection('potenciais').update(potencialId, { estagio: newStage })
      } catch (err) {
        console.error('Error updating stage:', err)
        loadPotentials()
      }
    }
  }

  const displayedEstagios =
    selectedEstagios.length > 0 ? ESTAGIOS.filter((e) => selectedEstagios.includes(e)) : ESTAGIOS

  const totalGeral = potentials.reduce((acc, p) => acc + (itemTotals[p.id] || 0), 0)

  const getStatusBadge = (p: Potencial) => {
    const status = p.status || 'Sem Itens'

    // Attempt dynamic status matching
    const dynamicStatus = statuses.find((s) => s.nome === status)
    if (dynamicStatus && dynamicStatus.cor_hex) {
      return (
        <Badge
          style={{
            backgroundColor: dynamicStatus.cor_hex,
            color: getContrastColor(dynamicStatus.cor_hex),
          }}
          className="border-0 font-normal h-5 text-[10px] px-2 rounded-full shadow-none whitespace-nowrap"
        >
          {status}
        </Badge>
      )
    }

    // Fallbacks
    if (status === 'Completo') {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 font-normal h-5 text-[10px] px-2 rounded-full">
          Completo
        </Badge>
      )
    }
    if (status === 'Incompleto' || status === 'rascunho') {
      return (
        <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200 font-normal h-5 text-[10px] px-2 rounded-full">
          Itens incompletos
        </Badge>
      )
    }
    if (status === 'Sem Itens') {
      return (
        <Badge
          variant="secondary"
          className="bg-slate-100 text-slate-600 border-slate-200 font-normal h-5 text-[10px] px-2 rounded-full"
        >
          Sem Itens
        </Badge>
      )
    }

    return (
      <Badge
        variant="secondary"
        className="bg-slate-100 text-slate-600 border-slate-200 font-normal h-5 text-[10px] px-2 rounded-full"
      >
        {status}
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
        <div className="p-4 border-b flex flex-col gap-4 shrink-0 bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar cotação..."
                  className="pl-8 h-8 text-xs rounded-full bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs rounded-full bg-white flex gap-2"
                  >
                    Estágios{' '}
                    {selectedEstagios.length > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 rounded-full font-medium">
                        {selectedEstagios.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Filtrar Estágios</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {ESTAGIOS.map((e) => (
                    <DropdownMenuCheckboxItem
                      key={e}
                      checked={selectedEstagios.includes(e)}
                      onCheckedChange={(checked) => {
                        setSelectedEstagios((prev) =>
                          checked ? [...prev, e] : prev.filter((x) => x !== e),
                        )
                      }}
                    >
                      {e}
                    </DropdownMenuCheckboxItem>
                  ))}
                  {selectedEstagios.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => setSelectedEstagios([])}
                        className="text-muted-foreground"
                      >
                        Limpar Filtros
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Input
                type="text"
                placeholder="Filtrar Comprador..."
                className="h-8 w-40 text-xs rounded-full bg-white"
                value={filterProprietario === 'all' ? '' : filterProprietario}
                onChange={(e) => setFilterProprietario(e.target.value || 'all')}
              />

              <select
                className="h-8 rounded-full border-input bg-white px-3 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos Status</option>
                <option value="Sem Itens">Sem Itens</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.nome}>
                    {s.nome}
                  </option>
                ))}
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

            <div className="flex gap-1 p-1 bg-slate-200/50 rounded-lg">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-7 text-xs px-3 shadow-none bg-transparent data-[state=active]:bg-white data-[state=active]:shadow-sm"
                data-state={viewMode === 'list' ? 'active' : 'inactive'}
              >
                <LayoutList className="w-4 h-4 mr-2" /> Lista
              </Button>
              <Button
                variant={viewMode === 'board' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('board')}
                className="h-7 text-xs px-3 shadow-none bg-transparent data-[state=active]:bg-white data-[state=active]:shadow-sm"
                data-state={viewMode === 'board' ? 'active' : 'inactive'}
              >
                <LayoutGrid className="w-4 h-4 mr-2" /> Kanban
              </Button>
            </div>
          </div>
        </div>

        {viewMode === 'board' ? (
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 flex gap-4 bg-slate-50/50">
            {displayedEstagios.map((estagio) => {
              const stagePotentials = potentials.filter(
                (p) => (p.estagio || 'Sem Estágio') === estagio,
              )
              const stageTotal = stagePotentials.reduce(
                (acc, p) => acc + (itemTotals[p.id] || 0),
                0,
              )

              return (
                <div
                  key={estagio}
                  className="flex-shrink-0 w-80 bg-slate-100/50 rounded-xl border border-slate-200 flex flex-col max-h-full"
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, estagio)}
                >
                  <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white/60 rounded-t-xl shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-700">{estagio}</span>
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-5">
                        {formatNumber(stagePotentials.length)}
                      </Badge>
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      {formatCurrency(stageTotal)}
                    </span>
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-3">
                    {stagePotentials.map((p) => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, p.id)}
                        className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors group"
                      >
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <Link
                            to={`/potenciais/adicionar?id=${p.id}`}
                            className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors leading-tight"
                          >
                            {p.numero_potencial}
                          </Link>
                          {getStatusBadge(p)}
                        </div>
                        <div className="text-xs text-slate-600 mb-3 font-medium line-clamp-2">
                          {p.nome_potencial || p.cliente || '-'}
                        </div>
                        <div className="flex items-end justify-between mt-auto">
                          <div className="text-[10px] text-slate-500 font-medium px-2 py-1 bg-slate-50 rounded-md">
                            {p.proprietario || 'Sem dono'}
                          </div>
                          <div className="text-sm font-bold text-slate-700">
                            {itemTotals[p.id] ? formatCurrency(itemTotals[p.id]) : '-'}
                          </div>
                        </div>
                      </div>
                    ))}
                    {stagePotentials.length === 0 && (
                      <div className="text-xs text-center text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-lg">
                        Arraste cotações para cá
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
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
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-muted-foreground text-sm"
                    >
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
        )}
      </div>
    </div>
  )
}
