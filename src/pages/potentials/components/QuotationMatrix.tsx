import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Check, CheckCircle2, TrendingDown, RefreshCw } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

const PriceCell = ({
  cotacaoF,
  item,
  cotacaoI,
  draftPrice,
  isLowest,
  onDraftChange,
  onPriceBlur,
  onSetWinner,
}: any) => {
  const [val, setVal] = useState('')

  useEffect(() => {
    if (draftPrice !== undefined) {
      setVal(draftPrice.toString())
    } else if (cotacaoI?.preco_ofertado !== undefined && cotacaoI.preco_ofertado !== null) {
      setVal(cotacaoI.preco_ofertado.toString())
    } else {
      setVal('')
    }
  }, [cotacaoI?.preco_ofertado, draftPrice])

  const handleBlur = () => {
    let num = 0
    if (val !== '') {
      const str = String(val).replace(/,/g, '')
      num = parseFloat(str)
      if (isNaN(num)) num = 0
    }
    if (num !== (cotacaoI?.preco_ofertado || 0)) {
      onPriceBlur(cotacaoF.id, item.item_id, num, cotacaoI?.id)
    }
  }

  const isWinner = cotacaoI?.vencedor

  return (
    <div
      className={cn(
        'flex flex-col p-2 rounded-md border transition-all cursor-pointer min-h-[64px] justify-center relative group',
        isWinner
          ? 'bg-primary/10 border-primary ring-1 ring-primary/20'
          : isLowest
            ? 'bg-green-50/50 border-green-300 hover:border-green-400'
            : 'bg-card border-transparent hover:border-border',
      )}
      onClick={() => onSetWinner(cotacaoF.id, item.item_id, cotacaoI?.id)}
    >
      {isWinner && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm z-10">
          <CheckCircle2 className="w-3.5 h-3.5" />
        </div>
      )}
      <div className="relative flex items-center">
        <span className="absolute left-2 text-muted-foreground text-xs select-none">$</span>
        <Input
          type="text"
          value={val}
          onChange={(e) => {
            setVal(e.target.value)
            const parsed = parseFloat(e.target.value.replace(/,/g, ''))
            if (!isNaN(parsed)) {
              onDraftChange(cotacaoF.id, item.item_id, parsed)
            }
          }}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          onFocus={() => onSetWinner(cotacaoF.id, item.item_id, cotacaoI?.id)}
          placeholder="0.00"
          className={cn(
            'h-8 text-right font-mono pl-6 transition-all shadow-none focus-visible:ring-1 focus-visible:ring-primary/50',
            isWinner
              ? 'border-primary/30 bg-background/50'
              : 'border-transparent bg-transparent hover:bg-background focus:bg-background',
          )}
        />
      </div>
    </div>
  )
}

