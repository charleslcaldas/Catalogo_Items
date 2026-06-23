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
import { Badge } from '@/components/ui/badge'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export function CounterProposalModal({
  open,
  onOpenChange,
  cotacoesI,
  potencialItens,
  cotacoesF,
}: any) {
  const { toast } = useToast()
  const [items, setItems] = useState<any[]>([])
  const [action, setAction] = useState('discount')
  const [discountVal, setDiscountVal] = useState('5')
  const [selectedFornecedores, setSelectedFornecedores] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      const allFornecedores = cotacoesF?.map((cf: any) => cf.id) || []
      setSelectedFornecedores(allFornecedores)
    }
  }, [open, cotacoesF])

  useEffect(() => {
    if (open) {
      const targetCotacoes = cotacoesI.filter(
        (c: any) => selectedFornecedores.includes(c.cotacao_fornecedor_id) && c.preco_ofertado > 0,
      )

      const formatted = targetCotacoes.map((w: any) => {
        const pi = potencialItens.find((p: any) => p.item_id === w.item_id)
        const cf = cotacoesF?.find((f: any) => f.id === w.cotacao_fornecedor_id)

        const allPrices = cotacoesI
          .filter((c: any) => c.item_id === w.item_id && c.preco_ofertado > 0)
          .map((c: any) => c.preco_ofertado)
        const bestPrice = allPrices.length > 0 ? Math.min(...allPrices) : w.preco_ofertado

        return {
          id: w.id,
          item_id: w.item_id,
          sku: pi?.expand?.item_id?.sku || 'N/A',
          fornecedor: cf?.expand?.fornecedor_id?.nome || 'Desconhecido',
          currentPrice: w.preco_ofertado,
          bestPrice,
          newPrice: w.preco_contraproposta > 0 ? w.preco_contraproposta : w.preco_ofertado,
          selected: true,
        }
      })
      setItems(formatted)
    }
  }, [open, cotacoesI, potencialItens, selectedFornecedores, cotacoesF])

  const applyLogic = () => {
    const d = parseFloat(discountVal.replace(',', '.'))
    if (isNaN(d) && action !== 'match_best' && action !== 'manual') return

    setItems((prev) =>
      prev.map((item) => {
        if (!item.selected) return item
        let np = item.newPrice
        if (action === 'discount') {
          np = item.currentPrice * (1 - d / 100)
        } else if (action === 'fixed_target') {
          np = Math.max(0, d)
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

  const handleAccept = async (item: any) => {
    try {
      const promises = []
      const finalPrice = item.newPrice

      promises.push(
        pb.collection('cotacoes_itens').update(item.id, {
          preco_ofertado: finalPrice,
          preco_contraproposta: 0,
          vencedor: true,
        }),
      )

      const currentWinners = cotacoesI.filter(
        (c: any) => c.item_id === item.item_id && c.vencedor && c.id !== item.id,
      )
      for (const cw of currentWinners) {
        promises.push(pb.collection('cotacoes_itens').update(cw.id, { vencedor: false }))
      }

      promises.push(pb.collection('itens').update(item.item_id, { preco_compra: finalPrice }))

      const cw = cotacoesI.find((c: any) => c.id === item.id)
      const moq = cw?.quantidade_minima || 0

      const pItems = potencialItens.filter((pi: any) => pi.item_id === item.item_id)
      for (const pi of pItems) {
        const updateData: any = {}
        if (moq > 0 && pi.quantidade < moq) {
          updateData.quantidade = moq
        }
        if (Object.keys(updateData).length > 0) {
          promises.push(pb.collection('potencial_itens').update(pi.id, updateData))
        }
      }

      promises.push(
        pb.collection('historico_precos').create({
          item_id: item.item_id,
          preco: finalPrice,
          fornecedor: item.fornecedor,
          data_cotacao: new Date().toISOString(),
        }),
      )

      await Promise.all(promises)
      toast({
        title: 'Item aceito',
        description: `Preço de compra atualizado para $ ${finalPrice.toFixed(4)}.`,
      })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleAcceptAll = async () => {
    const selectedItems = items.filter((i) => i.selected)
    if (selectedItems.length === 0) return

    try {
      const promises = []
      for (const item of selectedItems) {
        const finalPrice = item.newPrice

        promises.push(
          pb.collection('cotacoes_itens').update(item.id, {
            preco_ofertado: finalPrice,
            preco_contraproposta: 0,
            vencedor: true,
          }),
        )

        const currentWinners = cotacoesI.filter(
          (c: any) => c.item_id === item.item_id && c.vencedor && c.id !== item.id,
        )
        for (const cw of currentWinners) {
          promises.push(pb.collection('cotacoes_itens').update(cw.id, { vencedor: false }))
        }

        promises.push(pb.collection('itens').update(item.item_id, { preco_compra: finalPrice }))

        const cw = cotacoesI.find((c: any) => c.id === item.id)
        const moq = cw?.quantidade_minima || 0

        const pItems = potencialItens.filter((pi: any) => pi.item_id === item.item_id)
        for (const pi of pItems) {
          const updateData: any = {}
          if (moq > 0 && pi.quantidade < moq) {
            updateData.quantidade = moq
          }
          if (Object.keys(updateData).length > 0) {
            promises.push(pb.collection('potencial_itens').update(pi.id, updateData))
          }
        }

        promises.push(
          pb.collection('historico_precos').create({
            item_id: item.item_id,
            preco: finalPrice,
            fornecedor: item.fornecedor,
            data_cotacao: new Date().toISOString(),
          }),
        )
      }
      await Promise.all(promises)
      toast({
        title: 'Sucesso',
        description: `${selectedItems.length} itens aceitos com sucesso.`,
      })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const toggleFornecedor = (cfId: string) => {
    setSelectedFornecedores((prev) =>
      prev.includes(cfId) ? prev.filter((id) => id !== cfId) : [...prev, cfId],
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-amber-600" /> Motor de Contraproposta Global
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 pt-2">
            <Label className="w-full text-xs text-muted-foreground uppercase tracking-wider">
              Fornecedores Alvo
            </Label>
            {cotacoesF?.map((cf: any) => (
              <Badge
                key={cf.id}
                variant={selectedFornecedores.includes(cf.id) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleFornecedor(cf.id)}
              >
                {cf.expand?.fornecedor_id?.nome}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-4 bg-muted/50 p-4 rounded-lg">
            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <Label>Estratégia</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">Desconto (%) s/ o preço atual</SelectItem>
                  <SelectItem value="fixed_target">Preço Alvo Global (Fixo)</SelectItem>
                  <SelectItem value="match_best">Igualar ao Menor Preço Geral</SelectItem>
                  <SelectItem value="discount_best">Desconto (%) s/ o Menor Preço Geral</SelectItem>
                  <SelectItem value="manual">Definição Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {action !== 'match_best' && action !== 'manual' && (
              <div className="flex flex-col gap-1.5 w-32">
                <Label>{action === 'fixed_target' ? 'Preço Alvo ($)' : 'Desconto (%)'}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={discountVal}
                  onChange={(e) => {
                    const val = e.target.value.replace(/,/g, '.')
                    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                      setDiscountVal(val)
                    }
                  }}
                />
              </div>
            )}
            <Button variant="secondary" onClick={applyLogic} disabled={action === 'manual'}>
              Simular em Massa
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto border rounded-md mt-4">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[40px] text-center">
                  <Checkbox
                    checked={items.length > 0 && items.every((i) => i.selected)}
                    onCheckedChange={(c) =>
                      setItems((prev) => prev.map((i) => ({ ...i, selected: !!c })))
                    }
                  />
                </TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Preço Atual</TableHead>
                <TableHead className="text-right">Menor Oferta</TableHead>
                <TableHead className="text-right w-32 text-amber-600">Alvo (C.Proposta)</TableHead>
                <TableHead className="text-center w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum item selecionado para os fabricantes escolhidos.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, idx) => (
                  <TableRow key={`${item.id}-${idx}`}>
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
                    <TableCell className="text-xs text-muted-foreground">
                      {item.fornecedor}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      $ {item.currentPrice.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      $ {item.bestPrice.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="h-7 text-right text-xs font-mono text-amber-600 font-bold"
                        value={item.newPrice}
                        onChange={(e) => {
                          const val = e.target.value.replace(/,/g, '.')
                          if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                            const next = [...items]
                            next[idx].newPrice = val === '' ? 0 : parseFloat(val) || 0
                            setItems(next)
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAccept(item)}
                        className="h-7 text-xs bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200"
                      >
                        Aceitar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleAcceptAll}
            className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200"
          >
            <Check className="w-4 h-4 mr-2" /> Aceitar Selecionados
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApply}>Salvar Target</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
