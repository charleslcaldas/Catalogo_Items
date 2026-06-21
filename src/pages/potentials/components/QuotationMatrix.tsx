import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Check, TrendingDown, RefreshCw, Download } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
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
import { CounterProposalModal } from './CounterProposalModal'
import { QuotationNotes } from './QuotationNotes'
import { PriceCell } from './PriceCell'

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

  const [draftPrices, setDraftPrices] = useState<Record<string, number>>({})
  const [draftMoqs, setDraftMoqs] = useState<Record<string, number>>({})

  const loadData = async () => {
    if (!potencialId) return
    try {
      const [pItens, cF, cI, forn] = await Promise.all([
        pb
          .collection('potencial_itens')
          .getFullList({
            filter: `potencial_id="${potencialId}"`,
            expand: 'item_id',
            sort: 'ordem',
          }),
        pb
          .collection('cotacoes_fornecedor')
          .getFullList({
            filter: `potencial_id="${potencialId}"`,
            expand: 'fornecedor_id',
            sort: 'created',
          }),
        pb
          .collection('cotacoes_itens')
          .getFullList({ filter: `cotacao_fornecedor_id.potencial_id="${potencialId}"` }),
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

  const handleBlur = async (
    cotacaoFId: string,
    itemId: string,
    price: number,
    moq: number,
    cotacaoIId?: string,
  ) => {
    try {
      if (cotacaoIId) {
        await pb
          .collection('cotacoes_itens')
          .update(cotacaoIId, { preco_ofertado: price, quantidade_minima: moq })
      } else {
        await pb.collection('cotacoes_itens').create({
          cotacao_fornecedor_id: cotacaoFId,
          item_id: itemId,
          preco_ofertado: price,
          quantidade_minima: moq,
          vencedor: false,
        })
      }
      setDraftPrices((prev) => {
        const next = { ...prev }
        delete next[`${cotacaoFId}_${itemId}`]
        return next
      })
      setDraftMoqs((prev) => {
        const next = { ...prev }
        delete next[`${cotacaoFId}_${itemId}`]
        return next
      })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleToggleWinner = async (
    cotacaoFId: string,
    itemId: string,
    cotacaoIId?: string,
    isWinner?: boolean,
  ) => {
    try {
      if (isWinner && cotacaoIId) {
        await pb.collection('cotacoes_itens').update(cotacaoIId, { vencedor: false })
        return
      }

      const currentWinner = cotacoesI.find((c) => c.item_id === itemId && c.vencedor)
      const promises = []

      if (currentWinner && currentWinner.id !== cotacaoIId) {
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
            quantidade_minima: draftMoqs[`${cotacaoFId}_${itemId}`] || 0,
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
      await Promise.all(
        winners.map(async (w) => {
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
            await pb
              .collection('historico_precos')
              .create({
                item_id: w.item_id,
                preco: w.preco_ofertado,
                fornecedor: fornecedorNome,
                data_cotacao: new Date().toISOString(),
              })
          }
        }),
      )
      const pending = cotacoesF.filter((c) => c.status !== 'finalizada')
      if (pending.length > 0)
        await Promise.all(
          pending.map((c) =>
            pb.collection('cotacoes_fornecedor').update(c.id, { status: 'finalizada' }),
          ),
        )
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
      await Promise.all(
        potencialItens.map(async (pi) => {
          const winner = cotacoesI.find((c) => c.item_id === pi.item_id && c.vencedor)
          const priceToUse = winner
            ? (draftPrices[`${winner.cotacao_fornecedor_id}_${pi.item_id}`] ??
              winner.preco_ofertado)
            : 0
          if (priceToUse > 0 && pi.preco_unitario !== priceToUse) {
            updatedCount++
            await pb.collection('potencial_itens').update(pi.id, { preco_unitario: priceToUse })
          }
        }),
      )
      toast({ title: 'Sucesso', description: `${updatedCount} preços atualizados no potencial.` })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleExportExcel = () => {
    let csv = 'SKU,Descricao,Qtd,Unidade,Menor Preco Historico,Menor Preco Atual'
    cotacoesF.forEach((cf) => {
      const nome = cf.expand?.fornecedor_id?.nome || 'Fornecedor'
      csv += `,${nome} - Preco,${nome} - MOQ`
    })
    csv += '\n'

    potencialItens.forEach((pi) => {
      const itemHist = historico.filter((h) => h.item_id === pi.item_id)
      const minHist = itemHist.length > 0 ? Math.min(...itemHist.map((h) => h.preco)) : ''
      const currentPrices = cotacoesF.map(
        (cf) =>
          draftPrices[`${cf.id}_${pi.item_id}`] ??
          cotacoesI.find((c) => c.cotacao_fornecedor_id === cf.id && c.item_id === pi.item_id)
            ?.preco_ofertado ??
          0,
      )
      const validCurr = currentPrices.filter((p) => p > 0)
      const minCurr = validCurr.length > 0 ? Math.min(...validCurr) : ''

      csv += `"${(pi.expand?.item_id?.sku || '').replace(/"/g, '""')}","${(pi.expand?.item_id?.descricao_curta || '').replace(/"/g, '""')}",${pi.quantidade},"${pi.unidade_medida || 'UN'}",${minHist},${minCurr}`

      cotacoesF.forEach((cf) => {
        const ci = cotacoesI.find(
          (c) => c.cotacao_fornecedor_id === cf.id && c.item_id === pi.item_id,
        )
        csv += `,${(draftPrices[`${cf.id}_${pi.item_id}`] ?? ci?.preco_ofertado) || ''},${(draftMoqs[`${cf.id}_${pi.item_id}`] ?? ci?.quantidade_minima) || ''}`
      })
      csv += '\n'
    })

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Cotacao_${potencialId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totals = useMemo(() => {
    let vendaTotal = 0,
      custoTotal = 0
    potencialItens.forEach((pi) => {
      const qtd = pi.quantidade || 0
      vendaTotal += qtd * (pi.preco_unitario || 0)
      const winner = cotacoesI.find((c) => c.item_id === pi.item_id && c.vencedor)
      if (winner)
        custoTotal +=
          qtd *
          (draftPrices[`${winner.cotacao_fornecedor_id}_${pi.item_id}`] ??
            winner.preco_ofertado ??
            0)
    })
    return {
      vendaTotal,
      custoTotal,
      margin: vendaTotal > 0 ? ((vendaTotal - custoTotal) / vendaTotal) * 100 : 0,
    }
  }, [potencialItens, cotacoesI, draftPrices])

  const formatCurrency = (val: number) =>
    val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (!potencialId) return <div className="p-4 text-center">Potencial não encontrado.</div>
  const availableFornecedores = fornecedores.filter(
    (f) => !cotacoesF.some((cf) => cf.fornecedor_id === f.id),
  )

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-card p-4 border rounded-xl shadow-sm gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cotação de Fabricantes</h2>
          <div className="flex flex-wrap gap-x-8 gap-y-2 mt-3 text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
                Total de Vendas
              </span>
              <span className="font-mono font-bold text-lg text-foreground">
                $ {formatCurrency(totals.vendaTotal)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
                Custo Selecionado
              </span>
              <span className="font-mono font-bold text-lg text-foreground">
                $ {formatCurrency(totals.custoTotal)}
              </span>
            </div>
            <div className="flex flex-col bg-muted/30 px-3 py-0.5 rounded border">
              <span className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
                Margem Estimada
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    'font-bold text-lg',
                    totals.margin >= 0 ? 'text-green-600' : 'text-red-600',
                  )}
                >
                  {totals.margin.toFixed(2)}%
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  ($ {formatCurrency(totals.vendaTotal - totals.custoTotal)})
                </span>
              </div>
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
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCounterOpen(true)}
            className="border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800"
          >
            <TrendingDown className="w-4 h-4 mr-2" /> Contraproposta
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="w-4 h-4 mr-2" /> Excel
          </Button>

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

      <div className="flex-1 overflow-auto flex flex-col gap-6 pr-1">
        <div className="border rounded-xl shadow-sm bg-card overflow-x-auto shrink-0">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-20 shadow-sm">
              <TableRow>
                <TableHead className="min-w-[180px] font-semibold py-2">Item</TableHead>
                <TableHead className="font-semibold text-center w-16 py-2">Qtd</TableHead>
                <TableHead className="font-semibold text-right min-w-[90px] py-2">
                  Último{' '}
                  <span className="text-[9px] font-normal text-muted-foreground block">
                    (Hist.)
                  </span>
                </TableHead>
                <TableHead className="font-semibold text-right min-w-[90px] py-2">
                  Menor{' '}
                  <span className="text-[9px] font-normal text-muted-foreground block">
                    (Hist.)
                  </span>
                </TableHead>
                <TableHead className="font-semibold text-right min-w-[90px] py-2 border-r">
                  Menor{' '}
                  <span className="text-[9px] font-normal text-muted-foreground block">
                    (Atual)
                  </span>
                </TableHead>
                {cotacoesF.map((cf) => (
                  <TableHead
                    key={cf.id}
                    className="min-w-[160px] bg-muted/30 border-r last:border-r-0 py-2"
                  >
                    <div className="flex flex-col items-center">
                      <span
                        className="font-bold text-foreground truncate max-w-[140px] text-xs"
                        title={cf.expand?.fornecedor_id?.nome}
                      >
                        {cf.expand?.fornecedor_id?.nome}
                      </span>
                      {cf.status === 'finalizada' ? (
                        <Badge
                          variant="secondary"
                          className="mt-0.5 text-[9px] h-3.5 bg-muted-foreground/10 text-muted-foreground"
                        >
                          Finalizada
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="mt-0.5 text-[9px] h-3.5 border-amber-300 text-amber-700 bg-amber-50"
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
                    return draftPrices[`${cf.id}_${pi.item_id}`] ?? ci?.preco_ofertado ?? 0
                  })

                  const validCurrentPrices = currentPrices.filter((p) => p > 0)
                  const lowestCurrentPrice =
                    validCurrentPrices.length > 0 ? Math.min(...validCurrentPrices) : undefined

                  return (
                    <TableRow key={pi.id} className="group hover:bg-transparent">
                      <TableCell className="align-top py-2 px-3">
                        <div className="font-semibold text-xs">{pi.expand?.item_id?.sku}</div>
                        <div className="text-[10px] text-muted-foreground line-clamp-2 pr-2">
                          {pi.expand?.item_id?.descricao_curta}
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-2 px-2 text-center">
                        <span className="font-medium text-sm">{pi.quantidade}</span>
                        <span className="text-[9px] text-muted-foreground block">
                          {pi.unidade_medida || 'UN'}
                        </span>
                      </TableCell>
                      <TableCell className="align-top py-2 px-2 text-right">
                        {lastPrice ? (
                          <span className="font-mono text-xs text-muted-foreground">
                            $ {formatCurrency(lastPrice)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top py-2 px-2 text-right">
                        {historicalMinPrice ? (
                          <span className="font-mono text-xs text-muted-foreground">
                            $ {formatCurrency(historicalMinPrice)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top py-2 px-2 text-right border-r bg-muted/5">
                        {lowestCurrentPrice ? (
                          <span className="font-mono text-xs text-green-600 font-bold">
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
                        return (
                          <TableCell
                            key={cf.id}
                            className="align-top py-1 px-1 border-r last:border-r-0 bg-background/50 hover:bg-muted/20"
                          >
                            <PriceCell
                              cotacaoF={cf}
                              item={pi}
                              cotacaoI={ci}
                              draftPrice={draft}
                              draftMoq={draftMoqs[`${cf.id}_${pi.item_id}`]}
                              isLowest={currentPrice > 0 && currentPrice === lowestCurrentPrice}
                              onDraftChange={(cfId: string, itemId: string, val: number) =>
                                setDraftPrices((p) => ({ ...p, [`${cfId}_${itemId}`]: val }))
                              }
                              onDraftMoqChange={(cfId: string, itemId: string, val: number) =>
                                setDraftMoqs((p) => ({ ...p, [`${cfId}_${itemId}`]: val }))
                              }
                              onBlur={handleBlur}
                              onToggleWinner={handleToggleWinner}
                            />
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
            <TableFooter className="bg-muted/30 border-t">
              <TableRow>
                <TableCell colSpan={5} className="text-right font-semibold py-2 border-r text-xs">
                  Total do Fornecedor:
                </TableCell>
                {cotacoesF.map((cf) => {
                  let total = 0
                  potencialItens.forEach((pi) => {
                    const ci = cotacoesI.find(
                      (c) => c.cotacao_fornecedor_id === cf.id && c.item_id === pi.item_id,
                    )
                    total +=
                      (draftPrices[`${cf.id}_${pi.item_id}`] ?? ci?.preco_ofertado ?? 0) *
                      (pi.quantidade || 0)
                  })
                  return (
                    <TableCell
                      key={cf.id}
                      className="text-center font-mono font-bold py-2 border-r last:border-r-0 text-foreground bg-background/50 text-xs"
                    >
                      $ {formatCurrency(total)}
                    </TableCell>
                  )
                })}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        <div className="shrink-0 mb-4">
          <QuotationNotes potencialId={potencialId} />
        </div>
      </div>
      <CounterProposalModal
        open={isCounterOpen}
        onOpenChange={setIsCounterOpen}
        cotacoesI={cotacoesI}
        potencialItens={potencialItens}
      />
    </div>
  )
}
