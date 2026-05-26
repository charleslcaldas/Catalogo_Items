import { useState, useMemo } from 'react'
import { Plus, Search, CheckSquare, Layers } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useData } from '@/contexts/data-context'
import { ItemDetailPanel } from './ItemDetailPanel'
import { BulkEditDialog } from './BulkEditDialog'
import { useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'

export default function ItemsPage() {
  const { itens, linhas, categorias, acabamentos, ncms } = useData()
  const [searchParams] = useSearchParams()

  const filterParam = searchParams.get('filter') || ''
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)

  const getLinhaName = (id: string) => linhas.find((l) => l.id === id)?.nome_pt || 'N/A'
  const getCategoriaName = (linhaId: string) => {
    const linha = linhas.find((l) => l.id === linhaId)
    if (!linha) return ''
    return categorias.find((c) => c.id === linha.categoria_id)?.nome_pt || ''
  }
  const getAcabamentoName = (id?: string) => acabamentos.find((a) => a.id === id)?.nome_pt || ''
  const getNcmCode = (id?: string) => ncms.find((n) => n.id === id)?.codigo || ''

  const filteredItems = useMemo(() => {
    return itens.filter((item) => {
      if (filterParam === 'ativo' && !item.ativo) return false
      if (filterParam === 'pendente' && item.sincronizado_com_zoho) return false

      if (!searchTerm.trim()) return true
      const normalizedTerm = searchTerm
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      const tokens = normalizedTerm.split(/\s+/).filter(Boolean)
      if (tokens.length === 0) return true

      const searchableText = [
        item.sku,
        item.descr_pt,
        item.descr_en,
        item.descricao_base_pt,
        item.descricao_base_en,
        item.classe_material,
        item.tipo_rosca,
        item.norma,
        item.informacao_extra,
        item.descricao_extra,
        item.tamanho,
        getLinhaName(item.linha_id),
        getCategoriaName(item.linha_id),
        getAcabamentoName(item.acabamento_id),
        getNcmCode(item.ncm_id),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

      return tokens.every((token) => searchableText.includes(token))
    })
  }, [itens, searchTerm, filterParam, linhas, categorias, acabamentos, ncms])

  const selectedItem = itens.find((i) => i.id === selectedItemId)

  const toggleSelectAll = () => {
    if (selectedItemIds.size === filteredItems.length) {
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

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4 animate-fade-in overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Itens</h1>
          <p className="text-muted-foreground">Gerencie o catálogo de produtos e sincronização.</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedItemIds.size > 0 && (
            <Button variant="secondary" onClick={() => setIsBulkEditOpen(true)}>
              <Layers className="mr-2 h-4 w-4" /> Editando {selectedItemIds.size} itens
            </Button>
          )}
          <Button onClick={() => setSelectedItemId('new')}>
            <Plus className="mr-2 h-4 w-4" /> Novo Item
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por tokens (ex: M8 sextavado)"
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 border rounded-xl bg-card overflow-auto relative">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-12 text-center">
                  <Checkbox
                    checked={
                      selectedItemIds.size > 0 && selectedItemIds.size === filteredItems.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-16">Foto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Descrição (PT)</TableHead>
                <TableHead>Linha</TableHead>
                <TableHead>Status</TableHead>
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
                filteredItems.map((item) => {
                  const isSelected = selectedItemIds.has(item.id)
                  const isRowActive = selectedItemId === item.id
                  return (
                    <TableRow
                      key={item.id}
                      className={`cursor-pointer transition-colors ${isRowActive ? 'bg-primary/10 hover:bg-primary/15' : !item.sincronizado_com_zoho ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}`}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <img
                          src={
                            item.foto_arquivo
                              ? pb.files.getURL(item, item.foto_arquivo, { thumb: '100x100' })
                              : item.foto_url || 'https://img.usecurling.com/p/100/100?q=tools'
                          }
                          alt={item.sku}
                          className="w-10 h-10 rounded-md object-cover border"
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
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="w-[30%] min-w-[320px] shrink-0 border rounded-xl bg-card overflow-hidden flex flex-col">
          {selectedItemId ? (
            <ItemDetailPanel
              item={selectedItemId === 'new' ? undefined : selectedItem}
              onClose={() => setSelectedItemId(null)}
              key={selectedItemId}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center space-y-4">
              <CheckSquare className="w-12 h-12 opacity-20" />
              <p>
                Selecione um item na lista para visualizar seus detalhes ou clique em "Novo Item"
                para cadastrar.
              </p>
            </div>
          )}
        </div>
      </div>

      <BulkEditDialog
        open={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        selectedIds={Array.from(selectedItemIds)}
        onSuccess={handleBulkSuccess}
      />
    </div>
  )
}
