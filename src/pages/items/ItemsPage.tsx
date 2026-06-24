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
  Download,
  Upload,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
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
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { ResizableHeader } from '@/components/ui/resizable-header'

function AcabamentoBadge({
  acabamento,
  selectedItemId,
}: {
  acabamento?: any
  selectedItemId?: string | null
}) {
  if (!acabamento) return <span className="text-muted-foreground">-</span>

  const bgColor = acabamento.cor_hex || '#e2e8f0'
  const textColor = getContrastColor(bgColor)

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-[12px] text-xs font-medium border border-black/10 shadow-sm max-w-full"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <span className={cn(selectedItemId ? 'truncate' : 'whitespace-normal break-words text-left')}>
        {acabamento.nome_pt}
      </span>
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

  const filterLinhaId = searchParams.get('linha_id')
  const filterNcmId = searchParams.get('ncm_id')

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const { user, updatePreferences } = useAuth()

  const defaultWidths = useMemo(
    () => ({
      checkbox: 40,
      foto: 48,
      sku: 120,
      linha_id: 120,
      descricao_curta: 300,
      tamanho: 100,
      acabamento_id: 120,
      ncm_id: 100,
      descricao_base_id: 150,
      preco_compra: 130,
      preco_venda: 100,
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

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const perPage = 50

  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

  const [historyMap, setHistoryMap] = useState<Record<string, any>>({})

  useEffect(() => {
    const itemIds = apiItens.map((i) => i.id)
    if (itemIds.length === 0) {
      setHistoryMap({})
      return
    }
    const filter = itemIds.map((id) => `item_id="${id}"`).join(' || ')
    pb.collection('historico_precos')
      .getList(1, 500, {
        filter: `(${filter})`,
        sort: '-data_cotacao,-created',
      })
      .then((res) => {
        const map: Record<string, any> = {}
        res.items.forEach((h) => {
          if (!map[h.item_id]) {
            map[h.item_id] = h
          }
        })
        setHistoryMap(map)
      })
      .catch((err) => console.error(err))
  }, [apiItens])

  // Debounce search term to prevent rate limits while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchApiItens = async (searchStr: string, currentPage: number) => {
    setIsLoading(true)
    setError(null)

    let sortStr = ''
    if (sortColumn) {
      sortStr = sortDirection === 'asc' ? sortColumn : `-${sortColumn}`
    }

    const filters: string[] = []

    if (filterLinhaId) {
      filters.push(`linha_id = "${filterLinhaId}"`)
    }

    if (filterNcmId) {
      filters.push(`ncm_id = "${filterNcmId}"`)
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
      const records = await pb.collection('itens').getList(currentPage, perPage, {
        sort: sortStr,
        filter: filterStr,
        expand: 'linha_id,linha_id.categoria_id,acabamento_id,ncm_id,descricao_base_id,unidade_id',
        requestKey: 'items_page_search', // Auto-cancel previous identical requests to save bandwidth and rate limits
      })
      setApiItens(records.items)
      setTotalPages(records.totalPages || 1)
      setTotalItems(records.totalItems || 0)
    } catch (e: any) {
      if (e.isAbort) return // Skip updating state if the request was naturally cancelled by a newer one

      // Fallback: Retry with simple or no expand to ensure items load gracefully if relations fail
      try {
        const fallbackRecords = await pb.collection('itens').getList(currentPage, perPage, {
          sort: sortStr,
          filter: filterStr,
          requestKey: 'items_page_search_fallback',
        })
        setApiItens(fallbackRecords.items)
        setTotalPages(fallbackRecords.totalPages || 1)
        setTotalItems(fallbackRecords.totalItems || 0)
      } catch (err: any) {
        if (err.isAbort) return
        if (err.status === 429 || e.status === 429) {
          setError('Muitas requisições. Por favor, aguarde um momento e tente novamente.')
        } else {
          console.error(err)
          setError('Erro ao carregar itens.')
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const prevFiltersRef = useRef({
    sortColumn,
    sortDirection,
    debouncedSearch,
    filterLinhaId,
    filterNcmId,
  })

  // Clear selections when page changes to avoid cross-page selection inconsistencies
  useEffect(() => {
    setSelectedItemIds(new Set())
  }, [page])

  useEffect(() => {
    const prev = prevFiltersRef.current
    const filtersChanged =
      prev.sortColumn !== sortColumn ||
      prev.sortDirection !== sortDirection ||
      prev.debouncedSearch !== debouncedSearch ||
      prev.filterLinhaId !== filterLinhaId ||
      prev.filterNcmId !== filterNcmId

    prevFiltersRef.current = {
      sortColumn,
      sortDirection,
      debouncedSearch,
      filterLinhaId,
      filterNcmId,
    }

    if (filtersChanged && page !== 1) {
      setPage(1)
      return
    }

    fetchApiItens(debouncedSearch, filtersChanged ? 1 : page)
  }, [sortColumn, sortDirection, debouncedSearch, filterLinhaId, filterNcmId, page])

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce realtime refreshes to avoid 429 when processing bulk operations
  useRealtime('itens', () => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    fetchTimeoutRef.current = setTimeout(() => {
      fetchApiItens(debouncedSearch, page)
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
  const [activeItemRecord, setActiveItemRecord] = useState<any>(null)

  useEffect(() => {
    if (selectedItemId && selectedItemId !== 'new') {
      const found = apiItens.find((i) => i.id === selectedItemId)
      if (found) {
        setActiveItemRecord(found)
      } else if (!activeItemRecord || activeItemRecord.id !== selectedItemId) {
        // If not in current page and not already loaded, fetch it individually to preserve context
        pb.collection('itens')
          .getOne(selectedItemId, {
            expand:
              'linha_id,linha_id.categoria_id,acabamento_id,ncm_id,descricao_base_id,unidade_id',
          })
          .then(setActiveItemRecord)
          .catch(() => {
            setSelectedItemId(null)
          })
      }
    } else {
      setActiveItemRecord(null)
    }
  }, [selectedItemId, apiItens])

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

  const selectedItem = activeItemRecord

  const toggleSelectAll = () => {
    const currentPageIds = apiItens.map((i) => i.id)
    const allCurrentSelected =
      currentPageIds.length > 0 && currentPageIds.every((id) => selectedItemIds.has(id))

    const newSet = new Set(selectedItemIds)
    if (allCurrentSelected) {
      currentPageIds.forEach((id) => newSet.delete(id))
    } else {
      currentPageIds.forEach((id) => newSet.add(id))
    }
    setSelectedItemIds(newSet)
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

  const handleExportCSV = () => {
    if (apiItens.length === 0) return toast.warning('Nenhum item para exportar')
    const headers = ['SKU', 'Quantidade', 'Unidade', 'Description', 'Size', 'Finish']
    const rows = apiItens.map((i) => {
      const description = [i.descricao_curta, i.descricao_extra]
        .map((s) => String(s || '').trim())
        .filter(Boolean)
        .join('\n\n')

      const finish = i.expand?.acabamento_id?.nome_pt || i.expand?.acabamento_id?.codigo || ''
      const unit = i.unidade || i.expand?.unidade_id?.nome || ''

      return [
        i.sku,
        '', // Quantidade column
        unit,
        description,
        i.tamanho,
        finish,
      ]
    })
    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n')
    // Add BOM for correct UTF-8 handling in Excel
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'itens_export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const tid = toast.loading('Importando CSV...')
    try {
      const res = await pb.send('/backend/v1/csv/import-items', {
        method: 'POST',
        body: JSON.stringify({ csv: text }),
      })
      toast.success(`Importação concluída: ${res.sucessos} sucessos, ${res.erros} erros.`, {
        id: tid,
      })
      fetchApiItens(debouncedSearch)
    } catch (err: any) {
      toast.error('Erro na importação: ' + err.message, { id: tid })
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleBulkSync = async () => {
    const ids = Array.from(selectedItemIds)
    if (ids.length === 0) return
    const tid = toast.loading(`Sincronizando ${ids.length} itens com Zoho...`)
    try {
      await pb.send('/backend/v1/zoho/force-sync', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ids }),
      })
      toast.success('Itens sincronizados com sucesso!', { id: tid })
      setSelectedItemIds(new Set())
    } catch (err) {
      toast.error('Erro na sincronização em massa', { id: tid })
    }
  }

  return (
    <div className="flex flex-col animate-fade-in relative pb-12 h-full">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-4 pb-4 mb-4 -mt-4 border-b border-border/50 shadow-sm flex flex-col gap-4 shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full">
          <h1 className="font-bold tracking-tight whitespace-nowrap text-[1.18rem] m-0 hidden sm:block">
            Catálogo de Itens
          </h1>
          <div className="relative w-full sm:flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar item..."
              className="pl-9 w-full rounded-full bg-card h-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-9 rounded-full px-3 text-sm hidden lg:flex"
            >
              <Download className="w-4 h-4 mr-1.5" /> Exportar
            </Button>
            <label className="cursor-pointer hidden lg:inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3">
              <Upload className="w-4 h-4 mr-1.5" /> Importar
              <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImportCSV}
              />
            </label>
            <Button
              onClick={() => setSelectedItemId('new')}
              size="sm"
              className="rounded-full h-9 px-4 shrink-0 w-full sm:w-auto flex-1 sm:flex-none text-sm font-medium"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Novo Item
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-1 items-start overflow-hidden">
        <div
          className={cn(
            'border rounded-xl bg-card relative transition-all duration-300 shadow-sm h-full flex flex-col',
            selectedItemId ? 'w-[40%] hidden lg:block' : 'flex-1',
          )}
        >
          <div className="flex-1 overflow-auto relative">
            {isLoading && apiItens.length > 0 && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 bg-background border shadow-md px-4 py-2 rounded-full text-sm font-medium">
                  <RefreshCcw className="w-4 h-4 animate-spin text-primary" />
                  Carregando...
                </div>
              </div>
            )}
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
                        apiItens.length > 0 && apiItens.every((i) => selectedItemIds.has(i.id))
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
                    width={colWidths.linha_id}
                    onResize={(w) => handleResize('linha_id', w)}
                    onResizeEnd={(w) => handleResizeEnd('linha_id', w)}
                    className="px-2"
                  >
                    <SortableHeader
                      column="linha_id"
                      title="Linha"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSortClick}
                    />
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
                  <ResizableHeader
                    width={colWidths.ncm_id}
                    onResize={(w) => handleResize('ncm_id', w)}
                    onResizeEnd={(w) => handleResizeEnd('ncm_id', w)}
                    className="px-2"
                  >
                    <SortableHeader
                      column="ncm_id"
                      title="NCM"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSortClick}
                    />
                  </ResizableHeader>
                  <ResizableHeader
                    width={colWidths.descricao_base_id}
                    onResize={(w) => handleResize('descricao_base_id', w)}
                    onResizeEnd={(w) => handleResizeEnd('descricao_base_id', w)}
                    className="px-2"
                  >
                    <SortableHeader
                      column="descricao_base_id"
                      title="Desc. Base"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSortClick}
                    />
                  </ResizableHeader>
                  {!selectedItemId && (
                    <>
                      <ResizableHeader
                        width={colWidths.preco_compra}
                        onResize={(w) => handleResize('preco_compra', w)}
                        onResizeEnd={(w) => handleResizeEnd('preco_compra', w)}
                        className="px-2"
                      >
                        Último Preço
                      </ResizableHeader>
                      <ResizableHeader
                        width={colWidths.preco_venda}
                        onResize={(w) => handleResize('preco_venda', w)}
                        onResizeEnd={(w) => handleResizeEnd('preco_venda', w)}
                        className="px-2"
                      >
                        Preço Venda
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
                      colSpan={selectedItemId ? 9 : 12}
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
                      colSpan={selectedItemId ? 9 : 12}
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
                      colSpan={selectedItemId ? 9 : 12}
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
                        <TableCell className="whitespace-nowrap py-1 px-2 text-sm overflow-hidden text-ellipsis">
                          {item.expand?.linha_id?.nome_pt || '-'}
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
                                {item.tamanho || '-'}
                              </div>
                            </TooltipTrigger>
                            {item.tamanho && (
                              <TooltipContent
                                side="bottom"
                                align="start"
                                className="max-w-xs break-words text-xs"
                              >
                                <p>{item.tamanho}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TableCell>
                        <TableCell className={cn('py-1 px-2 overflow-hidden')}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-full flex items-center">
                                <AcabamentoBadge
                                  acabamento={item.expand?.acabamento_id}
                                  selectedItemId={selectedItemId}
                                />
                              </div>
                            </TooltipTrigger>
                            {item.expand?.acabamento_id?.nome_pt && (
                              <TooltipContent
                                side="bottom"
                                align="start"
                                className="max-w-xs break-words text-xs"
                              >
                                <p>{item.expand.acabamento_id.nome_pt}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-1 px-2 text-sm overflow-hidden text-ellipsis">
                          {item.expand?.ncm_id?.codigo || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-1 px-2 text-sm overflow-hidden text-ellipsis">
                          {item.expand?.descricao_base_id?.codigo ||
                            item.expand?.descricao_base_id?.nome_pt ||
                            '-'}
                        </TableCell>
                        {!selectedItemId && (
                          <>
                            <TableCell className="py-1 px-2 text-xs overflow-hidden text-ellipsis">
                              {(() => {
                                const hist = historyMap[item.id]
                                const refPrice = hist?.preco ?? item.preco_compra
                                const refSupplier =
                                  hist?.fornecedor ?? item.fornecedor_ultima_atualizacao
                                const refDate = hist?.data_cotacao ?? item.data_atualizacao

                                if (typeof refPrice === 'number' && refPrice > 0) {
                                  return (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex flex-col cursor-help items-start">
                                          <span className="font-semibold text-amber-600">
                                            $ {refPrice.toFixed(2)}
                                          </span>
                                          {refSupplier ? (
                                            <span className="text-[9px] text-muted-foreground truncate max-w-[100px]">
                                              {refSupplier}
                                            </span>
                                          ) : (
                                            <span className="text-[9px] text-muted-foreground">
                                              -
                                            </span>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="font-semibold">
                                          Último Fornecedor: {refSupplier || '-'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Data do Preço:{' '}
                                          {refDate ? new Date(refDate).toLocaleDateString() : '-'}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                }
                                return '-'
                              })()}
                            </TableCell>
                            <TableCell className="whitespace-nowrap py-1 px-2 text-xs overflow-hidden text-ellipsis">
                              {typeof item.preco_venda === 'number' ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help decoration-dotted underline underline-offset-2 decoration-muted-foreground/50">
                                      $ {item.preco_venda.toFixed(2)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-semibold">Preço de Venda</p>
                                    <p className="text-xs text-muted-foreground">
                                      Margem aplicada:{' '}
                                      {item.preco_compra && item.preco_compra > 0
                                        ? `${((item.preco_venda / item.preco_compra - 1) * 100).toFixed(1)}%`
                                        : `${item.expand?.linha_id?.margem_padrao ?? 7.5}% (Padrão)`}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                '-'
                              )}
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
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div
                                      className={cn(
                                        'w-2 h-2 rounded-full shrink-0',
                                        item.sincronizado_com_zoho
                                          ? 'bg-blue-500'
                                          : 'bg-orange-400',
                                      )}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {item.sincronizado_com_zoho
                                      ? `Sincronizado: ${item.data_sincronizacao ? new Date(item.data_sincronizacao).toLocaleString() : 'Sim'}`
                                      : 'Pendente sincronização'}
                                  </TooltipContent>
                                </Tooltip>
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

          {totalPages > 1 && (
            <div className="bg-card border-t p-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                Página {page} de {totalPages} | {totalItems} itens no total
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                >
                  <ChevronLeft className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Anterior</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isLoading}
                >
                  <span className="hidden sm:inline">Próxima</span>
                  <ChevronRight className="w-4 h-4 sm:ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div
          className={cn(
            'border rounded-xl bg-card flex flex-col transition-all duration-300 shadow-sm overflow-hidden h-full',
            selectedItemId
              ? 'w-full lg:w-[60%] animate-in slide-in-from-right-8'
              : 'w-0 opacity-0 border-0 hidden',
          )}
        >
          {selectedItemId && (selectedItemId === 'new' || selectedItem) ? (
            <ItemDetailPanel
              item={selectedItemId === 'new' ? undefined : selectedItem}
              onClose={() => setSelectedItemId(null)}
              key={selectedItemId}
            />
          ) : selectedItemId && selectedItemId !== 'new' && !selectedItem ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <RefreshCcw className="w-8 h-8 animate-spin opacity-50" />
            </div>
          ) : null}
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
          <Button onClick={handleBulkSync} size="sm" variant="secondary" className="rounded-full">
            <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Sync Zoho
          </Button>
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
        selectedItems={apiItens.filter((i) => selectedItemIds.has(i.id))}
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
