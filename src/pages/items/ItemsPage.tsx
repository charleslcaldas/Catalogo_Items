import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Plus,
  Search,
  Layers,
  PackageOpen,
  FilterX,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Trash2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useData } from '@/contexts/data-context'
import { ImagePreviewModal } from '@/components/ImagePreviewModal'
import { ItemDetailPanel } from './ItemDetailPanel'
import { BulkEditDialog } from './BulkEditDialog'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { cn, getContrastColor } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { ResizableHeader } from '@/components/ui/resizable-header'

function AcabamentoBadge({ acabamentoId }: { acabamentoId?: string }) {
  const { acabamentos } = useData()
  const aca = acabamentos.find((a) => a.id === acabamentoId)
  if (!aca) return <span className="text-muted-foreground">-</span>

  const bgColor = aca.cor_hex || '#e2e8f0'
  const textColor = getContrastColor(bgColor)

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-black/10 shadow-sm whitespace-nowrap"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {aca.nome_pt}
    </span>
  )
}

function SortableHeader({ column, title, sortColumn, sortDirection, onSort }: any) {
  const isActive = sortColumn === column
  return (
    <div
      className="flex items-center gap-1 cursor-pointer hover:text-foreground select-none"
      onClick={() => onSort(column)}
    >
      {title}
      {isActive ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-30" />
      )}
    </div>
  )
}

