import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AddItemsToPotential, { AddItemsToPotentialRef } from './AddItemsToPotential'
import QuotationMatrix from './components/QuotationMatrix'
import PendenciasCliente from './components/PendenciasCliente'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { assertSingleCurrency } from '@/lib/money'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { TotaisCotacao } from './AddItemsToPotential'
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
  const [isApplying, setIsApplying] = useState(false)
  // Totais do painel: EXATAMENTE os mesmos números em memória da tabela de
  // itens (AddItemsToPotential → calculateTotals), recebidos via callback —
  // sem reparse de textos formatados e válidos também antes de salvar.
  const [totais, setTotais] = useState<TotaisCotacao>({
    totalCompra: 0,
    totalVenda: 0,
    ganhoBruto: 0,
    margemEfetiva: null,
  })
  const [moeda, setMoeda] = useState('USD')
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

  // Moeda explicitamente detectada nos registros salvos (somente leitura);
  // os VALORES não vêm daqui — vêm da tabela, via handleTotaisChange.
  const loadMoeda = async () => {
    if (!potencialId) return
    try {
      const items = await pb.collection('potencial_itens').getFullList({
        filter: `potencial_id="${potencialId}"`,
        fields: 'moeda_compra',
      })
      // Moeda explícita: nunca somar moedas distintas sem conversão registrada
      try {
        setMoeda(assertSingleCurrency(items.map((i) => i.moeda_compra)))
      } catch {
        setMoeda('MISTAS')
      }
    } catch (err) {
      console.error('Failed to load currency', err)
    }
  }

  useEffect(() => {
    loadMoeda()
  }, [potencialId])

  useRealtime('potencial_itens', loadMoeda)

  const handleTotaisChange = useCallback((t: TotaisCotacao) => {
    setTotais((prev) =>
      prev.totalCompra === t.totalCompra &&
      prev.totalVenda === t.totalVenda &&
      prev.ganhoBruto === t.ganhoBruto &&
      prev.margemEfetiva === t.margemEfetiva
        ? prev
        : t,
    )
  }, [])

  // Mesma formatação do rodapé da tabela (en-US, 2 casas) — cabeçalho e
  // rodapé coincidem caractere a caractere, calculados a partir de números.
  const fmtValor = (v: number) =>
    v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtMargem = (m: number | null) => (m !== null ? `${m.toFixed(2)}%` : '—')

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
        if (cost <= 0) return Promise.resolve(null)
        // Venda = compra / (1 - margem/100), arredondada na precisão da linha
        // (2 ou 3 casas) — o valor salvo é exatamente o exibido.
        const precisao = item.precisao_preco === 3 ? 3 : 2
        const salePrice = Number((cost / (1 - margin / 100)).toFixed(precisao))
        if (!Number.isFinite(salePrice)) return Promise.resolve(null)
        return pb.collection('potencial_itens').update(item.id, { preco_unitario: salePrice })
      })
      await Promise.all(promises)
      if (addItemsRef.current) {
        await addItemsRef.current.reloadItemsPrices()
      }
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
          <div className="flex items-center gap-3 mb-2 bg-muted/20 p-1.5 px-3 rounded-md border shadow-sm flex-wrap">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Margem Global (%)
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
              Margem Efetiva (%)
            </Label>
            <div className="flex items-center gap-1">
              <div className="h-7 px-3 flex items-center justify-end bg-background border rounded-md text-xs font-mono text-muted-foreground min-w-[4rem]">
                {fmtMargem(totais.margemEfetiva)}
              </div>
            </div>
            <div className="w-px h-6 bg-border mx-1" />
            <div className="flex items-center gap-1">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Total de Compra
              </Label>
              <div className="h-7 px-3 flex items-center justify-end bg-background border rounded-md text-xs font-mono min-w-[6rem]">
                {moeda === 'MISTAS'
                  ? `${fmtValor(totais.totalCompra)} (?)`
                  : `${moeda} ${fmtValor(totais.totalCompra)}`}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Total de Venda
              </Label>
              <div className="h-7 px-3 flex items-center justify-end bg-background border rounded-md text-xs font-mono min-w-[6rem]">
                {moeda === 'MISTAS'
                  ? `${fmtValor(totais.totalVenda)} (?)`
                  : `${moeda} ${fmtValor(totais.totalVenda)}`}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap cursor-help underline decoration-dashed underline-offset-2">
                    Ganho Bruto Estimado
                  </Label>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Diferença entre o total de venda e o total de compra, sem dedução de outras
                    despesas.
                  </p>
                </TooltipContent>
              </Tooltip>
              <div className="h-7 px-3 flex items-center justify-end bg-background border rounded-md text-xs font-mono min-w-[6rem]">
                {moeda === 'MISTAS'
                  ? `${fmtValor(totais.ganhoBruto)} (?)`
                  : `${moeda} ${fmtValor(totais.ganhoBruto)}`}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div className={cn('h-full overflow-auto', tab === 'items' ? 'block' : 'hidden')}>
          {potencialId && (
            <div className="max-w-[1600px] mx-auto px-4 md:px-6 pt-4">
              <PendenciasCliente potencialId={potencialId} />
            </div>
          )}
          <AddItemsToPotential ref={addItemsRef} onTotaisChange={handleTotaisChange} />
        </div>
        <div
          className={cn(
            'h-full overflow-auto p-6 bg-muted/20',
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
              loadMoeda()
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
