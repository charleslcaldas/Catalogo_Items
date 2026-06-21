import { useState, useEffect } from 'react'
import { TrendingDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export function CounterProposalModal({ open, onOpenChange, cotacoesI, potencialItens }: any) {
  const { toast } = useToast()
  const [items, setItems] = useState<any[]>([])
  const [action, setAction] = useState('discount')
  const [discountVal, setDiscountVal] = useState('5')

  useEffect(() => {
    if (open) {
      const winners = cotacoesI.filter((c: any) => c.vencedor && c.preco_ofertado > 0)
      const formatted = winners.map((w: any) => {
        const pi = potencialItens.find((p: any) => p.item_id === w.item_id)
        const allPrices = cotacoesI
          .filter((c: any) => c.item_id === w.item_id && c.preco_ofertado > 0)
          .map((c: any) => c.preco_ofertado)
        const bestPrice = allPrices.length > 0 ? Math.min(...allPrices) : w.preco_ofertado

        return {
          id: w.id,
          sku: pi?.expand?.item_id?.sku || 'N/A',
          currentPrice: w.preco_ofertado,
          bestPrice,
          newPrice: w.preco_contraproposta > 0 ? w.preco_contraproposta : w.preco_ofertado,
          selected: true,
        }
      })
      setItems(formatted)
    }
  }, [open, cotacoesI, potencialItens])

  const applyLogic = () => {
    const d = parseFloat(discountVal.replace(',', '.'))
    if (isNaN(d) && action !== 'match_best' && action !== 'manual') return

    setItems((prev) =>
      prev.map((item) => {
        if (!item.selected) return item
        let np = item.newPrice
        if (action === 'discount') {
          np = item.currentPrice * (1 - d / 100)
        } else if (action === 'match_best') {
          np = item.bestPrice
        } else if (action === 'discount_best') {
          np = item.bestPrice * (1 - d / 100)
        }
        return { ...item, newPrice: Number(np.toFixed(4)) }
      }),
    )
  }

  const handleApply = async () => {
    try {
      const promises = items
        .filter((i) => i.selected)
        .map((i) =>
          pb.collection('cotacoes_itens').update(i.id, { preco_contraproposta: i.newPrice }),
        )
      if (promises.length === 0) {
        toast({ title: 'Aviso', description: 'Nenhum item selecionado.' })
        return
      }
      await Promise.all(promises)
      toast({
        title: 'Sucesso',
        description: `${promises.length} itens atualizados na contraproposta.`,
      })
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleSelectAll = (checked: boolean) => {
    setItems((prev) => prev.map((i) => ({ ...i, selected: checked })))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-amber-600" /> Motor de Contraproposta
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-4 bg-muted/50 p-4 rounded-lg mt-2">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <Label>Estratégia</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discount">Desconto sobre o preço vencedor</SelectItem>
                <SelectItem value="match_best">Igualar ao menor preço geral</SelectItem>
                <SelectItem value="discount_best">Desconto sobre o menor preço geral</SelectItem>
                <SelectItem value="manual">Definição Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {action !== 'match_best' && action !== 'manual' && (
            <div className="flex flex-col gap-1.5 w-32">
              <Label>Desconto (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={discountVal}
                onChange={(e) => setDiscountVal(e.target.value)}
              />
            </div>
          )}
          <Button variant="secondary" onClick={applyLogic} disabled={action === 'manual'}>
            Simular
          </Button>
        </div>

        <div className="flex-1 overflow-auto border rounded-md mt-4">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[40px] text-center">
                  <Checkbox
                    checked={items.length > 0 && items.every((i) => i.selected)}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Preço Atual</TableHead>
                <TableHead className="text-right">Menor Oferta</TableHead>
                <TableHead className="text-right w-32 text-amber-600">
                  Alvo (Contraproposta)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum item vencedor selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={(c) => {
                          const next = [...items]
                          next[idx].selected = !!c
                          setItems(next)
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-xs">{item.sku}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      $ {item.currentPrice.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      $ {item.bestPrice.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        className="h-7 text-right text-xs font-mono text-amber-600 font-bold"
                        value={item.newPrice}
                        onChange={(e) => {
                          const next = [...items]
                          next[idx].newPrice = parseFloat(e.target.value) || 0
                          setItems(next)
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply}>
            <Check className="w-4 h-4 mr-2" /> Salvar Target
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
