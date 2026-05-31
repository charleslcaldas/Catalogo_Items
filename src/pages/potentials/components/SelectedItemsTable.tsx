import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SelectedItemData } from '../AddItemsToPotential'

interface SelectedItemsTableProps {
  selectedItems: Map<string, SelectedItemData>
  handleUpdateItem: (id: string, field: keyof SelectedItemData, value: string) => void
  handleRemoveItem: (id: string) => void
  setIsSelecting: (selecting: boolean) => void
}

export function SelectedItemsTable({
  selectedItems,
  handleUpdateItem,
  handleRemoveItem,
  setIsSelecting,
}: SelectedItemsTableProps) {
  const items = Array.from(selectedItems.entries())

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground bg-white">
        <p className="mb-4">Nenhum item selecionado para esta cotação.</p>
        <Button variant="outline" onClick={() => setIsSelecting(true)}>
          Adicionar Itens
        </Button>
      </div>
    )
  }

  const formatCurrency = (value: number | '') => {
    if (value === '') return '-'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value))
  }

  return (
    <div className="flex-1 overflow-auto bg-white">
      <Table>
        <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
          <TableRow className="h-10">
            <TableHead className="w-24 text-xs">SKU</TableHead>
            <TableHead className="min-w-[200px] w-full text-xs">Descrição Curta</TableHead>
            <TableHead className="w-24 text-xs">Tamanho</TableHead>
            <TableHead className="w-32 text-xs">Acabamento</TableHead>
            <TableHead className="w-24 text-xs">Quant.</TableHead>
            <TableHead className="w-20 text-xs">Unidade</TableHead>
            <TableHead className="w-32 text-xs">Preço Unit.</TableHead>
            <TableHead className="w-32 text-xs">Total</TableHead>
            <TableHead className="w-12 text-center text-xs">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(([id, data]) => {
            const total =
              typeof data.quantidade === 'number' && typeof data.preco_unitario === 'number'
                ? data.quantidade * data.preco_unitario
                : 0

            const acabamento = data.item.expand?.acabamento_id
            const descricao = data.item.descricao_curta || data.item.descr_pt || '-'

            return (
              <TableRow key={id} className="h-12 py-1">
                <TableCell className="py-2 text-sm font-medium">{data.item.sku || '-'}</TableCell>
                <TableCell className="py-2 text-sm truncate max-w-xs" title={descricao}>
                  {descricao}
                </TableCell>
                <TableCell className="py-2 text-sm">{data.item.tamanho || '-'}</TableCell>
                <TableCell className="py-2 text-sm">
                  {acabamento ? (
                    <div className="flex items-center gap-2">
                      {acabamento.cor_hex && (
                        <div
                          className="w-3 h-3 rounded-full border shadow-sm shrink-0"
                          style={{ backgroundColor: acabamento.cor_hex }}
                          title={acabamento.nome_pt}
                        />
                      )}
                      <span className="truncate max-w-[80px]" title={acabamento.nome_pt}>
                        {acabamento.nome_pt}
                      </span>
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="py-2">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    className="h-8 w-20 px-2 text-right"
                    value={data.quantidade}
                    onChange={(e) => handleUpdateItem(id, 'quantidade', e.target.value)}
                  />
                </TableCell>
                <TableCell className="py-2 text-sm text-center">
                  {data.unidade_medida || '-'}
                </TableCell>
                <TableCell className="py-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1.5 text-muted-foreground text-sm">
                      R$
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-8 w-24 pl-8 pr-2 text-right"
                      value={data.preco_unitario}
                      onChange={(e) => handleUpdateItem(id, 'preco_unitario', e.target.value)}
                    />
                  </div>
                </TableCell>
                <TableCell className="py-2 text-sm font-semibold text-right">
                  {formatCurrency(total)}
                </TableCell>
                <TableCell className="py-2 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveItem(id)}
                  >
                    <Trash2 className="h-4 w-4" />
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
