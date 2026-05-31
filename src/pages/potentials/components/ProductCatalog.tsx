import { useState, useEffect } from 'react'
import { Search, Loader2, Plus, Copy, PackageOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { getContrastColor } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Item } from '@/types'
import { getItensPaginated } from '@/services/itens'
import { SelectedItemData } from '../AddItemsToPotential'
import { cn } from '@/lib/utils'

interface ProductCatalogProps {
  selectedItems: Map<string, SelectedItemData>
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
    const delay = setTimeout(() => {
      const sortParam = `${sortDir === 'desc' ? '-' : ''}${sortField}`
      getItensPaginated(page, 20, search, sortParam)
        .then((res) => {
          setItems(res.items)
          setTotalPages(res.totalPages)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
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
      <div className="p-4 border-b shrink-0 flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por SKU, Descrição ou Acabamento..."
            className="pl-8 w-full"
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
        <Button onClick={onAddNew} size="sm" className="whitespace-nowrap">
          <Plus className="h-4 w-4 mr-2" /> Novo Item
        </Button>
      </div>
      <div className="flex-1 overflow-auto relative min-h-0">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort('sku')}
              >
                SKU{renderSortIndicator('sku')}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('descr_pt')}
              >
                Descrição{renderSortIndicator('descr_pt')}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort('tamanho')}
              >
                Tamanho{renderSortIndicator('tamanho')}
              </TableHead>
              <TableHead className="whitespace-nowrap">Acabamento</TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap text-right"
                onClick={() => handleSort('preco_venda')}
              >
                Preço USD{renderSortIndicator('preco_venda')}
              </TableHead>
              <TableHead className="w-28 text-center">Quantidade</TableHead>
              <TableHead className="w-12 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-40">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p>Carregando itens...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-40">
                  <div className="flex flex-col items-center justify-center text-muted-foreground opacity-70">
                    <PackageOpen className="h-10 w-10 mb-2" />
                    <p>Nenhum item encontrado.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const isSelected = selectedItems.has(item.id)
                const selectedData = selectedItems.get(item.id)

                return (
                  <TableRow key={item.id} className={cn(isSelected ? 'bg-primary/5' : '', 'group')}>
                    <TableCell>
                      <Checkbox checked={isSelected} onCheckedChange={() => onToggle(item)} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{item.sku}</TableCell>
                    <TableCell>
                      <div className="text-sm whitespace-normal min-w-[250px] leading-snug">
                        {item.descr_pt || item.descricao_curta || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {item.tamanho || '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {item.expand?.acabamento_id ? (
                        <Badge
                          style={{
                            backgroundColor: item.expand.acabamento_id.cor_hex || '#e2e8f0',
                            color: getContrastColor(item.expand.acabamento_id.cor_hex || '#e2e8f0'),
                          }}
                          className="whitespace-nowrap border-0 shadow-none font-medium"
                        >
                          {item.expand.acabamento_id.nome_pt}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {item.preco_venda ? `$ ${item.preco_venda.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {isSelected ? (
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qtde"
                          className={cn(
                            'h-8 w-20 text-center mx-auto',
                            !selectedData?.quantidade || Number(selectedData.quantidade) <= 0
                              ? 'border-destructive focus-visible:ring-destructive'
                              : '',
                          )}
                          value={selectedData?.quantidade ?? ''}
                          onChange={(e) => onUpdateItem(item.id, 'quantidade', e.target.value)}
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-primary opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        onClick={() => onDuplicate(item)}
                        title="Duplicar Item"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="p-4 border-t flex items-center justify-between bg-slate-50 shrink-0">
        <div className="text-sm text-muted-foreground">
          Página {page} de {totalPages || 1}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
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