export default function QuotationMatrix() {
  const [searchParams] = useSearchParams()
  const potencialId =
    searchParams.get('id') || searchParams.get('potencialId') || searchParams.get('potencial_id')
  const { toast } = useToast()

  const [potencialItens, setPotencialItens] = useState<any[]>([])
  const [cotacoesF, setCotacoesF] = useState<any[]>([])
  const [cotacoesI, setCotacoesI] = useState<any[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [fornecedores, setFornecedores] = useState<any[]>([])

  const [selectedFornecedor, setSelectedFornecedor] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isCounterOpen, setIsCounterOpen] = useState(false)
  const [counterDiscount, setCounterDiscount] = useState('5')

  const [draftPrices, setDraftPrices] = useState<Record<string, number>>({})

  const loadData = async () => {
    if (!potencialId) return
    try {
      const [pItens, cF, cI, forn] = await Promise.all([
        pb.collection('potencial_itens').getFullList({
          filter: `potencial_id="${potencialId}"`,
          expand: 'item_id',
          sort: 'ordem',
        }),
        pb.collection('cotacoes_fornecedor').getFullList({
          filter: `potencial_id="${potencialId}"`,
          expand: 'fornecedor_id',
          sort: 'created',
        }),
        pb.collection('cotacoes_itens').getFullList({
          filter: `cotacao_fornecedor_id.potencial_id="${potencialId}"`,
        }),
        pb.collection('fornecedores').getFullList({ filter: 'ativo=true', sort: 'nome' }),
      ])
      setPotencialItens(pItens)
      setCotacoesF(cF)
      setCotacoesI(cI)
      setFornecedores(forn)

      const itemIds = pItens.map((i) => i.item_id)
      if (itemIds.length > 0) {
        const hist = await pb.collection('historico_precos').getFullList({
          filter: itemIds.map((id) => `item_id="${id}"`).join(' || '),
          sort: '-data_cotacao',
        })
        setHistorico(hist)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [potencialId])

  useRealtime('potencial_itens', loadData)
  useRealtime('cotacoes_fornecedor', loadData)
  useRealtime('cotacoes_itens', loadData)

  const handleAddFornecedor = async () => {
    if (!potencialId || !selectedFornecedor) return
    try {
      await pb.collection('cotacoes_fornecedor').create({
        potencial_id: potencialId,
        fornecedor_id: selectedFornecedor,
        status: 'pendente',
        data_solicitacao: new Date().toISOString(),
      })
      setIsAddOpen(false)
      setSelectedFornecedor('')
      toast({ title: 'Fabricante adicionado' })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleDraftChange = (cfId: string, itemId: string, price: number) => {
    setDraftPrices((prev) => ({ ...prev, [`${cfId}_${itemId}`]: price }))
  }

  const handlePriceBlur = async (
    cotacaoFId: string,
    itemId: string,
    price: number,
    cotacaoIId?: string,
  ) => {
    try {
      if (cotacaoIId) {
        await pb.collection('cotacoes_itens').update(cotacaoIId, { preco_ofertado: price })
      } else {
        await pb.collection('cotacoes_itens').create({
          cotacao_fornecedor_id: cotacaoFId,
          item_id: itemId,
          preco_ofertado: price,
          vencedor: false,
        })
      }
      setDraftPrices((prev) => {
        const next = { ...prev }
        delete next[`${cotacaoFId}_${itemId}`]
        return next
      })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleSetWinner = async (cotacaoFId: string, itemId: string, cotacaoIId?: string) => {
    try {
      const currentWinner = cotacoesI.find((c) => c.item_id === itemId && c.vencedor)
      if (currentWinner && currentWinner.id === cotacaoIId) return

      const promises = []

      if (currentWinner) {
        promises.push(pb.collection('cotacoes_itens').update(currentWinner.id, { vencedor: false }))
      }

      if (cotacaoIId) {
        promises.push(pb.collection('cotacoes_itens').update(cotacaoIId, { vencedor: true }))
      } else {
        promises.push(
          pb.collection('cotacoes_itens').create({
            cotacao_fornecedor_id: cotacaoFId,
            item_id: itemId,
            preco_ofertado: draftPrices[`${cotacaoFId}_${itemId}`] || 0,
            vencedor: true,
          }),
        )
      }

      await Promise.all(promises)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleFinalize = async () => {
    try {
      const winners = cotacoesI.filter((c) => c.vencedor && c.preco_ofertado > 0)

      const promisesHistory = winners.map(async (w) => {
        const cf = cotacoesF.find((f) => f.id === w.cotacao_fornecedor_id)
        if (!cf) return
        const fornecedorNome = cf.expand?.fornecedor_id?.nome || 'Desconhecido'

        const existing = historico.find(
          (h) =>
            h.item_id === w.item_id &&
            h.fornecedor === fornecedorNome &&
            Math.abs(h.preco - w.preco_ofertado) < 0.01,
        )

        if (!existing) {
          await pb.collection('historico_precos').create({
            item_id: w.item_id,
            preco: w.preco_ofertado,
            fornecedor: fornecedorNome,
            data_cotacao: new Date().toISOString(),
          })
        }
      })
      await Promise.all(promisesHistory)

      const pending = cotacoesF.filter((c) => c.status !== 'finalizada')
      if (pending.length > 0) {
        await Promise.all(
          pending.map((c) =>
            pb.collection('cotacoes_fornecedor').update(c.id, { status: 'finalizada' }),
          ),
        )
      }

      toast({
        title: 'Histórico Salvo',
        description: 'Cotações finalizadas e histórico de preços atualizado.',
      })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleUpdateClientPrices = async () => {
    try {
      let updatedCount = 0
      const promises = potencialItens.map(async (pi) => {
        const winner = cotacoesI.find((c) => c.item_id === pi.item_id && c.vencedor)
        const draft = winner
          ? draftPrices[`${winner.cotacao_fornecedor_id}_${pi.item_id}`]
          : undefined
        const priceToUse = draft !== undefined ? draft : winner?.preco_ofertado || 0

        if (priceToUse > 0 && pi.preco_unitario !== priceToUse) {
          updatedCount++
          await pb.collection('potencial_itens').update(pi.id, { preco_unitario: priceToUse })
        }
      })
      await Promise.all(promises)
      toast({ title: 'Sucesso', description: `${updatedCount} preços atualizados no potencial.` })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleApplyCounterProposal = async () => {
    const discount = parseFloat(counterDiscount.replace(',', '.'))
    if (isNaN(discount) || discount < 0 || discount > 100) {
      return toast({ title: 'Desconto inválido', variant: 'destructive' })
    }

    try {
      let updatedCount = 0
      const winners = cotacoesI.filter((c) => c.vencedor && c.preco_ofertado > 0)
      const promises = winners.map(async (w) => {
        const newPrice = w.preco_ofertado * (1 - discount / 100)
        updatedCount++
        await pb.collection('cotacoes_itens').update(w.id, { preco_ofertado: newPrice })
      })
      await Promise.all(promises)
      setIsCounterOpen(false)
      toast({
        title: 'Sucesso',
        description: `Contraproposta de -${discount}% aplicada a ${updatedCount} itens vencedores.`,
      })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const totals = useMemo(() => {
    let vendaTotal = 0
    let custoTotal = 0

    potencialItens.forEach((pi) => {
      const qtd = pi.quantidade || 0
      const precoVenda = pi.preco_unitario || 0
      vendaTotal += qtd * precoVenda

      const winner = cotacoesI.find((c) => c.item_id === pi.item_id && c.vencedor)
      const draft = winner
        ? draftPrices[`${winner.cotacao_fornecedor_id}_${pi.item_id}`]
        : undefined
      const custo = draft !== undefined ? draft : winner?.preco_ofertado || 0

      if (winner) {
        custoTotal += qtd * custo
      }
    })

    const margin = vendaTotal > 0 ? ((vendaTotal - custoTotal) / vendaTotal) * 100 : 0
    return { vendaTotal, custoTotal, margin }
  }, [potencialItens, cotacoesI, draftPrices])

  const formatCurrency = (val: number) =>
    val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (!potencialId) return <div className="p-4 text-center">Potencial não encontrado.</div>

  const availableFornecedores = fornecedores.filter(
    (f) => !cotacoesF.some((cf) => cf.fornecedor_id === f.id),
  )

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-card p-4 border rounded-xl shadow-sm gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Cotação de Fabricantes</h2>
            <div className="flex flex-wrap gap-x-8 gap-y-2 mt-3 text-sm">
              <div className="flex flex-col">
                <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                  Total de Vendas
                </span>
                <span className="font-mono font-bold text-lg text-foreground">
                  $ {formatCurrency(totals.vendaTotal)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                  Custo Selecionado
                </span>
                <span className="font-mono font-bold text-lg text-foreground">
                  $ {formatCurrency(totals.custoTotal)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                  Margem Estimada
                </span>
                <span
                  className={cn(
                    'font-bold text-lg',
                    totals.margin >= 0 ? 'text-green-600' : 'text-red-600',
                  )}
                >
                  {totals.margin.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch xl:self-auto pt-2 xl:pt-0 border-t xl:border-0">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Fabricante
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Selecione um Fabricante</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Select value={selectedFornecedor} onValueChange={setSelectedFornecedor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFornecedores.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                      {availableFornecedores.length === 0 && (
                        <SelectItem value="none" disabled>
                          Nenhum fabricante disponível
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleAddFornecedor} disabled={!selectedFornecedor}>
                    Adicionar à Cotação
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isCounterOpen} onOpenChange={setIsCounterOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800"
                >
                  <TrendingDown className="w-4 h-4 mr-2" /> Contraproposta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Aplicar Contraproposta</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Esta ação aplicará um desconto percentual sobre os preços dos itens que estão{' '}
                    <strong>vencedores</strong> atualmente.
                  </p>
                  <div className="space-y-2">
                    <Label>Desconto (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={counterDiscount}
                      onChange={(e) => setCounterDiscount(e.target.value)}
                      placeholder="Ex: 5"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCounterOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleApplyCounterProposal}>Aplicar Desconto</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={handleUpdateClientPrices}
              className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Sync. Venda
            </Button>

            <Button
              size="sm"
              onClick={handleFinalize}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={cotacoesF.length === 0}
            >
              <Check className="w-4 h-4 mr-2" /> Salvar Histórico
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto border rounded-xl shadow-sm bg-card">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="min-w-[220px] font-semibold">Item</TableHead>
              <TableHead className="font-semibold text-center w-20">Qtd</TableHead>
              <TableHead className="font-semibold text-right min-w-[110px]">
                Último{' '}
                <span className="text-[10px] font-normal text-muted-foreground block leading-tight">
                  (Histórico)
                </span>
              </TableHead>
              <TableHead className="font-semibold text-right min-w-[110px]">
                Menor{' '}
                <span className="text-[10px] font-normal text-muted-foreground block leading-tight">
                  (Histórico)
                </span>
              </TableHead>
              <TableHead className="font-semibold text-right min-w-[110px] border-r">
                Menor{' '}
                <span className="text-[10px] font-normal text-muted-foreground block leading-tight">
                  (Atual)
                </span>
              </TableHead>
              {cotacoesF.map((cf) => (
                <TableHead
                  key={cf.id}
                  className="min-w-[170px] bg-muted/30 border-r last:border-r-0"
                >
                  <div className="flex flex-col items-center py-2">
                    <span
                      className="font-bold text-foreground truncate max-w-[140px]"
                      title={cf.expand?.fornecedor_id?.nome}
                    >
                      {cf.expand?.fornecedor_id?.nome}
                    </span>
                    {cf.status === 'finalizada' ? (
                      <Badge
                        variant="secondary"
                        className="mt-1 text-[10px] h-4 bg-muted-foreground/10 text-muted-foreground"
                      >
                        Finalizada
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="mt-1 text-[10px] h-4 border-amber-300 text-amber-700 bg-amber-50"
                      >
                        Pendente
                      </Badge>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {potencialItens.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5 + cotacoesF.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  Nenhum item adicionado a este potencial.
                </TableCell>
              </TableRow>
            ) : (
              potencialItens.map((pi) => {
                const itemHist = historico.filter((h) => h.item_id === pi.item_id)
                const lastPrice = itemHist[0]?.preco
                const historicalMinPrice =
                  itemHist.length > 0 ? Math.min(...itemHist.map((h) => h.preco)) : undefined

                const currentPrices = cotacoesF.map((cf) => {
                  const ci = cotacoesI.find(
                    (c) => c.cotacao_fornecedor_id === cf.id && c.item_id === pi.item_id,
                  )
                  const draft = draftPrices[`${cf.id}_${pi.item_id}`]
                  return draft !== undefined ? draft : ci?.preco_ofertado || 0
                })

                const validCurrentPrices = currentPrices.filter((p) => p > 0)
                const lowestCurrentPrice =
                  validCurrentPrices.length > 0 ? Math.min(...validCurrentPrices) : undefined

                return (
                  <TableRow key={pi.id} className="group hover:bg-transparent">
                    <TableCell className="align-top py-4">
                      <div className="font-semibold text-sm">{pi.expand?.item_id?.sku}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-1 pr-4">
                        {pi.expand?.item_id?.descricao_curta}
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4 text-center">
                      <span className="font-medium text-lg">{pi.quantidade}</span>{' '}
                      <span className="text-[10px] text-muted-foreground block leading-tight">
                        {pi.unidade_medida || 'UN'}
                      </span>
                    </TableCell>
                    <TableCell className="align-top py-4 text-right">
                      {lastPrice ? (
                        <span className="font-mono text-sm text-muted-foreground">
                          $ {formatCurrency(lastPrice)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top py-4 text-right">
                      {historicalMinPrice ? (
                        <span className="font-mono text-sm text-muted-foreground">
                          $ {formatCurrency(historicalMinPrice)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top py-4 text-right border-r bg-muted/5">
                      {lowestCurrentPrice ? (
                        <span className="font-mono text-sm text-green-600 font-bold">
                          $ {formatCurrency(lowestCurrentPrice)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {cotacoesF.map((cf) => {
                      const ci = cotacoesI.find(
                        (c) => c.cotacao_fornecedor_id === cf.id && c.item_id === pi.item_id,
                      )
                      const draft = draftPrices[`${cf.id}_${pi.item_id}`]
                      const currentPrice = draft !== undefined ? draft : ci?.preco_ofertado || 0
                      const isLowest = currentPrice > 0 && currentPrice === lowestCurrentPrice

                      return (
                        <TableCell
                          key={cf.id}
                          className="align-top py-2 px-2 border-r last:border-r-0 bg-background/50 hover:bg-muted/20 transition-colors"
                        >
                          <PriceCell
                            cotacaoF={cf}
                            item={pi}
                            cotacaoI={ci}
                            draftPrice={draft}
                            isLowest={isLowest}
                            onDraftChange={handleDraftChange}
                            onPriceBlur={handlePriceBlur}
                            onSetWinner={handleSetWinner}
                          />
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