export default function ItemsPage() {
  const { linhas, categorias, ncms, descricoesBase, acabamentos } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const filterStatus = searchParams.get('status')
  const filterLinhaId = searchParams.get('linha_id')
  const [searchTerm, setSearchTerm] = useState('')

  const { user, updatePreferences } = useAuth()

  const defaultWidths = useMemo(
    () => ({
      checkbox: 40,
      foto: 48,
      sku: 120,
      descricao_curta: 300,
      tamanho: 100,
      acabamento_id: 120,
      preco_venda: 100,
      validade_preco: 120,
      status: 150,
    }),
    [],
  )

  const [colWidths, setColWidths] = useState<Record<string, number>>(
    user?.preferencias_ui?.items_table_widths || defaultWidths,
  )

  useEffect(() => {
    if (user?.preferencias_ui?.items_table_widths) {
      setColWidths((prev) => ({ ...prev, ...user.preferencias_ui.items_table_widths }))
    }
  }, [user?.preferencias_ui?.items_table_widths])

  const handleResize = (col: string, width: number) => {
    setColWidths((prev) => ({ ...prev, [col]: width }))
  }

  const handleResizeEnd = (col: string, width: number) => {
    const newWidths = { ...colWidths, [col]: width }
    setColWidths(newWidths)
    updatePreferences({ items_table_widths: newWidths })
  }

  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [apiItens, setApiItens] = useState<any[]>([])

  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

  const fetchApiItens = async () => {
    let sortStr = ''
    if (sortColumn) {
      sortStr = sortDirection === 'asc' ? sortColumn : `-${sortColumn}`
    }
    try {
      const records = await pb.collection('itens').getFullList({ sort: sortStr })
      setApiItens(records)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchApiItens()
  }, [sortColumn, sortDirection])

  useRealtime('itens', () => {
    fetchApiItens()
  })

  useEffect(() => {
    const storedItemId = localStorage.getItem('lastSelectedItemId')
    if (!searchParams.has('itemId') && storedItemId) {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('itemId', storedItemId)
      setSearchParams(newParams, { replace: true })
    }
  }, [])

  const selectedItemId = searchParams.get('itemId')
  const setSelectedItemId = (id: string | null) => {
    const newParams = new URLSearchParams(searchParams)
    if (id) {
      newParams.set('itemId', id)
      localStorage.setItem('lastSelectedItemId', id)
    } else {
      newParams.delete('itemId')
      localStorage.removeItem('lastSelectedItemId')
    }
    setSearchParams(newParams)
  }

  const getLinhaName = (id: string) => linhas.find((l) => l.id === id)?.nome_pt || 'N/A'
  const getCategoriaName = (linhaId: string) => {
    const linha = linhas.find((l) => l.id === linhaId)
    if (!linha) return ''
    return categorias.find((c) => c.id === linha.categoria_id)?.nome_pt || ''
  }
  const getNcmCode = (id?: string) => ncms.find((n) => n.id === id)?.codigo || ''
  const getDescricaoBasePt = (id?: string) => descricoesBase.find((d) => d.id === id)?.nome_pt || ''

  const filteredItems = useMemo(() => {
    return apiItens.filter((item) => {
      if (filterStatus === 'Ativo' && !item.ativo) return false
      if (filterLinhaId && item.linha_id !== filterLinhaId) return false

      if (!searchTerm.trim()) return true
      const normalizedTerm = searchTerm
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      const tokens = normalizedTerm.split(/\s+/).filter(Boolean)
      if (tokens.length === 0) return true

      const includeTokens: string[] = []
      const excludeTokens: string[] = []

      for (const token of tokens) {
        if (token.startsWith('-') && token.length > 1) {
          excludeTokens.push(token.substring(1))
        } else {
          includeTokens.push(token)
        }
      }

      const getAcabamentoInfo = (id?: string) => {
        const aca = acabamentos.find((a) => a.id === id)
        return aca ? `${aca.nome_pt} ${aca.nome_en || ''} ${aca.codigo}` : ''
      }

      const textToSearch = [
        item.sku,
        item.descr_pt,
        item.descr_en,
        getDescricaoBasePt(item.descricao_base_id),
        item.descricao_curta,
        item.descricao_curta_en,
        item.descricao_base_pt,
        item.grau,
        item.tipo_rosca,
        item.norma,
        item.informacao_extra,
        item.tamanho,
        item.unidade,
        getLinhaName(item.linha_id),
        getCategoriaName(item.linha_id),
        getNcmCode(item.ncm_id),
        getAcabamentoInfo(item.acabamento_id),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

      for (const token of excludeTokens) {
        if (textToSearch.includes(token)) return false
      }

      for (const token of includeTokens) {
        if (!textToSearch.includes(token)) return false
      }

      return true
    })
  }, [
    apiItens,
    searchTerm,
    filterStatus,
    filterLinhaId,
    linhas,
    categorias,
    ncms,
    descricoesBase,
    acabamentos,
  ])

  const selectedItem = apiItens.find((i) => i.id === selectedItemId)

  const toggleSelectAll = () => {
    if (selectedItemIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedItemIds(new Set())
    } else {
      setSelectedItemIds(new Set(filteredItems.map((i) => i.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedItemIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedItemIds(newSet)
  }

  const handleBulkSuccess = () => {
    setSelectedItemIds(new Set())
    setIsBulkEditOpen(false)
  }

  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null)
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleImageClick = (e: React.MouseEvent, item: any) => {
    e.stopPropagation()
    if (e.detail === 1) {
      clickTimerRef.current = setTimeout(() => {
        setPreviewImage({
          url: item.foto_url || 'https://img.usecurling.com/p/800/800?q=tools',
          alt: item.sku,
        })
      }, 250)
    } else if (e.detail === 2) {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
      setSelectedItemId(item.id)
    }
  }

  const executeBulkDelete = async () => {
    try {
      await Promise.all(Array.from(selectedItemIds).map((id) => pb.collection('itens').delete(id)))
      setSelectedItemIds(new Set())
      toast.success(`${selectedItemIds.size} itens excluídos com sucesso.`)
    } catch (e) {
      toast.error('Erro ao excluir itens.')
    } finally {
      setIsBulkDeleteOpen(false)
    }
  }

  const handleSortClick = (col: string) => {
    if (sortColumn === col) {
      if (sortDirection === 'asc') setSortDirection('desc')
      else {
        setSortColumn(null)
        setSortDirection('asc')
      }
    } else {
      setSortColumn(col)
      setSortDirection('asc')
    }
  }

  return (
    <div className="flex flex-col space-y-4 animate-fade-in relative pb-12 pt-2 h-full">
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4 w-full max-w-3xl">
          <h1 className="font-bold tracking-tight whitespace-nowrap text-[1.18rem] m-0">
            Catálogo de Itens
          </h1>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar item..."
              className="pl-9 w-full rounded-full bg-card h-8 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            onClick={() => setSelectedItemId('new')}
            size="sm"
            className="rounded-full h-8 px-4 shrink-0"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Novo Item
          </Button>
          {filterLinhaId && (
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full h-8 px-3 shrink-0"
              onClick={() => {
                const newParams = new URLSearchParams(searchParams)
                newParams.delete('linha_id')
                setSearchParams(newParams)
              }}
            >
              <FilterX className="h-3.5 w-3.5 mr-1.5" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-4 flex-1 items-start overflow-hidden">
        <div
          className={cn(
            'border rounded-xl bg-card relative transition-all duration-300 shadow-sm overflow-x-auto h-full overflow-y-auto',
            selectedItemId ? 'w-[40%] hidden lg:block' : 'w-full',
          )}
        >
          <Table style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow className="h-8">
                <TableHead
                  style={{
                    width: colWidths.checkbox,
                    minWidth: colWidths.checkbox,
                    maxWidth: colWidths.checkbox,
                  }}
                  className="text-center px-2"
                >
                  <Checkbox
                    checked={
                      selectedItemIds.size > 0 && selectedItemIds.size === filteredItems.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead
                  style={{
                    width: colWidths.foto,
                    minWidth: colWidths.foto,
                    maxWidth: colWidths.foto,
                  }}
                  className="text-center px-2"
                >
                  Foto
                </TableHead>
                <ResizableHeader
                  width={colWidths.sku}
                  onResize={(w) => handleResize('sku', w)}
                  onResizeEnd={(w) => handleResizeEnd('sku', w)}
                  className="px-2"
                >
                  SKU
                </ResizableHeader>
                <ResizableHeader
                  width={colWidths.descricao_curta}
                  onResize={(w) => handleResize('descricao_curta', w)}
                  onResizeEnd={(w) => handleResizeEnd('descricao_curta', w)}
                  className="px-2"
                >
                  <SortableHeader
                    column="descricao_curta"
                    title="Descrição Curta"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSortClick}
                  />
                </ResizableHeader>
                <ResizableHeader
                  width={colWidths.tamanho}
                  onResize={(w) => handleResize('tamanho', w)}
                  onResizeEnd={(w) => handleResizeEnd('tamanho', w)}
                  className="px-2"
                >
                  <SortableHeader
                    column="tamanho"
                    title="Tamanho"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSortClick}
                  />
                </ResizableHeader>
                <ResizableHeader
                  width={colWidths.acabamento_id}
                  onResize={(w) => handleResize('acabamento_id', w)}
                  onResizeEnd={(w) => handleResizeEnd('acabamento_id', w)}
                  className="px-2"
                >
                  <SortableHeader
                    column="acabamento_id"
                    title="Acab."
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSortClick}
                  />
                </ResizableHeader>
                {!selectedItemId && (
                  <>
                    <ResizableHeader
                      width={colWidths.preco_venda}
                      onResize={(w) => handleResize('preco_venda', w)}
                      onResizeEnd={(w) => handleResizeEnd('preco_venda', w)}
                      className="px-2"
                    >
                      Preço Venda
                    </ResizableHeader>
                    <ResizableHeader
                      width={colWidths.validade_preco}
                      onResize={(w) => handleResize('validade_preco', w)}
                      onResizeEnd={(w) => handleResizeEnd('validade_preco', w)}
                      className="px-2"
                    >
                      Validade do Preço
                    </ResizableHeader>
                    <ResizableHeader
                      width={colWidths.status}
                      onResize={(w) => handleResize('status', w)}
                      onResizeEnd={(w) => handleResizeEnd('status', w)}
                      className="px-2"
                    >
                      Status
                    </ResizableHeader>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={selectedItemId ? 6 : 9}
                    className="text-center py-16 text-muted-foreground"
                  >
                    <PackageOpen className="w-12 h-12 mx-auto opacity-20 mb-4" />
                    Nenhum item encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedItemIds.has(item.id)
                  const isRowActive = selectedItemId === item.id
                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isRowActive
                          ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40'
                          : 'hover:bg-muted/50',
                      )}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                        className="text-center py-1 px-2"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <img
                          src={item.foto_url || 'https://img.usecurling.com/p/100/100?q=tools'}
                          alt={item.sku}
                          className="w-6 h-6 rounded object-cover border bg-muted mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                          title="Clique para ampliar / Duplo clique para editar"
                          onClick={(e) => handleImageClick(e, item)}
                        />
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap py-1 px-2 text-sm overflow-hidden text-ellipsis">
                        {item.sku}
                      </TableCell>
                      <TableCell className={cn('py-1 px-2 text-sm overflow-hidden')}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'cursor-default w-full',
                                selectedItemId
                                  ? 'truncate'
                                  : 'whitespace-normal break-words leading-snug',
                              )}
                            >
                              {item.descricao_curta || '-'}
                            </div>
                          </TooltipTrigger>
                          {item.descricao_curta && (
                            <TooltipContent
                              side="bottom"
                              align="start"
                              className="max-w-xs break-words text-xs"
                            >
                              <p>{item.descricao_curta}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-1 px-2 text-sm overflow-hidden text-ellipsis">
                        {item.tamanho || '-'}
                      </TableCell>
                      <TableCell className="py-1 px-2 overflow-hidden text-ellipsis whitespace-nowrap">
                        <AcabamentoBadge acabamentoId={item.acabamento_id} />
                      </TableCell>
                      {!selectedItemId && (
                        <>
                          <TableCell className="whitespace-nowrap py-1 px-2 text-xs overflow-hidden text-ellipsis">
                            {typeof item.preco_venda === 'number'
                              ? `$ ${item.preco_venda.toFixed(2)}`
                              : '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap py-1 px-2 text-xs overflow-hidden text-ellipsis">
                            {item.validade_preco
                              ? item.validade_preco.split('T')[0].split('-').reverse().join('/')
                              : '-'}
                          </TableCell>
                          <TableCell className="py-1 px-2 overflow-hidden text-ellipsis whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {item.ativo ? (
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
                              {item.sincronizado_com_zoho ? (
                                <div
                                  className="w-2 h-2 rounded-full bg-blue-500 shrink-0"
                                  title="Sincronizado com Zoho"
                                />
                              ) : (
                                <div
                                  className="w-2 h-2 rounded-full bg-orange-400 shrink-0"
                                  title="Pendente sincronização"
                                />
                              )}
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div
          className={cn(
            'border rounded-xl bg-card flex flex-col transition-all duration-300 shadow-sm overflow-hidden h-full',
            selectedItemId
              ? 'w-full lg:w-[60%] animate-in slide-in-from-right-8'
              : 'w-0 opacity-0 border-0 hidden',
          )}
        >
          {selectedItemId && (
            <ItemDetailPanel
              item={selectedItemId === 'new' ? undefined : selectedItem}
              onClose={() => setSelectedItemId(null)}
              key={selectedItemId}
            />
          )}
        </div>
      </div>

      {selectedItemIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 flex items-center gap-4 bg-popover text-popover-foreground border shadow-2xl rounded-full px-6 py-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-2 py-0.5 rounded-full">
              {selectedItemIds.size}
            </Badge>
            <span className="text-sm font-medium">itens selecionados</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <Button onClick={() => setIsBulkEditOpen(true)} size="sm" className="rounded-full">
            <Layers className="w-3.5 h-3.5 mr-1.5" /> Editar
          </Button>
          <Button
            onClick={() => setIsBulkDeleteOpen(true)}
            size="sm"
            variant="destructive"
            className="rounded-full"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Excluir
          </Button>
          <Button
            onClick={() => setSelectedItemIds(new Set())}
            variant="ghost"
            size="sm"
            className="rounded-full"
          >
            Cancelar
          </Button>
        </div>
      )}

      <BulkEditDialog
        open={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        selectedIds={Array.from(selectedItemIds)}
        onSuccess={handleBulkSuccess}
      />

      {previewImage && (
        <ImagePreviewModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.url}
          altText={previewImage.alt}
        />
      )}

      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Itens</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{selectedItemIds.size}</strong> itens
              selecionados? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
