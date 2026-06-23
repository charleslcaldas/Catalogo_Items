import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AddItemsToPotential from './AddItemsToPotential'
import QuotationMatrix from './components/QuotationMatrix'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export default function PotentialDetailsWrapper() {
  const [tab, setTab] = useState('items')
  const [itemsKey, setItemsKey] = useState(Date.now())
  const [globalMargin, setGlobalMargin] = useState('7.5')
  const [realMargin, setRealMargin] = useState<number | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const potencialId =
    searchParams.get('id') || searchParams.get('potencialId') || searchParams.get('potencial_id')

  const handleTabChange = (v: string) => {
    setTab(v)
    if (v === 'items') setItemsKey(Date.now())
  }

  const loadTotals = async () => {
    if (!potencialId) return
    try {
      const items = await pb.collection('potencial_itens').getFullList({
        filter: `potencial_id="${potencialId}"`,
        expand: 'item_id',
      })
      let totalPurchase = 0
      let totalSale = 0
      items.forEach((item) => {
        const q = item.quantidade || 0
        const p = item.referencia_preco ?? (item.expand?.item_id?.preco_compra || 0)
        const v = item.preco_unitario || 0
        totalPurchase += q * p
        totalSale += q * v
      })
      if (totalSale > 0) {
        setRealMargin((1 - totalPurchase / totalSale) * 100)
      } else {
        setRealMargin(null)
      }
    } catch (err) {
      console.error('Failed to load totals', err)
    }
  }

  useEffect(() => {
    loadTotals()
  }, [potencialId, itemsKey])

  useRealtime('potencial_itens', loadTotals)
  useRealtime('itens', loadTotals)

  const applyGlobalMargin = async () => {
    if (!potencialId) return
    const margin = parseFloat(globalMargin)
    if (isNaN(margin) || margin >= 100 || margin < 0) {
      toast({ title: 'Margem inválida', variant: 'destructive' })
      return
    }
    try {
      setIsApplying(true)
      const items = await pb.collection('potencial_itens').getFullList({
        filter: `potencial_id="${potencialId}"`,
        expand: 'item_id',
      })
      const promises = items.map((item) => {
        const cost = item.referencia_preco ?? (item.expand?.item_id?.preco_compra || 0)
        const salePrice = cost / (1 - margin / 100)
        return pb.collection('potencial_itens').update(item.id, { preco_unitario: salePrice })
      })
      await Promise.all(promises)
      setItemsKey(Date.now())
      loadTotals()
      toast({ title: `Margem de ${margin}% aplicada a ${items.length} itens.` })
    } catch (err: any) {
      toast({ title: 'Erro ao aplicar margem', description: err.message, variant: 'destructive' })
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-background relative z-0">
      <div className="px-6 pt-4 border-b flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <Tabs value={tab} onValueChange={handleTabChange} className="w-auto">
          <TabsList className="mb-[-1px] bg-muted/40 p-1">
            <TabsTrigger
              value="items"
              className="rounded-b-none px-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Itens do Potencial
            </TabsTrigger>
            <TabsTrigger
              value="quotations"
              className="rounded-b-none px-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Cotação de Fabricantes
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === 'items' && (
          <div className="flex items-center gap-3 mb-2 bg-muted/20 p-1.5 px-3 rounded-md border shadow-sm">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Inside Margin Global
            </Label>
            <div className="flex items-center gap-1">
              <Input
                type="text"
                inputMode="decimal"
                value={globalMargin}
                onChange={(e) => {
                  const val = e.target.value.replace(/,/g, '.')
                  if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                    setGlobalMargin(val)
                  }
                }}
                className="w-20 h-7 text-xs text-right font-mono bg-background"
              />
              <span className="text-xs text-muted-foreground font-semibold">%</span>
            </div>
            <Button
              size="sm"
              className="h-7 text-xs px-3"
              onClick={applyGlobalMargin}
              disabled={isApplying}
            >
              {isApplying ? 'Aplicando...' : 'Aplicar a Todos'}
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Margem Real Calculada
            </Label>
            <div className="flex items-center gap-1">
              <div className="h-7 px-3 flex items-center justify-end bg-background border rounded-md text-xs font-mono text-muted-foreground min-w-[4rem]">
                {realMargin !== null ? realMargin.toFixed(3) : '0.000'}
              </div>
              <span className="text-xs text-muted-foreground font-semibold">%</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div className={cn('absolute inset-0 overflow-auto', tab === 'items' ? 'block' : 'hidden')}>
          <AddItemsToPotential key={itemsKey} />
        </div>
        <div
          className={cn(
            'absolute inset-0 overflow-auto p-6 bg-muted/20',
            tab === 'quotations' ? 'block' : 'hidden',
          )}
        >
          <QuotationMatrix />
        </div>
      </div>
    </div>
  )
}
