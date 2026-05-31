import { useState, useEffect } from 'react'
import { Search, Loader2, Plus, Copy, PackageOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { getContrastColor, cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Item } from '@/types'
import pb from '@/lib/pocketbase/client'
import type { SelectedItemRecord, SelectedItemData } from '../AddItemsToPotential'

interface ProductCatalogProps {
  selectedItems: SelectedItemRecord[]
  onToggle: (item: Item) => void
  onUpdateItem: (id: string, field: keyof SelectedItemData, value: string) => void
  onAddNew: () => void
  onDuplicate: (item: Item) => void
}

export function ProductCatalog({
  selectedItems,
  onToggle,
  onUpdateItem,
  onAddNew,
  onDuplicate,
}: ProductCatalogProps) {
  const [items, setItems] = useState<Item[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState('sku')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    setLoading(true)
    const delay = setTimeout(async () => {
      try {
        let filter = ''
        if (search) {
          const t = search.replace(/"/g, '')
          filter = `sku ~ "${t}" || descr_pt ~ "${t}" || descricao_curta ~ "${t}" || expand.acabamento_id.nome_pt ~ "${t}"`
        }
        const sortParam = `${sortDir === 'desc' ? '-' : ''}${sortField}`
        const res = await pb.collection('itens').getList(page, 20, {
          filter,
          sort: sortParam,
          expand: 'acabamento_id',
        })
        setItems(res.items as Item[])
        setTotalPages(res.totalPages)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(delay)
  }, [page, search, sortField, sortDir])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(1)
  }

  const renderSortIndicator = (field: string) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="p-3 border-b shrink-0 flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por SKU, Descrição ou Acabamento..."
            className="pl-8 w-full h-8 text-sm"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
          {loading && (
            <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button onClick={onAddNew} size="sm" className="whitespace-nowrap h-8 rounded-full px-4">
          <Plus className="h-4 w-4 mr-1" /> Novo Item
        </Button>
      </div>
      <div className="flex-1 overflow-auto relative min-h-0">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
            <TableRow className="h-8">
              <TableHead className="w-10 px-2"></TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap text-[11px] px-4"
                onClick={() => handleSort('sku')}
              >
                SKU{renderSortIndicator('sku')}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none w-full min-w-[200px] text-[11px]"
                onClick={() => handleSort('descricao_curta')}
              >
                Descrição Curta{renderSortIndicator('descricao_curta')}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap text-[11px]"
                onClick={() => handleSort('tamanho')}
              >
                Tamanho{renderSortIndicator('tamanho')}
              </TableHead>
              <TableHead className="whitespace-nowrap text-[11px]">Acabamento</TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap text-right text-[11px]"
                onClick={() => handleSort('preco_venda')}
              >
                Preço USD{renderSortIndicator('preco_venda')}
              </TableHead>
              <TableHead className="w-24 text-center text-[11px]">Quantidade</TableHead>
              <TableHead className="w-12 text-right text-[11px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-32">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                    <p className="text-xs">Carregando itens...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-32">
                  <div className="flex flex-col items-center justify-center text-muted-foreground opacity-70">
                    <PackageOpen className="h-8 w-8 mb-2" />
                    <p className="text-xs">Nenhum item encontrado.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const isSelected = selectedItems.some((si) => si.id === item.id)
                const selectedData = selectedItems.find((si) => si.id === item.id)?.data
                const descricao = item.descricao_curta || item.descr_pt || '-'

                return (
                  <TableRow
                    key={item.id}
                    className={cn(isSelected ? 'bg-primary/5' : '', 'group h-10 py-0')}
                  >
                    <TableCell className="px-2">
                      <Checkbox checked={isSelected} onCheckedChange={() => onToggle(item)} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[10px] font-normal px-4 font-mono">
                      {item.sku}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs whitespace-normal min-w-[200px] leading-snug">
                        {item.descricao_extra ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline decoration-dashed underline-offset-2">
                                {descricao}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">
                              {item.descricao_extra}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span>{descricao}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {item.tamanho || '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {item.expand?.acabamento_id ? (
                        <Badge
                          style={{
                            backgroundColor: item.expand.acabamento_id.cor_hex || '#e2e8f0',
                            color: getContrastColor(item.expand.acabamento_id.cor_hex || '#e2e8f0'),
                          }}
                          className="whitespace-nowrap border-0 shadow-none font-medium px-2 py-0 h-5 text-[10px] rounded-full"
                        >
                          {item.expand.acabamento_id.nome_pt}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-xs">
                      {item.preco_venda ? `$${item.preco_venda.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-center py-1">
                      {isSelected ? (
                        <Input
                          type="number"
                          lang="en-US"
                          step="0.01"
                          min="1"
                          placeholder="Qtde"
                          className={cn(
                            'h-7 w-16 text-center mx-auto text-xs',
                            !selectedData?.quantidade || Number(selectedData.quantidade) <= 0
                              ? 'border-destructive focus-visible:ring-destructive'
                              : '',
                          )}
                          value={selectedData?.quantidade ?? ''}
                          onChange={(e) =>
                            onUpdateItem(item.id, 'quantidade', e.target.value.replace(/,/g, '.'))
                          }
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:text-primary opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        onClick={() => onDuplicate(item)}
                        title="Duplicar Item"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="p-3 border-t flex items-center justify-between bg-slate-50 shrink-0">
        <div className="text-xs text-muted-foreground">
          Página {page} de {totalPages || 1}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  )
}
