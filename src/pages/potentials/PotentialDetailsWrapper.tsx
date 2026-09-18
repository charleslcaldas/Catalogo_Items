import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AddItemsToPotential, { AddItemsToPotentialRef } from './AddItemsToPotential'
import QuotationMatrix from './components/QuotationMatrix'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function PotentialDetailsWrapper() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('items')
  const addItemsRef = useRef<AddItemsToPotentialRef>(null)
  const [globalMargin, setGlobalMargin] = useState('7.5')
  const [realMargin, setRealMargin] = useState<number | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const potencialId =
    searchParams.get('id') || searchParams.get('potencialId') || searchParams.get('potencial_id')

  const handleTabChange = async (v: string) => {
    setTab(v)
    if (v === 'items' && addItemsRef.current?.reloadQuotationConditions) {
      await addItemsRef.current.reloadQuotationConditions()
    }
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
        const p = typeof item.referencia_preco === 'number' ? item.referencia_preco : 0
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
  }, [potencialId])

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
        expand: 'item_id.linha_id',
      })
      const promises = items.map((item) => {
        const cost = typeof item.referencia_preco === 'number' ? item.referencia_preco : 0
        const salePrice = cost > 0 ? cost / (1 - margin / 100) : item.preco_unitario
        return pb.collection('potencial_itens').update(item.id, { preco_unitario: salePrice })
      })
      await Promise.all(promises)
      if (addItemsRef.current) {
        await addItemsRef.current.reloadItemsPrices()
      }
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
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs gap-1.5 font-medium shadow-xs"
            onClick={() => {
              if (addItemsRef.current?.isDirty && addItemsRef.current.isDirty()) {
                setShowUnsavedDialog(true)
                return
              }
              navigate('/potenciais')
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Button>

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
        </div>

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
                onBlur={applyGlobalMargin}
                onKeyDown={(e) => e.key === 'Enter' && applyGlobalMargin()}
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
              {isApplying ? 'Aplicando...' : 'Aplicar Margem Global'}
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
          <AddItemsToPotential ref={addItemsRef} />
        </div>
        <div
          className={cn(
            'absolute inset-0 overflow-auto p-6 bg-muted/20',
            tab === 'quotations' ? 'block' : 'hidden',
          )}
        >
          <QuotationMatrix
            onAccepted={async () => {
              if (addItemsRef.current) {
                await addItemsRef.current.reloadItemsPrices()
                if (addItemsRef.current.reloadQuotationConditions) {
                  await addItemsRef.current.reloadQuotationConditions()
                }
              }
              loadTotals()
            }}
          />
        </div>
      </div>
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente sair e descartar as alterações feitas nesta cotação? Todas as
              modificações não salvas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setShowUnsavedDialog(false)
                navigate('/potenciais')
              }}
            >
              Descartar alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
