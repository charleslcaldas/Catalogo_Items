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
import { ImagePreviewModal } from '@/components/ImagePreviewModal'
import { ItemDetailPanel } from './ItemDetailPanel'
import { BulkEditDialog } from './BulkEditDialog'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { cn, getContrastColor } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { ResizableHeader } from '@/components/ui/resizable-header'

function AcabamentoBadge({ acabamento }: { acabamento?: any }) {
  if (!acabamento) return <span className="text-muted-foreground">-</span>

  const bgColor = acabamento.cor_hex || '#e2e8f0'
  const textColor = getContrastColor(bgColor)

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-black/10 shadow-sm whitespace-nowrap"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {acabamento.nome_pt}
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
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const filterStatus = searchParams.get('status')
  const filterLinhaId = searchParams.get('linha_id')

  const showInactiveParam = searchParams.get('showInactive') === 'true'
  const [showInactive, setShowInactive] = useState(showInactiveParam)

  const handleShowInactiveChange = (checked: boolean) => {
    setShowInactive(checked)
    const newParams = new URLSearchParams(searchParams)
    if (checked) newParams.set('showInactive', 'true')
    else newParams.delete('showInactive')
    setSearchParams(newParams)
  }

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

  // Debounce search term to prevent rate limits while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchApiItens = async (searchStr: string) => {
    setIsLoading(true)
    setError(null)

    let sortStr = ''
    if (sortColumn) {
      sortStr = sortDirection === 'asc' ? sortColumn : `-${sortColumn}`
    }

    const filters: string[] = []

    if (filterStatus === 'Ativo') {
      filters.push(`ativo = true`)
    } else if (filterStatus === 'Inativo') {
      filters.push(`ativo = false`)
    } else if (!showInactive) {
      filters.push(`ativo = true`)
    }

    if (filterLinhaId) {
      filters.push(`linha_id = "${filterLinhaId}"`)
    }

    if (searchStr.trim()) {
      const normalizedTerm = searchStr.toLowerCase().replace(/["']/g, '')
      const tokens = normalizedTerm.split(/\s+/).filter(Boolean)
      const includeTokens: string[] = []
      const excludeTokens: string[] = []

      for (const token of tokens) {
        if (token.startsWith('-') && token.length > 1) {
          excludeTokens.push(token.substring(1))
        } else {
          includeTokens.push(token)
        }
      }

      for (const token of includeTokens) {
        filters.push(
          `(sku ~ "${token}" || descr_pt ~ "${token}" || descr_en ~ "${token}" || descricao_curta ~ "${token}" || descricao_curta_en ~ "${token}" || descricao_catalogo_pt ~ "${token}" || descricao_catalogo_en ~ "${token}" || tamanho ~ "${token}" || linha_id.nome_pt ~ "${token}" || acabamento_id.nome_pt ~ "${token}" || acabamento_id.codigo ~ "${token}")`,
        )
      }
      for (const token of excludeTokens) {
        filters.push(
          `(sku !~ "${token}" && descr_pt !~ "${token}" && descr_en !~ "${token}" && descricao_curta !~ "${token}" && descricao_curta_en !~ "${token}" && descricao_catalogo_pt !~ "${token}" && descricao_catalogo_en !~ "${token}" && tamanho !~ "${token}" && linha_id.nome_pt !~ "${token}" && acabamento_id.nome_pt !~ "${token}" && acabamento_id.codigo !~ "${token}")`,
        )
      }
    }

    const filterStr = filters.join(' && ')

    try {
      const records = await pb.collection('itens').getFullList({
        sort: sortStr,
        filter: filterStr,
        expand: 'linha_id,linha_id.categoria_id,acabamento_id,ncm_id,descricao_base_id',
        requestKey: 'items_page_search', // Auto-cancel previous identical requests to save bandwidth and rate limits
      })
      setApiItens(records)
    } catch (e: any) {
      if (e.isAbort) return // Skip updating state if the request was naturally cancelled by a newer one
      if (e.status === 429) {
        setError('Muitas requisições. Por favor, aguarde um momento e tente novamente.')
      } else {
        console.error(e)
        setError('Erro ao carregar itens.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchApiItens(debouncedSearch)
  }, [sortColumn, sortDirection, debouncedSearch, filterStatus, filterLinhaId, showInactive])

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce realtime refreshes to avoid 429 when processing bulk operations
  useRealtime('itens', () => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    fetchTimeoutRef.current = setTimeout(() => {
      fetchApiItens(debouncedSearch)
    }, 1000)
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

  const selectedItem = apiItens.find((i) => i.id === selectedItemId)

  const toggleSelectAll = () => {
    if (selectedItemIds.size === apiItens.length && apiItens.length > 0) {
      setSelectedItemIds(new Set())
    } else {
      setSelectedItemIds(new Set(apiItens.map((i) => i.id)))
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
    <div className="flex flex-col animate-fade-in relative pb-12 h-full">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-4 pb-4 mb-4 -mt-4 border-b border-border/50 shadow-sm flex flex-col gap-4 shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full max-w-4xl">
          <h1 className="font-bold tracking-tight whitespace-nowrap text-[1.18rem] m-0 hidden sm:block">
            Catálogo de Itens
          </h1>
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar item..."
              className="pl-9 w-full rounded-full bg-card h-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border shadow-sm h-9">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={handleShowInactiveChange}
                className="scale-75 origin-left"
              />
              <Label
                htmlFor="show-inactive"
                className="text-xs font-medium cursor-pointer whitespace-nowrap"
              >
                Mostrar Inativos
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setSelectedItemId('new')}
                size="sm"
                className="rounded-full h-9 px-4 shrink-0 w-full sm:w-auto flex-1 sm:flex-none text-sm font-medium"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Novo Item
              </Button>
              {filterLinhaId && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full h-9 px-3 shrink-0"
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams)
                    newParams.delete('linha_id')
                    setSearchParams(newParams)
                  }}
                >
                  <FilterX className="h-4 w-4 mr-1.5" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
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
                    checked={selectedItemIds.size > 0 && selectedItemIds.size === apiItens.length}
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
            <TableBody
              className={cn(isLoading && apiItens.length > 0 && 'opacity-50 pointer-events-none')}
            >
              {error ? (
                <TableRow>
                  <TableCell
                    colSpan={selectedItemId ? 6 : 9}
                    className="text-center py-16 text-destructive"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FilterX className="w-10 h-10 mb-2 opacity-50" />
                      <p className="font-medium">{error}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchApiItens(debouncedSearch)}
                      >
                        Tentar Novamente
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : isLoading && apiItens.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={selectedItemId ? 6 : 9}
                    className="text-center py-16 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p>Carregando itens...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : apiItens.length === 0 ? (
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
                apiItens.map((item) => {
                  const isSelected = selectedItemIds.has(item.id)
                  const isRowActive = selectedItemId === item.id
                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        'cursor-pointer transition-colors',
                        !item.ativo && 'opacity-60 grayscale-[0.3]',
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
                        <AcabamentoBadge acabamento={item.expand?.acabamento_id} />
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
                                <Badge
                                  variant="outline"
                                  className="bg-red-50 text-red-700 border-red-200"
                                >
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
