import { useState, useEffect } from 'react'
import { Search, Loader2, Plus, Copy, PackageOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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

interface ProductCatalogProps {
  selectedItems: Map<string, SelectedItemData>
  onToggle: (item: Item) => void
  onAddNew: () => void
  onDuplicate: (item: Item) => void
}

export function ProductCatalog({
  selectedItems,
  onToggle,
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
      <div className="p-4 border-b shrink-0 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar (ex: PAR SEX M8)..."
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
      </div>
      <div className="flex-1 overflow-auto relative min-h-0">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-12">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary"
                  onClick={onAddNew}
                  title="Novo Item"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TableHead>
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
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-40">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p>Carregando itens...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-40">
                  <div className="flex flex-col items-center justify-center text-muted-foreground opacity-70">
                    <PackageOpen className="h-10 w-10 mb-2" />
                    <p>Nenhum item encontrado.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className={selectedItems.has(item.id) ? 'bg-primary/5' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => onToggle(item)}
                    />
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{item.sku}</TableCell>
                  <TableCell>
                    <div className="font-medium line-clamp-1" title={item.descr_pt}>
                      {item.descr_pt}
                    </div>
                    <div
                      className="text-xs text-muted-foreground line-clamp-1"
                      title={item.descr_en}
                    >
                      {item.descr_en}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{item.tamanho || '-'}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {item.expand?.acabamento_id
                      ? `${item.expand.acabamento_id.nome_pt} / ${item.expand.acabamento_id.nome_en || item.expand.acabamento_id.nome_pt}`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {item.preco_venda ? `$ ${item.preco_venda.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-primary"
                      onClick={() => onDuplicate(item)}
                      title="Duplicar"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
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
