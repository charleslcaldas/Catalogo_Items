import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useData, DescricaoBase } from '@/contexts/data-context'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns3,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { textMatchesAll, cn } from '@/lib/utils'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'

const COLUMNS_STORAGE_KEY = 'descricoes_base:colunas_visiveis'
const WIDTHS_STORAGE_KEY = 'descricoes_base:larguras'
const MIN_COLUMN_WIDTH = 80

type ColumnId = 'nome_en' | 'categoria' | 'linha' | 'itens' | 'impostos' | 'status' | 'conferida'
// "Descrição (PT)" é fixa (não aparece no seletor de colunas), mas também é redimensionável.
type ResizableColumnId = 'nome_pt' | ColumnId

const ALL_WIDTH_COLUMNS: ResizableColumnId[] = [
  'nome_pt',
  'nome_en',
  'categoria',
  'linha',
  'itens',
  'impostos',
  'status',
  'conferida',
]

// Larguras padrão (px) usadas quando o usuário já redimensionou alguma coluna
// (a tabela passa a usar layout fixo; colunas nunca ajustadas recebem o padrão).
const DEFAULT_COLUMN_WIDTHS: Record<ResizableColumnId, number> = {
  nome_pt: 260,
  nome_en: 260,
  categoria: 170,
  linha: 170,
  itens: 90,
  impostos: 260,
  status: 100,
  conferida: 130,
}

function loadColWidths(): Partial<Record<ResizableColumnId, number>> {
  try {
    const raw = localStorage.getItem(WIDTHS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Partial<Record<ResizableColumnId, number>> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (
        ALL_WIDTH_COLUMNS.includes(key as ResizableColumnId) &&
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= MIN_COLUMN_WIDTH
      ) {
        out[key as ResizableColumnId] = value
      }
    }
    return out
  } catch {
    return {}
  }
}

// Colunas que SEMPRE ficam visíveis (mínimo útil da tela).
const FIXED_COLUMNS: ColumnId[] = ['itens']

const COLUMN_LABELS: Record<ColumnId, string> = {
  nome_en: 'Descrição (EN)',
  categoria: 'Categoria',
  linha: 'Linha',
  itens: 'Itens',
  impostos: 'Impostos NCM',
  status: 'Status',
  conferida: 'Conferida',
}

const ALL_COLUMNS: ColumnId[] = [
  'nome_en',
  'categoria',
  'linha',
  'itens',
  'impostos',
  'status',
  'conferida',
]

function loadVisibleColumns(): ColumnId[] {
  try {
    const raw = localStorage.getItem(COLUMNS_STORAGE_KEY)
    if (!raw) return ALL_COLUMNS
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return ALL_COLUMNS
    const valid = parsed.filter(
      (c: string) => ALL_COLUMNS.includes(c as ColumnId) || FIXED_COLUMNS.includes(c as ColumnId),
    ) as ColumnId[]
    const merged = Array.from(new Set([...FIXED_COLUMNS, ...valid]))
    return ALL_COLUMNS.filter((c) => merged.includes(c))
  } catch {
    return ALL_COLUMNS
  }
}

// Cabeçalho de coluna com handle de redimensionamento na borda direita.
// O handle para o arraste fica sobre a área de padding do th; o clique nele
// não propaga, então não dispara a ordenação da coluna.
function ThWithResize({
  colId,
  widths,
  onResizeStart,
  children,
  style,
  className,
  ...thProps
}: React.ThHTMLAttributes<HTMLTableCellElement> & {
  colId: ResizableColumnId
  widths: Partial<Record<ResizableColumnId, number>>
  onResizeStart: (colId: ResizableColumnId, e: React.MouseEvent) => void
}) {
  const width = widths[colId]
  return (
    <TableHead
      {...thProps}
      style={width ? { width, minWidth: width, ...style } : style}
      className={cn('relative', className)}
    >
      {children}
      <span
        role="presentation"
        title="Arraste para redimensionar"
        onMouseDown={(e) => onResizeStart(colId, e)}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize select-none hover:bg-border/60"
      />
    </TableHead>
  )
}

