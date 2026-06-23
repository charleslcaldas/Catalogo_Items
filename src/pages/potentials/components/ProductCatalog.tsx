import { useState, useMemo, useEffect } from 'react'
import { Search, Plus, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { cn, getContrastColor } from '@/lib/utils'
import type { Item } from '@/types'
import type { SelectedItemRecord } from '../AddItemsToPotential'
import pb from '@/lib/pocketbase/client'
import type { UnidadeMedida } from '@/types'

interface ProductCatalogProps {
  selectedItems: SelectedItemRecord[]
  onToggle: (item: Item) => void
  onUpdateItem: (id: string, field: string, value: any) => void
  onAddNew: () => void
  onDuplicate: (item: Item) => void
}

export function ProductCatalog({
  selectedItems,
  onToggle,
  onAddNew,
  onUpdateItem,
}: ProductCatalogProps) {
  const { itens, linhas, categorias, ncms, descricoesBase, acabamentos } = useData()
  const [searchTerm, setSearchTerm] = useState('')
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([])

  useEffect(() => {
    pb.collection('unidades_medida')
      .getFullList<UnidadeMedida>()
      .then(setUnidades)
      .catch(console.error)
  }, [])

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return itens.filter((i) => i.ativo)

    const term = searchTerm
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    const tokens = term.split(/\s+/).filter(Boolean)

    const getLinhaName = (id: string) => linhas.find((l) => l.id === id)?.nome_pt || ''
    const getCategoriaName = (linhaId: string) => {
      const linha = linhas.find((l) => l.id === linhaId)
      if (!linha) return ''
      return categorias.find((c) => c.id === linha.categoria_id)?.nome_pt || ''
    }
    const getNcmCode = (id?: string) => ncms.find((n) => n.id === id)?.codigo || ''
    const getDescricaoBasePt = (id?: string) =>
      descricoesBase.find((d) => d.id === id)?.nome_pt || ''

    return itens.filter((item) => {
      if (!item.ativo) return false

      const aca = acabamentos.find((a) => a.id === item.acabamento_id)
      const acaInfo = aca ? `${aca.nome_pt} ${aca.nome_en || ''} ${aca.codigo}` : ''

      const text = [
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
        acaInfo,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

      return tokens.every((token) => text.includes(token))
    })
  }, [itens, searchTerm, acabamentos])

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="p-3 border-b flex items-center gap-3 bg-slate-50/50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por SKU, Descrição, Tamanho ou Acabamento..."
            className="pl-8 h-8 text-xs rounded-full bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>
        <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={onAddNew}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo Item
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
            <TableRow className="h-8">
              <TableHead className="w-10 px-2 text-center">Ação</TableHead>
              <TableHead className="w-12 px-2 text-center">Foto</TableHead>
              <TableHead className="w-48 text-[11px] px-2">SKU</TableHead>
              <TableHead className="text-[11px] px-2">Descrição</TableHead>
              <TableHead className="w-24 text-[11px] px-2">Tamanho</TableHead>
              <TableHead className="w-32 text-[11px] px-2">Acabamento</TableHead>
              <TableHead className="w-20 text-[11px] px-2">Unidade</TableHead>
              <TableHead className="w-24 text-[11px] px-2 text-center">Quantidade</TableHead>
              <TableHead className="w-24 text-[11px] px-2">Preço</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => {
              const selectedItem = selectedItems.find((si) => si.id === item.id)
              const isSelected = !!selectedItem
              const aca = acabamentos.find((a) => a.id === item.acabamento_id)
              const desc = item.descricao_curta || item.descr_pt || '-'
              const unidadeObj = unidades.find((u) => u.id === item.unidade_id)
              const unidadeNome = unidadeObj ? unidadeObj.nome : item.unidade || '-'

              return (
                <TableRow
                  key={item.id}
                  className={cn('h-10 py-0 cursor-pointer', isSelected && 'bg-blue-50/50')}
                  onClick={() => onToggle(item)}
                >
                  <TableCell className="px-2 text-center">
                    {isSelected ? (
                      <Check className="h-4 w-4 text-primary mx-auto" />
                    ) : (
                      <div className="h-4 w-4 border rounded-sm mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-center">
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
                  <TableCell className="py-1 px-2 text-[11px] font-mono whitespace-nowrap">
                    {item.sku}
                  </TableCell>
                  <TableCell className="py-1 px-2 text-[11px] leading-tight max-w-[250px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            item.descricao_extra
                              ? 'cursor-help underline decoration-dashed underline-offset-2'
                              : 'cursor-default',
                          )}
                        >
                          {desc}
                        </span>
                      </TooltipTrigger>
                      {item.descricao_extra && (
                        <TooltipContent className="max-w-xs text-xs">
                          {item.descricao_extra}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TableCell>
                  <TableCell className="py-1 px-2 text-[11px] whitespace-nowrap">
                    {item.tamanho || '-'}
                  </TableCell>
                  <TableCell className="py-1 px-2 text-[11px]">
                    {aca ? (
                      <Badge
                        style={{
                          backgroundColor: aca.cor_hex || '#e2e8f0',
                          color: getContrastColor(aca.cor_hex || '#e2e8f0'),
                        }}
                        className="whitespace-nowrap border-0 shadow-none font-medium px-2 py-0 h-5 text-[10px] rounded-full"
                      >
                        {aca.nome_pt}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="py-1 px-2 text-[11px] whitespace-nowrap">
                    {unidadeNome}
                  </TableCell>
                  <TableCell className="py-1 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <Input
                      type="text"
                      inputMode="numeric"
                      disabled={!isSelected}
                      value={selectedItem ? selectedItem.data.quantidade : ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '')
                        onUpdateItem(item.id, 'quantidade', val)
                      }}
                      className="h-7 w-16 text-xs text-center mx-auto"
                    />
                  </TableCell>
                  <TableCell className="py-1 px-2 text-[11px] whitespace-nowrap">
                    {typeof item.preco_venda === 'number'
                      ? `$ ${item.preco_venda.toFixed(2)}`
                      : '-'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
