import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useData } from '@/contexts/data-context'
import { ItemFormModal } from './ItemFormModal'
import { Item } from '@/types'

export default function ItemsPage() {
  const { itens, linhas } = useData()
  const [searchTerm, setSearchTerm] = useState('')
  const [editingItem, setEditingItem] = useState<Item | undefined>(undefined)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const filteredItems = itens.filter(
    (item) =>
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descr_pt.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getLinhaName = (id: string) => linhas.find((l) => l.id === id)?.nome_pt || 'N/A'

  const openEdit = (item: Item) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const openNew = () => {
    setEditingItem(undefined)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Itens</h1>
          <p className="text-muted-foreground">Gerencie o catálogo de produtos e sincronização.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Novo Item
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Filtrar itens..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Foto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Descrição (PT)</TableHead>
              <TableHead>Linha</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum item encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  className={
                    !item.sincronizado_com_zoho ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                  }
                >
                  <TableCell>
                    <img
                      src={item.foto_url}
                      alt={item.sku}
                      className="w-10 h-10 rounded object-cover border"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.sku}</TableCell>
                  <TableCell>{item.descr_pt}</TableCell>
                  <TableCell>{getLinhaName(item.linha_id)}</TableCell>
                  <TableCell>
                    {item.sincronizado_com_zoho ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200"
                      >
                        Sincronizado
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200"
                      >
                        Pendente Sync
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ItemFormModal open={isModalOpen} onOpenChange={setIsModalOpen} item={editingItem} />
    </div>
  )
}
