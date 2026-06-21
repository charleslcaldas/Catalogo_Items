import { Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { SelectedItemRecord, SelectedItemData } from '../AddItemsToPotential'
import pb from '@/lib/pocketbase/client'

interface SelectedItemsTableProps {
  selectedItems: SelectedItemRecord[]
  handleUpdateItem: (id: string, field: keyof SelectedItemData, value: string) => void
  handleRemoveItem: (id: string) => void
  handleMoveUp: (index: number) => void
  handleMoveDown: (index: number) => void
  setIsSelecting: (selecting: boolean) => void
}

export function SelectedItemsTable({
  selectedItems,
  handleUpdateItem,
  handleRemoveItem,
  handleMoveUp,
  handleMoveDown,
  setIsSelecting,
}: SelectedItemsTableProps) {
  if (selectedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground bg-white">
        <p className="mb-3 text-sm">Nenhum item selecionado para esta cotação.</p>
        <Button variant="outline" size="sm" onClick={() => setIsSelecting(true)}>
          Adicionar Itens
        </Button>
      </div>
    )
  }

  const formatCurrency = (value: number | '') => {
    if (value === '') return '-'
    const num = Number(value)
    return isNaN(num) ? '-' : `$ ${num.toFixed(2)}`
  }

  const handleQuantityBlur = async (id: string, quantidade: string | number) => {
    // Only attempt auto-save if id is a saved PocketBase record (15 chars)
    if (id && id.length === 15) {
      try {
        await pb.collection('potencial_itens').update(id, { quantidade: Number(quantidade) || 0 })
      } catch (err) {
        console.error('Auto-save quantity failed', err)
      }
    }
  }

  const handlePriceBlur = async (id: string, preco: string | number) => {
    if (id && id.length === 15) {
      try {
        await pb.collection('potencial_itens').update(id, { preco_unitario: Number(preco) || 0 })
      } catch (err) {
        console.error('Auto-save price failed', err)
      }
    }
  }

  const grandTotal = selectedItems.reduce((acc, record) => {
    const q = Number(record.data.quantidade) || 0
    const p = Number(record.data.preco_unitario) || 0
    return acc + q * p
  }, 0)

  return (
    <div className="flex-1 overflow-auto bg-white">
      <Table className="w-full">
        <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
          <TableRow className="h-8">
            <TableHead className="w-10 px-1"></TableHead>
            <TableHead className="w-24 text-[11px] px-4">SKU</TableHead>
            <TableHead className="w-auto text-[11px]">Descrição Curta</TableHead>
            <TableHead className="w-20 text-[11px]">Tamanho</TableHead>
            <TableHead className="w-24 text-[11px]">Acabamento</TableHead>
            <TableHead className="w-16 text-[11px] text-center">Unidade</TableHead>
            <TableHead className="w-24 text-[11px]">Quant.</TableHead>
            <TableHead className="w-28 text-[11px]">Preço Unit.</TableHead>
            <TableHead className="w-24 text-[11px] text-right">Total</TableHead>
            <TableHead className="w-10 text-center text-[11px]">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {selectedItems.map((record, index) => {
            const { id, data } = record
            const total =
              typeof data.quantidade === 'number' && typeof data.preco_unitario === 'number'
                ? data.quantidade * data.preco_unitario
                : 0

            const acabamento = data.item.expand?.acabamento_id
            const descricao = data.item.descricao_curta || data.item.descr_pt || '-'

            return (
              <TableRow key={id} className="h-10 py-0 group">
                <TableCell className="px-1 py-1 w-10 align-middle">
                  <div className="flex flex-col gap-0 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === selectedItems.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="py-1 text-[10px] font-normal px-4 font-mono whitespace-nowrap">
                  {data.item.sku || '-'}
                </TableCell>
                <TableCell className="py-1 text-[11px] whitespace-normal leading-tight">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          data.item.descricao_extra
                            ? 'cursor-help underline decoration-dashed underline-offset-2'
                            : 'cursor-default',
                        )}
                      >
                        {descricao}
                      </span>
                    </TooltipTrigger>
                    {data.item.descricao_extra && (
                      <TooltipContent className="max-w-xs text-xs">
                        {data.item.descricao_extra}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TableCell>
                <TableCell className="py-1 text-[11px] whitespace-nowrap">
                  {data.item.tamanho || '-'}
                </TableCell>
                <TableCell className="py-1 text-xs">
                  {acabamento ? (
                    <Badge
                      style={{
                        backgroundColor: acabamento.cor_hex || '#e2e8f0',
                        color: getContrastColor(acabamento.cor_hex || '#e2e8f0'),
                      }}
                      className="whitespace-nowrap border-0 shadow-none font-medium px-2 py-0 h-5 text-[10px] rounded-full"
                    >
                      {acabamento.nome_pt}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="py-1 text-xs text-center text-muted-foreground bg-slate-50/50">
                  {data.item.unidade || '-'}
                </TableCell>
                <TableCell className="py-1">
                  <Input
                    type="number"
                    min="0"
                    lang="en-US"
                    step="0.01"
                    className="h-7 w-20 px-2 text-right text-xs bg-white"
                    value={data.quantidade}
                    onChange={(e) => {
                      const val = e.target.value.replace(/,/g, '.')
                      if (Number(val) < 0) return
                      handleUpdateItem(id, 'quantidade', val)
                    }}
                    onBlur={() => handleQuantityBlur(id, data.quantidade)}
                  />
                </TableCell>
                <TableCell className="py-1">
                  <div className="relative">
                    <span className="absolute left-2 top-1.5 text-muted-foreground text-[10px] font-medium">
                      $
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="h-7 w-24 pl-5 pr-2 text-right text-xs bg-white"
                      value={String(data.preco_unitario).replace(/,/g, '.')}
                      onChange={(e) => {
                        const val = e.target.value.replace(/,/g, '.')
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          handleUpdateItem(id, 'preco_unitario', val)
                        }
                      }}
                      onBlur={(e) => {
                        let parsed = parseFloat(String(data.preco_unitario).replace(/,/g, '.'))
                        if (isNaN(parsed)) parsed = 0
                        handleUpdateItem(id, 'preco_unitario', parsed.toFixed(2))
                        handlePriceBlur(id, parsed)
                      }}
                    />
                  </div>
                </TableCell>
                <TableCell className="py-1 text-xs font-semibold text-right whitespace-nowrap">
                  {formatCurrency(total)}
                </TableCell>
                <TableCell className="py-1 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveItem(id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-t-2">
            <TableCell
              colSpan={8}
              className="py-2 text-xs font-bold text-right text-muted-foreground uppercase tracking-wider"
            >
              Valor Total Geral
            </TableCell>
            <TableCell className="py-2 text-sm font-bold text-right text-primary whitespace-nowrap">
              {formatCurrency(grandTotal)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
