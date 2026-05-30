import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Layers, PackageOpen, FilterX } from 'lucide-react'
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
import { useData } from '@/contexts/data-context'
import { ItemDetailPanel } from './ItemDetailPanel'
import { BulkEditDialog } from './BulkEditDialog'
import { useSearchParams, useNavigate } from 'react-router-dom'
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
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-black/10 shadow-sm whitespace-nowrap"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {aca.nome_pt}
    </span>
  )
}

export default function ItemsPage() {
  const { itens, linhas, categorias, ncms, descricoesBase, acabamentos } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const filterStatus = searchParams.get('status')
  const filterLinhaId = searchParams.get('linha_id')
  const filterDate = searchParams.get('date')

  const [searchTerm, setSearchTerm] = useState('')
  const selectedItemId = searchParams.get('itemId')
  const setSelectedItemId = (id: string | null) => {
    const newParams = new URLSearchParams(searchParams)
    if (id) newParams.set('itemId', id)
    else newParams.delete('itemId')
    setSearchParams(newParams)
  }
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
    if (item.descricao_curta) return item.descricao_curta
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
      if (filterLinhaId && item.linha_id !== filterLinhaId) return false

      if (filterDate) {
        const itemDate = new Date(item.created).toISOString().split('T')[0]
        if (itemDate !== filterDate) return false
      }

      if (!searchTerm.trim()) return true
      const normalizedTerm = searchTerm
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      const tokens = normalizedTerm.split(/\s+/).filter(Boolean)
      if (tokens.length === 0) return true

      const getAcabamentoInfo = (id?: string) => {
        const aca = acabamentos.find((a) => a.id === id)
        return aca ? `${aca.nome_pt} ${aca.nome_en || ''} ${aca.codigo}` : ''
      }

      const searchableText = [
        item.sku,
        item.descr_pt,
        item.descr_en,
        getDescricaoBasePt(item.descricao_base_id),
        item.descricao_curta,
        item.descricao_curta_en,
        item.descricao_base_pt,
        item.classe_material,
        item.tipo_rosca,
        item.norma,
        item.informacao_extra,
        item.tamanho,
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

      return tokens.every((token) => searchableText.includes(token))
    })
  }, [
    itens,
    searchTerm,
    filterStatus,
    filterLinhaId,
    linhas,
    categorias,
    ncms,
    descricoesBase,
    acabamentos,
  ])

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
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Catálogo de Itens</h1>
              {(filterLinhaId || filterDate) && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams)
                    newParams.delete('linha_id')
                    newParams.delete('date')
                    setSearchParams(newParams)
                  }}
                >
                  <FilterX className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              )}
            </div>
            <p className="text-muted-foreground">
              {filterLinhaId
                ? `Mostrando itens da linha: ${linhas.find((l) => l.id === filterLinhaId)?.nome_pt || 'Desconhecida'}`
                : 'Gerencie os produtos do seu catálogo.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar item..."
                className="pl-9 w-full rounded-full bg-card"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <Input
                type="date"
                title="Filtrar por Data de Cadastro"
                className="w-full sm:w-auto rounded-full bg-card px-3 py-2 text-sm text-muted-foreground min-h-[40px]"
                value={filterDate || ''}
                onChange={(e) => {
                  const newParams = new URLSearchParams(searchParams)
                  if (e.target.value) newParams.set('date', e.target.value)
                  else newParams.delete('date')
                  setSearchParams(newParams)
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setSelectedItemId('new')}>
            <Plus className="mr-2 h-4 w-4" /> Novo Item
          </Button>
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
              <TableRow className="h-8">
                <TableHead className="w-10 text-center px-2">
                  <Checkbox
                    checked={
                      selectedItemIds.size > 0 && selectedItemIds.size === filteredItems.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-12 text-center px-2">Foto</TableHead>
                <TableHead className="px-2">SKU</TableHead>
                <TableHead className="px-2">Descrição Curta</TableHead>
                <TableHead className="px-2">Tamanho</TableHead>
                <TableHead className="px-2">Acab.</TableHead>
                {!selectedItemId && (
                  <>
                    <TableHead className="px-2">Preço Venda</TableHead>
                    <TableHead className="px-2">Status</TableHead>
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
                        isRowActive && 'bg-primary/10 hover:bg-primary/15',
                      )}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      {' '}
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
                          src={
                            item.foto_arquivo
                              ? pb.files.getURL(item, item.foto_arquivo, { thumb: '100x100' })
                              : item.foto_url || 'https://img.usecurling.com/p/100/100?q=tools'
                          }
                          alt={item.sku}
                          className="w-6 h-6 rounded object-cover border bg-muted mx-auto"
                        />
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap py-1 px-2 text-sm">
                        {item.sku}
                      </TableCell>
                      <TableCell className={cn('py-1 px-2 text-sm max-w-[200px]')}>
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
                              {getDescricaoCurta(item)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            align="start"
                            className="max-w-xs break-words"
                          >
                            <p>{getDescricaoCurta(item)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-1 px-2 text-sm">
                        {item.tamanho || '-'}
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <AcabamentoBadge acabamentoId={item.acabamento_id} />
                      </TableCell>
                      {!selectedItemId && (
                        <>
                          <TableCell className="whitespace-nowrap py-1 px-2 text-sm">
                            {typeof item.preco_venda === 'number'
                              ? `$ ${item.preco_venda.toFixed(2)}`
                              : '-'}
                          </TableCell>
                          <TableCell className="py-1 px-2">
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
