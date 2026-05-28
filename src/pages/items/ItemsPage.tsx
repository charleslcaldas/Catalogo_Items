import { useState, useMemo } from 'react'
import { Plus, Search, Layers, PackageOpen } from 'lucide-react'
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
import { cn, getContrastColor } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'

function AcabamentoBadge({ acabamentoId }: { acabamentoId?: string }) {
  const { acabamentos } = useData()
  const aca = acabamentos.find((a) => a.id === acabamentoId)
  if (!aca) return <span className="text-muted-foreground">-</span>

  const bgColor = aca.cor_hex || '#e2e8f0'
  const textColor = getContrastColor(bgColor)

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-black/10 shadow-sm"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {aca.nome_pt}
    </span>
  )
}

export default function ItemsPage() {
  const { itens, linhas, categorias, ncms, descricoesBase } = useData()
  const [searchParams] = useSearchParams()

  const filterStatus = searchParams.get('status')
  const filterSyncStatus = searchParams.get('sync_status')

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
  const getNcmCode = (id?: string) => ncms.find((n) => n.id === id)?.codigo || ''
  const getDescricaoBasePt = (id?: string) => descricoesBase.find((d) => d.id === id)?.nome_pt || ''

  const getDescricaoCurta = (item: any) => {
    const descPt = item.descricao_base_id
      ? getDescricaoBasePt(item.descricao_base_id)
      : item.descricao_base_pt
    return (
      [descPt, item.norma, item.classe_material, item.tipo_rosca, item.tamanho]
        .filter(Boolean)
        .join(' ') || '-'
    )
  }

  const filteredItems = useMemo(() => {
    return itens.filter((item) => {
      if (filterStatus === 'Ativo' && !item.ativo) return false
      if (filterSyncStatus === 'Pendente' && item.sincronizado_com_zoho) return false

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
        getDescricaoBasePt(item.descricao_base_id),
        item.descricao_base_pt,
        item.classe_material,
        item.tipo_rosca,
        item.norma,
        item.informacao_extra,
        item.tamanho,
        getLinhaName(item.linha_id),
        getCategoriaName(item.linha_id),
        getNcmCode(item.ncm_id),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

      return tokens.every((token) => searchableText.includes(token))
    })
  }, [itens, searchTerm, filterStatus, filterSyncStatus, linhas, categorias, ncms, descricoesBase])

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
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4 animate-fade-in overflow-hidden relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Itens</h1>
          <p className="text-muted-foreground">Gerencie produtos e sincronização Zoho Books.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setSelectedItemId('new')}>
            <Plus className="mr-2 h-4 w-4" /> Novo Item
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Busca inteligente (ex: m8 sextavado inox)"
            className="pl-10 rounded-full bg-card"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        <div
          className={cn(
            'border rounded-xl bg-card overflow-auto relative transition-all duration-300 shadow-sm',
            selectedItemId ? 'w-[40%] hidden lg:block' : 'w-full',
          )}
        >
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
                <TableHead className="w-[72px] text-center">Foto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Descrição Curta</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Acab.</TableHead>
                {!selectedItemId && (
                  <>
                    <TableHead>Preço Venda</TableHead>
                    <TableHead>Status</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
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
                        isRowActive && 'bg-primary/5 hover:bg-primary/10',
                        !item.sincronizado_com_zoho &&
                          !isRowActive &&
                          'bg-amber-50/30 dark:bg-amber-950/10',
                      )}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <img
                          src={
                            item.foto_arquivo
                              ? pb.files.getURL(item, item.foto_arquivo, { thumb: '100x100' })
                              : item.foto_url || 'https://img.usecurling.com/p/100/100?q=tools'
                          }
                          alt={item.sku}
                          className="w-14 h-14 rounded object-cover border bg-muted mx-auto"
                        />
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{item.sku}</TableCell>

                      <TableCell className="max-w-[200px] truncate" title={getDescricaoCurta(item)}>
                        {getDescricaoCurta(item)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{item.tamanho || '-'}</TableCell>
                      <TableCell>
                        <AcabamentoBadge acabamentoId={item.acabamento_id} />
                      </TableCell>

                      {!selectedItemId && (
                        <>
                          <TableCell className="whitespace-nowrap">
                            {item.preco_venda
                              ? new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'USD',
                                }).format(item.preco_venda)
                              : '-'}
                          </TableCell>
                          <TableCell>
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
            'border rounded-xl bg-card overflow-hidden flex flex-col transition-all duration-300',
            selectedItemId
              ? 'w-full lg:w-[60%] animate-in slide-in-from-right-8'
              : 'w-0 opacity-0 border-0',
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
            <Layers className="w-4 h-4 mr-2" /> Editar em Massa
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
    </div>
  )
}
