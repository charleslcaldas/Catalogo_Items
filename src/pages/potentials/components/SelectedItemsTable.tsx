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
    return `$${Number(value).toFixed(2)}`
  }

  return (
    <div className="flex-1 overflow-auto bg-white">
      <Table>
        <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
          <TableRow className="h-8">
            <TableHead className="w-10 px-1"></TableHead>
            <TableHead className="w-48 text-[11px] px-4">SKU</TableHead>
            <TableHead className="min-w-[200px] w-full text-[11px]">Descrição Curta</TableHead>
            <TableHead className="w-24 text-[11px]">Tamanho</TableHead>
            <TableHead className="w-32 text-[11px]">Acabamento</TableHead>
            <TableHead className="w-20 text-[11px] text-center">Unidade</TableHead>
            <TableHead className="w-20 text-[11px]">Quant.</TableHead>
            <TableHead className="w-28 text-[11px]">Preço Unit.</TableHead>
            <TableHead className="w-28 text-[11px] text-right">Total</TableHead>
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
                <TableCell className="py-1 text-[11px] whitespace-normal min-w-[200px] leading-tight">
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
                    lang="en-US"
                    step="0.01"
                    className="h-7 w-16 px-2 text-right text-xs bg-white"
                    value={data.quantidade}
                    onChange={(e) =>
                      handleUpdateItem(id, 'quantidade', e.target.value.replace(/,/g, '.'))
                    }
                  />
                </TableCell>
                <TableCell className="py-1">
                  <div className="relative">
                    <span className="absolute left-2 top-1.5 text-muted-foreground text-[10px] font-medium">
                      $
                    </span>
                    <Input
                      type="number"
                      lang="en-US"
                      step="0.01"
                      className="h-7 w-20 pl-5 pr-2 text-right text-xs bg-white"
                      value={data.preco_unitario}
                      onChange={(e) =>
                        handleUpdateItem(id, 'preco_unitario', e.target.value.replace(/,/g, '.'))
                      }
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
        </TableBody>
      </Table>
    </div>
  )
}
