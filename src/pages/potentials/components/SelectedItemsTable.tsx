import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, PackageOpen, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SelectedItemData } from '../AddItemsToPotential'

interface SelectedItemsTableProps {
  selectedItems: Map<string, SelectedItemData>
  handleUpdateItem: (id: string, field: keyof SelectedItemData, value: string) => void
  handleRemoveItem: (id: string) => void
  setIsSelecting: (v: boolean) => void
}

export function SelectedItemsTable({
  selectedItems,
  handleUpdateItem,
  handleRemoveItem,
  setIsSelecting,
}: SelectedItemsTableProps) {
  if (selectedItems.size === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-16">
        <PackageOpen className="h-16 w-16 mb-4 opacity-20" />
        <p className="mb-4">Nenhum item adicionado à cotação.</p>
        <Button variant="outline" onClick={() => setIsSelecting(true)}>
          <Plus className="h-4 w-4 mr-2" /> Buscar e Adicionar Itens
        </Button>
      </div>
    )
  }

  const itemsArray = Array.from(selectedItems.values())
  const totalEstimado = itemsArray.reduce(
    (acc, si) => acc + (Number(si.quantidade) || 0) * (Number(si.preco_unitario) || 0),
    0,
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto min-h-[300px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">SKU</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-[150px]">Acabamento</TableHead>
              <TableHead className="w-[120px] text-center">Qtde</TableHead>
              <TableHead className="w-[120px]">Unidade</TableHead>
              <TableHead className="w-[120px] text-right">Preço Unit.</TableHead>
              <TableHead className="w-[120px] text-right">Total</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsArray.map((si) => {
              const item = si.item
              const total = (Number(si.quantidade) || 0) * (Number(si.preco_unitario) || 0)
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.sku}</TableCell>
                  <TableCell>
                    <div className="line-clamp-1">{item.descr_pt}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {item.descr_en}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.expand?.acabamento_id ? item.expand.acabamento_id.nome_pt : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min="1"
                      className={cn(
                        'w-20 h-8 mx-auto text-center',
                        !si.quantidade || Number(si.quantidade) <= 0
                          ? 'border-destructive focus-visible:ring-destructive'
                          : '',
                      )}
                      value={si.quantidade}
                      onChange={(e) => handleUpdateItem(item.id, 'quantidade', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={si.unidade_medida}
                      onValueChange={(v) => handleUpdateItem(item.id, 'unidade_medida', v)}
                    >
                      <SelectTrigger
                        className={cn(
                          'w-[100px] h-8',
                          !si.unidade_medida ? 'border-destructive' : '',
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pcs">Pcs</SelectItem>
                        <SelectItem value="MPC">MPC</SelectItem>
                        <SelectItem value="Centena">Centena</SelectItem>
                        <SelectItem value="Quilo">Quilo</SelectItem>
                        <SelectItem value="Metro">Metro</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      className={cn(
                        'w-24 h-8 ml-auto text-right',
                        si.preco_unitario === '' ? 'border-destructive' : '',
                      )}
                      value={si.preco_unitario}
                      onChange={(e) => handleUpdateItem(item.id, 'preco_unitario', e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium text-primary">
                    $ {total.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(item.id)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
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
      <div className="p-4 border-t bg-slate-50 flex justify-end rounded-b-lg">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground uppercase font-medium">
            Total Estimado
          </span>
          <span className="font-bold text-2xl text-primary">$ {totalEstimado.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