export default function DescricoesBasePage() {
  const { descricoesBase, categorias, linhas, ncms, itens, reloadMetadata } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<DescricaoBase> | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  // Filtro de conferência: 'todos' | 'pendente' | 'conferida'
  const [filtroConferida, setFiltroConferida] = useState<'todos' | 'pendente' | 'conferida'>(
    'todos',
  )
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(loadVisibleColumns)
  const [colWidths, setColWidths] =
    useState<Partial<Record<ResizableColumnId, number>>>(loadColWidths)
  const dragRef = useRef<{
    colId: ResizableColumnId
    startX: number
    startWidth: number
    moved: boolean
  } | null>(null)
  const suppressSortClickRef = useRef(false)
  const hasCustomWidths = Object.keys(colWidths).length > 0

  // Larguras efetivas: só entram em cena quando o usuário já redimensionou
  // alguma coluna (layout fixo). Antes disso, a tabela usa o layout automático
  // original — "padrão" = como nunca redimensionou.
  const effectiveWidths = useMemo(
    () => (hasCustomWidths ? { ...DEFAULT_COLUMN_WIDTHS, ...colWidths } : {}),
    [hasCustomWidths, colWidths],
  )

  useEffect(() => {
    try {
      localStorage.setItem(WIDTHS_STORAGE_KEY, JSON.stringify(colWidths))
    } catch {
      // localStorage indisponível: larguras só valem para a sessão
    }
  }, [colWidths])

  const handleResizeStart = (colId: ResizableColumnId, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const th = (e.currentTarget as HTMLElement).closest('th')
    const startWidth = th?.getBoundingClientRect().width || DEFAULT_COLUMN_WIDTHS[colId] || 160
    dragRef.current = { colId, startX: e.clientX, startWidth, moved: false }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const dx = ev.clientX - drag.startX
      if (!drag.moved && Math.abs(dx) <= 3) return
      drag.moved = true
      setColWidths((prev) => ({
        ...prev,
        [drag.colId]: Math.max(MIN_COLUMN_WIDTH, drag.startWidth + dx),
      }))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      const drag = dragRef.current
      dragRef.current = null
      if (drag?.moved) {
        // o clique de mouseup ainda pode cair no th e disparar a ordenação
        suppressSortClickRef.current = true
        setTimeout(() => {
          suppressSortClickRef.current = false
        }, 0)
      }
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }
  const [sortField, setSortField] = useState<
    'nome_pt' | 'nome_en' | 'categoria' | 'linha' | 'itens' | 'conferida' | null
  >(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)
  const navigate = useNavigate()

  const itensCount = useMemo(() => {
    const map: Record<string, number> = {}
    for (const i of itens) {
      if (i.descricao_base_id) map[i.descricao_base_id] = (map[i.descricao_base_id] || 0) + 1
    }
    return map
  }, [itens])

  const toggleColumn = (col: ColumnId) => {
    setVisibleColumns((prev) => {
      let next: ColumnId[]
      if (prev.includes(col)) {
        if (FIXED_COLUMNS.includes(col)) return prev // "Itens" nunca pode ser escondida
        next = prev.filter((c) => c !== col)
      } else {
        next = ALL_COLUMNS.filter((c) => prev.includes(c) || c === col)
      }
      try {
        localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // localStorage indisponível: preferência só vale para a sessão
      }
      return next
    })
  }

  const filteredDesc = descricoesBase.filter((d) => {
    if (filtroConferida === 'pendente' && d.conferida) return false
    if (filtroConferida === 'conferida' && !d.conferida) return false
    if (!searchTerm.trim()) return true
    const catName = categorias.find((c) => c.id === d.categoria_id)?.nome_pt || ''
    const linhaName = linhas.find((l) => l.id === d.linha_id)?.nome_pt || ''
    const ncmCode = ncms.find((n) => n.id === d.ncm_id)?.codigo || ''
    const haystack = [d.nome_pt, d.nome_en, catName, linhaName, ncmCode, d.codigo]
      .filter(Boolean)
      .join(' ')
    return textMatchesAll(haystack, searchTerm)
  })

  const handleOpenNew = () => {
    setEditingItem({ ativo: true })
    setModalOpen(true)
  }

  const handleEdit = (item: DescricaoBase) => {
    setEditingItem(item)
    setModalOpen(true)
  }

  const handleSort = (
    field: 'nome_pt' | 'nome_en' | 'categoria' | 'linha' | 'itens' | 'conferida',
  ) => {
    if (suppressSortClickRef.current) return // clique residual do fim do arraste de resize
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc')
      else if (sortOrder === 'desc') {
        setSortField(null)
        setSortOrder(null)
      }
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({
    field,
  }: {
    field: 'nome_pt' | 'nome_en' | 'categoria' | 'linha' | 'itens' | 'conferida'
  }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50 inline-block" />
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4 inline-block" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4 inline-block" />
    )
  }

  const sortedDesc = useMemo(() => {
    const list = [...filteredDesc]
    if (sortField && sortOrder) {
      list.sort((a, b) => {
        let valA = ''
        let valB = ''

        if (sortField === 'nome_pt') {
          valA = a.nome_pt
          valB = b.nome_pt
        } else if (sortField === 'nome_en') {
          valA = a.nome_en || ''
          valB = b.nome_en || ''
        } else if (sortField === 'categoria') {
          valA = categorias.find((c) => c.id === a.categoria_id)?.nome_pt || ''
          valB = categorias.find((c) => c.id === b.categoria_id)?.nome_pt || ''
        } else if (sortField === 'linha') {
          valA = linhas.find((l) => l.id === a.linha_id)?.nome_pt || ''
          valB = linhas.find((l) => l.id === b.linha_id)?.nome_pt || ''
        } else if (sortField === 'itens') {
          valA = String(itensCount[a.id] || 0).padStart(8, '0')
          valB = String(itensCount[b.id] || 0).padStart(8, '0')
        } else if (sortField === 'conferida') {
          // Ordenação por estado: agrupa pendentes (false) separadas de
          // conferidas (true). Crescente = pendentes primeiro.
          const confA = Number(!!a.conferida)
          const confB = Number(!!b.conferida)
          if (confA !== confB) {
            return sortOrder === 'asc' ? confA - confB : confB - confA
          }
          return 0
        }

        valA = valA.toLowerCase()
        valB = valB.toLowerCase()

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
    }
    return list
  }, [filteredDesc, sortField, sortOrder, categorias, linhas, itensCount])

  const handleToggleConferida = async (item: DescricaoBase) => {
    const novoValor = !item.conferida
    try {
      await pb.collection('descricoes_base').update(item.id, { conferida: novoValor })
      await reloadMetadata()
      toast.success(novoValor ? 'Descrição marcada como conferida' : 'Marcação removida')
    } catch (err: any) {
      toast.error('Erro ao atualizar etiqueta: ' + getErrorMessage(err))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem?.nome_pt || !editingItem?.categoria_id || !editingItem?.linha_id) {
      return toast.error('Preencha os campos obrigatórios')
    }
    setSaving(true)
    try {
      if (!editingItem.id && !editingItem.codigo) {
        editingItem.codigo = `DESC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      }
      if (editingItem.id) {
        await pb.collection('descricoes_base').update(editingItem.id, editingItem)
        toast.success('Descrição Base atualizada')
      } else {
        await pb.collection('descricoes_base').create(editingItem)
        toast.success('Nova Descrição Base criada')
      }
      await reloadMetadata()
      setModalOpen(false)
    } catch (err: any) {
      const fieldErrors = extractFieldErrors(err)
      if (fieldErrors.nome_pt) {
        toast.error('Esta descrição já está cadastrada.')
      } else {
        toast.error('Erro ao salvar: ' + getErrorMessage(err))
      }
    } finally {
      setSaving(false)
    }
  }

  const filteredLinhas = linhas.filter(
    (l) => !editingItem?.categoria_id || l.categoria_id === editingItem.categoria_id,
  )

  const handleLinhaChange = (linhaId: string) => {
    const linha = linhas.find((l) => l.id === linhaId)
    setEditingItem((prev) => ({
      ...prev,
      linha_id: linhaId,
      ncm_id: linha?.ncm_id || prev?.ncm_id,
    }))
  }

  const colCount =
    1 + // Descrição (PT) — fixa
    visibleColumns.filter((c) => c !== 'itens').length

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Descrições Base</h1>
            <p className="text-muted-foreground">
              {descricoesBase.length}{' '}
              {descricoesBase.length === 1 ? 'descrição base' : 'descrições base'} no total
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar descrições..."
              className="pl-9 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={filtroConferida}
            onValueChange={(v) => setFiltroConferida(v as 'todos' | 'pendente' | 'conferida')}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Conferida" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="pendente">Só pendentes</SelectItem>
              <SelectItem value="conferida">Só conferidas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Columns3 className="mr-2 h-4 w-4" /> Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_COLUMNS.map((col) => {
                const isFixed = FIXED_COLUMNS.includes(col)
                const checked = visibleColumns.includes(col)
                return (
                  <DropdownMenuCheckboxItem
                    key={col}
                    checked={checked}
                    disabled={isFixed}
                    onCheckedChange={() => toggleColumn(col)}
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer"
                  >
                    {COLUMN_LABELS[col]}
                    {isFixed && <span className="ml-1 text-xs text-muted-foreground">(fixa)</span>}
                  </DropdownMenuCheckboxItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleOpenNew}>
            <Plus className="mr-2 h-4 w-4" /> Nova Descrição Base
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Descrições Base</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className={cn(hasCustomWidths && 'table-fixed')}>
            <TableHeader>
              <TableRow>
                <ThWithResize
                  colId="nome_pt"
                  widths={effectiveWidths}
                  onResizeStart={handleResizeStart}
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('nome_pt')}
                >
                  Descrição (PT) <SortIcon field="nome_pt" />
                </ThWithResize>
                {visibleColumns.includes('nome_en') && (
                  <ThWithResize
                    colId="nome_en"
                    widths={effectiveWidths}
                    onResizeStart={handleResizeStart}
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleSort('nome_en')}
                  >
                    Descrição (EN) <SortIcon field="nome_en" />
                  </ThWithResize>
                )}
                {visibleColumns.includes('categoria') && (
                  <ThWithResize
                    colId="categoria"
                    widths={effectiveWidths}
                    onResizeStart={handleResizeStart}
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleSort('categoria')}
                  >
                    Categoria <SortIcon field="categoria" />
                  </ThWithResize>
                )}
                {visibleColumns.includes('linha') && (
                  <ThWithResize
                    colId="linha"
                    widths={effectiveWidths}
                    onResizeStart={handleResizeStart}
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleSort('linha')}
                  >
                    Linha <SortIcon field="linha" />
                  </ThWithResize>
                )}
                {visibleColumns.includes('itens') && (
                  <ThWithResize
                    colId="itens"
                    widths={effectiveWidths}
                    onResizeStart={handleResizeStart}
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleSort('itens')}
                  >
                    Itens <SortIcon field="itens" />
                  </ThWithResize>
                )}
                {visibleColumns.includes('impostos') && (
                  <ThWithResize
                    colId="impostos"
                    widths={effectiveWidths}
                    onResizeStart={handleResizeStart}
                  >
                    Impostos NCM
                  </ThWithResize>
                )}
                {visibleColumns.includes('status') && (
                  <ThWithResize
                    colId="status"
                    widths={effectiveWidths}
                    onResizeStart={handleResizeStart}
                  >
                    Status
                  </ThWithResize>
                )}
                {visibleColumns.includes('conferida') && (
                  <ThWithResize
                    colId="conferida"
                    widths={effectiveWidths}
                    onResizeStart={handleResizeStart}
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleSort('conferida')}
                  >
                    Conferida <SortIcon field="conferida" />
                  </ThWithResize>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDesc.map((d) => (
                <TableRow key={d.id}>
                  <TableCell
                    className="font-medium cursor-pointer hover:text-primary hover:underline transition-colors"
                    onClick={() => handleEdit(d)}
                  >
                    {d.nome_pt}
                  </TableCell>
                  {visibleColumns.includes('nome_en') && (
                    <TableCell
                      className="cursor-pointer hover:text-primary hover:underline transition-colors"
                      onClick={() => handleEdit(d)}
                    >
                      {d.nome_en || '-'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('categoria') && (
                    <TableCell>
                      {categorias.find((c) => c.id === d.categoria_id)?.nome_pt || '-'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('linha') && (
                    <TableCell>{linhas.find((l) => l.id === d.linha_id)?.nome_pt || '-'}</TableCell>
                  )}
                  {visibleColumns.includes('itens') && (
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80 transition-colors"
                        onClick={() => navigate(`/itens?descricao_base_id=${d.id}`)}
                        title={`Ver itens desta descrição base`}
                      >
                        {itensCount[d.id] || 0} itens
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('impostos') && (
                    <TableCell>
                      {(() => {
                        const n = ncms.find((x) => x.id === d.ncm_id)
                        if (!n) return '-'
                        return (
                          <div className="text-xs">
                            <span className="text-muted-foreground">
                              II: {n.ii}% | IPI: {n.ipi}% | PIS: {n.pis}% | COF: {n.cofins}%
                            </span>
                          </div>
                        )
                      })()}
                    </TableCell>
                  )}
                  {visibleColumns.includes('status') && (
                    <TableCell>
                      {d.ativo ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200"
                        >
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes('conferida') && (
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => handleToggleConferida(d)}
                        title={d.conferida ? 'Desmarcar conferência' : 'Marcar como conferida'}
                        className="inline-flex cursor-pointer transition-transform hover:scale-105 focus:outline-none"
                      >
                        {d.conferida ? (
                          <Badge className="gap-1.5 border border-emerald-700 bg-emerald-600 font-semibold text-white hover:bg-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Conferida
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="gap-1.5 border-amber-300 bg-amber-100 font-semibold text-amber-800 hover:bg-amber-200"
                          >
                            <Circle className="h-3.5 w-3.5" />
                            Pendente
                          </Badge>
                        )}
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {sortedDesc.length === 0 && (
                <TableRow>
                  <TableCell colSpan={colCount} className="text-center py-8 text-muted-foreground">
                    Nenhuma descrição base encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingItem?.id ? 'Editar' : 'Nova'} Descrição Base</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>
                  Descrição Base (PT) <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  value={editingItem?.nome_pt || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, nome_pt: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Descrição Base (EN)</Label>
                <Input
                  value={editingItem?.nome_en || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, nome_en: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Categoria <span className="text-destructive">*</span>
                </Label>
                <Select
                  required
                  value={editingItem?.categoria_id || ''}
                  onValueChange={(v) =>
                    setEditingItem({ ...editingItem, categoria_id: v, linha_id: undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome_pt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Linha <span className="text-destructive">*</span>
                </Label>
                <Select
                  required
                  disabled={!editingItem?.categoria_id}
                  value={editingItem?.linha_id || ''}
                  onValueChange={handleLinhaChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredLinhas.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome_pt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>NCM</Label>
                <Select
                  value={editingItem?.ncm_id || ''}
                  onValueChange={(v) => setEditingItem({ ...editingItem, ncm_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ncms.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.codigo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex flex-col justify-center">
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="ativo"
                    checked={editingItem?.ativo ?? true}
                    onCheckedChange={(c) => setEditingItem({ ...editingItem, ativo: c })}
                  />
                  <Label htmlFor="ativo">Ativo</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
