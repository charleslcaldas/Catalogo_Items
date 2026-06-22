import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Check, TrendingDown, Download, Settings2, CheckSquare, FileUp } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { CounterProposalModal } from './CounterProposalModal'
import { QuotationNotes } from './QuotationNotes'
import { PriceCell } from './PriceCell'
import { ImportMappingModal } from './ImportMappingModal'

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

  const [moqValidation, setMoqValidation] = useState<{
    warnings: any[]
    action: 'accept' | 'finalize'
  } | null>(null)

  const [importState, setImportState] = useState<{
    cfId: string
    file: File
    rows: string[][]
    headers: string[]
    open: boolean
  } | null>(null)

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

  const handleUpdateCf = async (cfId: string, data: any) => {
    try {
      await pb.collection('cotacoes_fornecedor').update(cfId, data)
      toast({ title: 'Logística atualizada' })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleSelectAllFor = async (cfId: string) => {
    try {
      const itemsToSelect = potencialItens.filter((pi) => {
        const ci = cotacoesI.find(
          (c) => c.cotacao_fornecedor_id === cfId && c.item_id === pi.item_id,
        )
        const draft = draftPrices[`${cfId}_${pi.item_id}`]
        return (ci && ci.preco_ofertado > 0) || (draft && draft > 0)
      })

      const promises = []
      for (const pi of itemsToSelect) {
        const currentWinner = cotacoesI.find((c) => c.item_id === pi.item_id && c.vencedor)
        if (currentWinner && currentWinner.cotacao_fornecedor_id !== cfId) {
          promises.push(
            pb.collection('cotacoes_itens').update(currentWinner.id, { vencedor: false }),
          )
        }

        let priceToSet = draftPrices[`${cfId}_${pi.item_id}`]
        const ci = cotacoesI.find(
          (c) => c.cotacao_fornecedor_id === cfId && c.item_id === pi.item_id,
        )

        if (ci) {
          if (!ci.vencedor)
            promises.push(pb.collection('cotacoes_itens').update(ci.id, { vencedor: true }))
        } else {
          priceToSet = priceToSet || 0
          promises.push(
            pb.collection('cotacoes_itens').create({
              cotacao_fornecedor_id: cfId,
              item_id: pi.item_id,
              preco_ofertado: priceToSet,
              quantidade_minima: draftMoqs[`${cfId}_${pi.item_id}`] || 0,
              vencedor: true,
            }),
          )
        }
      }
      if (promises.length > 0) {
        await Promise.all(promises)
        toast({ title: 'Sucesso', description: `${promises.length} itens selecionados.` })
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleFileSelect = (cfId: string, file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows: string[][] = []
      let row: string[] = []
      let inQuotes = false
      let val = ''
      for (let i = 0; i < text.length; i++) {
        const char = text[i]
        if (char === '"') {
          if (inQuotes && text[i + 1] === '"') {
            val += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if ((char === ',' || char === ';') && !inQuotes) {
          row.push(val.trim())
          val = ''
        } else if (char === '\n' && !inQuotes) {
          row.push(val.trim())
          rows.push(row)
          row = []
          val = ''
        } else if (char === '\r' && !inQuotes) {
          // ignore
        } else {
          val += char
        }
      }
      if (val !== '' || row.length > 0) {
        row.push(val.trim())
        rows.push(row)
      }

      const validRows = rows.filter((r) => r.length > 0 && r.some((c) => c !== ''))
      if (validRows.length > 0) {
        setImportState({ cfId, file, rows: validRows, headers: validRows[0], open: true })
      }
    }
    reader.readAsText(file)
  }

  const handleConfirmImport = async (skuIdx: number, priceIdx: number, moqIdx: number) => {
    if (!importState) return
    const { cfId, rows } = importState
    let updated = 0
    let notFound = 0
    const promises = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const sku = row[skuIdx]
      const priceStr = row[priceIdx]
      if (!sku || !priceStr) continue

      const pi = potencialItens.find((p) => p.expand?.item_id?.sku === sku)
      if (!pi) {
        notFound++
        continue
      }

      const price = parseFloat(priceStr.replace(',', '.'))
      if (isNaN(price)) continue

      let moq = 0
      if (moqIdx >= 0 && row[moqIdx]) {
        moq = parseInt(row[moqIdx], 10) || 0
      }

      const ci = cotacoesI.find((c) => c.cotacao_fornecedor_id === cfId && c.item_id === pi.item_id)
      if (ci) {
        const updateData: any = { preco_ofertado: price }
        if (moqIdx >= 0) updateData.quantidade_minima = moq
        promises.push(pb.collection('cotacoes_itens').update(ci.id, updateData))
      } else {
        promises.push(
          pb.collection('cotacoes_itens').create({
            cotacao_fornecedor_id: cfId,
            item_id: pi.item_id,
            preco_ofertado: price,
            quantidade_minima: moq,
            vencedor: false,
          }),
        )
      }
      updated++
    }
    await Promise.all(promises)
    toast({
      title: `Importação concluída`,
      description: `${updated} preços atualizados. ${notFound} SKUs não encontrados.`,
    })
    setImportState(null)
  }

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

      let priceToSet = draftPrices[`${cotacaoFId}_${itemId}`]

      if (cotacaoIId) {
        promises.push(pb.collection('cotacoes_itens').update(cotacaoIId, { vencedor: true }))
      } else {
        priceToSet = priceToSet || 0
        promises.push(
          pb.collection('cotacoes_itens').create({
            cotacao_fornecedor_id: cotacaoFId,
            item_id: itemId,
            preco_ofertado: priceToSet,
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

  const handleAcceptSelected = async () => {
    const winners = cotacoesI.filter((c) => c.vencedor && c.preco_ofertado > 0)
    if (winners.length === 0) {
      toast({ title: 'Nenhum item selecionado como vencedor' })
      return
    }

    const warnings = []
    for (const w of winners) {
      const pi = potencialItens.find((p) => p.item_id === w.item_id)
      if (pi && w.quantidade_minima > 0 && pi.quantidade < w.quantidade_minima) {
        warnings.push({ pi, ci: w })
      }
    }

    if (warnings.length > 0) {
      setMoqValidation({ warnings, action: 'accept' })
      return
    }

    executeAcceptSelected(false)
  }

  const executeAcceptSelected = async (adjustMoq: boolean) => {
    try {
      const winners = cotacoesI.filter((c) => c.vencedor && c.preco_ofertado > 0)
      const promises = []
      let updatedCount = 0

      for (const w of winners) {
        const pi = potencialItens.find((p) => p.item_id === w.item_id)
        if (!pi) continue

        let priceToUse =
          draftPrices[`${w.cotacao_fornecedor_id}_${w.item_id}`] ??
          (w.preco_contraproposta > 0 ? w.preco_contraproposta : w.preco_ofertado)

        promises.push(pb.collection('itens').update(w.item_id, { preco_compra: priceToUse }))

        if (adjustMoq && w.quantidade_minima > 0 && pi.quantidade < w.quantidade_minima) {
          promises.push(
            pb.collection('potencial_itens').update(pi.id, { quantidade: w.quantidade_minima }),
          )
        }
        updatedCount++
      }

      await Promise.all(promises)
      toast({ title: 'Sucesso', description: `${updatedCount} preços de compra atualizados.` })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setMoqValidation(null)
    }
  }

  const handleFinalizeWithValidation = async () => {
    const winners = cotacoesI.filter((c) => c.vencedor && c.preco_ofertado > 0)
    const warnings = []
    for (const w of winners) {
      const pi = potencialItens.find((p) => p.item_id === w.item_id)
      if (pi && w.quantidade_minima > 0 && pi.quantidade < w.quantidade_minima) {
        warnings.push({ pi, ci: w })
      }
    }
    if (warnings.length > 0) {
      setMoqValidation({ warnings, action: 'finalize' })
      return
    }
    executeFinalize(false)
  }

  const executeFinalize = async (adjustMoq: boolean) => {
    try {
      const winners = cotacoesI.filter((c) => c.vencedor && c.preco_ofertado > 0)
      const promises = []

      for (const w of winners) {
        const pi = potencialItens.find((p) => p.item_id === w.item_id)
        let qty = pi?.quantidade || 0

        if (adjustMoq && pi && w.quantidade_minima > 0 && pi.quantidade < w.quantidade_minima) {
          qty = w.quantidade_minima
          promises.push(pb.collection('potencial_itens').update(pi.id, { quantidade: qty }))
        }

        let priceToUse =
          draftPrices[`${w.cotacao_fornecedor_id}_${w.item_id}`] ??
          (w.preco_contraproposta > 0 ? w.preco_contraproposta : w.preco_ofertado)

        promises.push(pb.collection('itens').update(w.item_id, { preco_compra: priceToUse }))

        const cf = cotacoesF.find((f) => f.id === w.cotacao_fornecedor_id)
        if (!cf) continue
        const fornecedorNome = cf.expand?.fornecedor_id?.nome || 'Desconhecido'
        const existing = historico.find(
          (h) =>
            h.item_id === w.item_id &&
            h.fornecedor === fornecedorNome &&
            Math.abs(h.preco - w.preco_ofertado) < 0.01,
        )
        if (!existing) {
          promises.push(
            pb.collection('historico_precos').create({
              item_id: w.item_id,
              preco: w.preco_ofertado,
              fornecedor: fornecedorNome,
              data_cotacao: new Date().toISOString(),
            }),
          )
        }
      }

      const pending = cotacoesF.filter((c) => c.status !== 'finalizada')
      for (const c of pending) {
        promises.push(pb.collection('cotacoes_fornecedor').update(c.id, { status: 'finalizada' }))
      }

      await Promise.all(promises)
      toast({
        title: 'Histórico Salvo',
        description: 'Cotações finalizadas e histórico de preços atualizado.',
      })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setMoqValidation(null)
    }
  }

  const handleExportExcel = (lang: 'pt' | 'en') => {
    let csv =
      lang === 'pt'
        ? 'SKU,Descricao,Qtd,Unidade,Menor Preco Atual,Menor Preco Historico'
        : 'SKU,Description,Qty,Unit,Min Current Price,Min Hist Price'

    cotacoesF.forEach((cf) => {
      const nome = cf.expand?.fornecedor_id?.nome || 'Fornecedor'
      csv += lang === 'pt' ? `,${nome} - Preco,${nome} - MOQ` : `,${nome} - Price,${nome} - MOQ`
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

      const itemNode = pi.expand?.item_id
      const desc =
        lang === 'pt'
          ? itemNode?.descricao_curta || itemNode?.descr_pt || ''
          : itemNode?.descricao_curta_en || itemNode?.descr_en || ''

      csv += `"${(itemNode?.sku || '').replace(/"/g, '""')}","${desc.replace(/"/g, '""')}",${pi.quantidade},"${pi.unidade_medida || 'UN'}",${minCurr},${minHist}`

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
    a.download = `Cotacao_${potencialId}_${lang.toUpperCase()}.csv`
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
      if (winner) {
        let draftP = draftPrices[`${winner.cotacao_fornecedor_id}_${pi.item_id}`]
        let p =
          draftP !== undefined
            ? draftP
            : ((winner.preco_contraproposta > 0
                ? winner.preco_contraproposta
                : winner.preco_ofertado) ?? 0)
        custoTotal += qtd * p
      }
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExportExcel('pt')}>
                Português (PT-BR)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportExcel('en')}>
                English (EN)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAcceptSelected}
            className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800"
          >
            <CheckSquare className="w-4 h-4 mr-2" /> Aceitar Selecionados
          </Button>

          <Button
            size="sm"
            onClick={handleFinalizeWithValidation}
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
                <TableHead className="font-semibold text-right min-w-[90px] py-2 bg-muted/10">
                  Menor Cotação
                  <span className="text-[9px] font-normal text-muted-foreground block">
                    (Atual)
                  </span>
                </TableHead>
                <TableHead className="font-semibold text-right min-w-[90px] py-2 border-r bg-muted/10">
                  Último Hist.
                  <span className="text-[9px] font-normal text-muted-foreground block">
                    (Salvo)
                  </span>
                </TableHead>
                <TableHead className="font-semibold text-right min-w-[90px] py-2 border-r">
                  Preço{' '}
                  <span className="text-[9px] font-normal text-muted-foreground block">
                    (Cliente)
                  </span>
                </TableHead>
                {cotacoesF.map((cf) => (
                  <TableHead key={cf.id} className="min-w-[160px] bg-muted/30 border-r py-2">
                    <div className="flex flex-col items-center relative group">
                      <div className="flex items-center gap-1">
                        <span
                          className="font-bold text-foreground truncate max-w-[120px] text-xs"
                          title={cf.expand?.fornecedor_id?.nome}
                        >
                          {cf.expand?.fornecedor_id?.nome}
                        </span>
                        {cf.expand?.fornecedor_id?.auditado && (
                          <Badge
                            variant="outline"
                            className="text-[8px] h-4 px-1 bg-blue-50 text-blue-700 border-blue-200"
                          >
                            Auditado
                          </Badge>
                        )}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100"
                            >
                              <Settings2 className="w-3 h-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3" align="center">
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm">Opções do Fabricante</h4>
                              <div className="space-y-1">
                                <Label className="text-xs">Incoterm</Label>
                                <Input
                                  className="h-7 text-xs"
                                  defaultValue={cf.incoterm}
                                  onBlur={(e) =>
                                    handleUpdateCf(cf.id, { incoterm: e.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Tempo de Fabricação</Label>
                                <Input
                                  className="h-7 text-xs"
                                  defaultValue={cf.tempo_fabricacao}
                                  onBlur={(e) =>
                                    handleUpdateCf(cf.id, { tempo_fabricacao: e.target.value })
                                  }
                                />
                              </div>
                              <div className="pt-2 border-t flex flex-col gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-start text-xs h-7"
                                  onClick={() => handleSelectAllFor(cf.id)}
                                >
                                  <CheckSquare className="w-3 h-3 mr-2" /> Selecionar Todos
                                </Button>
                                <div className="relative w-full">
                                  <Input
                                    type="file"
                                    accept=".csv"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) =>
                                      e.target.files?.[0] &&
                                      handleFileSelect(cf.id, e.target.files[0])
                                    }
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start text-xs h-7 pointer-events-none"
                                  >
                                    <FileUp className="w-3 h-3 mr-2" /> Importar Preços (CSV)
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

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

                      <div className="flex gap-1 mt-1 text-[9px] text-muted-foreground">
                        {cf.incoterm && (
                          <span className="bg-muted px-1 rounded truncate max-w-[60px]">
                            {cf.incoterm}
                          </span>
                        )}
                        {cf.tempo_fabricacao && (
                          <span className="bg-muted px-1 rounded truncate max-w-[60px]">
                            {cf.tempo_fabricacao}
                          </span>
                        )}
                      </div>
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
                  const currentPrices = cotacoesF.map((cf) => {
                    const ci = cotacoesI.find(
                      (c) => c.cotacao_fornecedor_id === cf.id && c.item_id === pi.item_id,
                    )
                    const draft = draftPrices[`${cf.id}_${pi.item_id}`]

                    if (draft !== undefined) return draft
                    if (ci) {
                      if (ci.vencedor && ci.preco_contraproposta > 0) return ci.preco_contraproposta
                      return ci.preco_ofertado
                    }
                    return 0
                  })

                  const validCurrentPrices = currentPrices.filter((p) => p > 0)
                  const lowestCurrentPrice =
                    validCurrentPrices.length > 0 ? Math.min(...validCurrentPrices) : undefined

                  const itemHist = historico.filter((h) => h.item_id === pi.item_id)
                  const lastHist = itemHist.length > 0 ? itemHist[0].preco : undefined

                  return (
                    <TableRow key={pi.id} className="group hover:bg-transparent">
                      <TableCell className="align-top py-1.5 px-3">
                        <div className="font-semibold text-xs">{pi.expand?.item_id?.sku}</div>
                        <div className="text-[10px] text-muted-foreground line-clamp-2 pr-2">
                          {pi.expand?.item_id?.descricao_curta}
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-1.5 px-2 text-center">
                        <span className="font-medium text-sm">{pi.quantidade}</span>
                        <span className="text-[9px] text-muted-foreground block">
                          {pi.unidade_medida || 'UN'}
                        </span>
                      </TableCell>
                      <TableCell className="align-top py-1.5 px-2 text-right bg-muted/5">
                        {lowestCurrentPrice ? (
                          <span className="font-mono text-xs text-green-600 font-bold">
                            $ {formatCurrency(lowestCurrentPrice)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top py-1.5 px-2 text-right border-r bg-muted/5">
                        {lastHist ? (
                          <span className="font-mono text-xs text-muted-foreground font-medium">
                            $ {formatCurrency(lastHist)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top py-1.5 px-2 text-right border-r">
                        {pi.preco_unitario ? (
                          <span className="font-mono text-xs font-bold text-foreground">
                            $ {formatCurrency(pi.preco_unitario)}
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
                        const currentPrice =
                          draft !== undefined
                            ? draft
                            : (ci?.vencedor && ci?.preco_contraproposta > 0
                                ? ci.preco_contraproposta
                                : ci?.preco_ofertado) || 0

                        return (
                          <TableCell
                            key={cf.id}
                            className="align-top py-1 px-1 border-r bg-background/50 hover:bg-muted/20"
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
                  Valor Total:
                </TableCell>
                {cotacoesF.map((cf) => {
                  let total = 0
                  potencialItens.forEach((pi) => {
                    const ci = cotacoesI.find(
                      (c) => c.cotacao_fornecedor_id === cf.id && c.item_id === pi.item_id,
                    )
                    const draft = draftPrices[`${cf.id}_${pi.item_id}`]
                    const price =
                      draft !== undefined
                        ? draft
                        : ((ci?.preco_contraproposta > 0
                            ? ci.preco_contraproposta
                            : ci?.preco_ofertado) ?? 0)
                    total += price * (pi.quantidade || 0)
                  })
                  return (
                    <TableCell
                      key={`tot-${cf.id}`}
                      className="text-center font-mono font-bold py-2 border-r text-foreground bg-background/50 text-xs"
                    >
                      $ {formatCurrency(total)}
                    </TableCell>
                  )
                })}
              </TableRow>
              <TableRow className="bg-amber-50/50">
                <TableCell
                  colSpan={5}
                  className="text-right font-semibold py-2 border-r text-xs text-amber-700"
                >
                  Total Selecionado (Parcial):
                </TableCell>
                {cotacoesF.map((cf) => {
                  let selectedTotal = 0
                  potencialItens.forEach((pi) => {
                    const ci = cotacoesI.find(
                      (c) => c.cotacao_fornecedor_id === cf.id && c.item_id === pi.item_id,
                    )
                    if (ci?.vencedor) {
                      const draft = draftPrices[`${cf.id}_${pi.item_id}`]
                      const price =
                        draft !== undefined
                          ? draft
                          : ((ci.preco_contraproposta > 0
                              ? ci.preco_contraproposta
                              : ci.preco_ofertado) ?? 0)
                      selectedTotal += price * (pi.quantidade || 0)
                    }
                  })
                  return (
                    <TableCell
                      key={`sel-${cf.id}`}
                      className="text-center font-mono font-bold py-2 border-r text-amber-700 bg-amber-50/50 text-xs"
                    >
                      $ {formatCurrency(selectedTotal)}
                    </TableCell>
                  )
                })}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        <div className="shrink-0 mb-4">
          <QuotationNotes potencialId={potencialId} cotacoesF={cotacoesF} />
        </div>
      </div>

      <CounterProposalModal
        open={isCounterOpen}
        onOpenChange={setIsCounterOpen}
        cotacoesI={cotacoesI}
        potencialItens={potencialItens}
        cotacoesF={cotacoesF}
      />

      <ImportMappingModal
        open={importState?.open || false}
        onOpenChange={(open: boolean) =>
          setImportState((prev) => (prev ? { ...prev, open } : null))
        }
        headers={importState?.headers || []}
        summary={{ total: importState ? importState.rows.length - 1 : 0 }}
        onConfirm={handleConfirmImport}
      />

      <Dialog open={!!moqValidation} onOpenChange={(val) => !val && setMoqValidation(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-600 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" /> Aviso de MOQ
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-4">
              A quantidade solicitada de alguns itens está abaixo do exigido pelo fabricante (MOQ).
              Deseja ajustar a quantidade para o mínimo exigido ou prosseguir assim mesmo?
            </p>
            <div className="max-h-48 overflow-y-auto space-y-2 border rounded p-3 bg-muted/20">
              {moqValidation?.warnings.map((w: any) => (
                <div
                  key={w.pi.id}
                  className="text-xs flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                >
                  <span className="font-semibold truncate pr-2 max-w-[200px]">
                    {w.pi.expand?.item_id?.sku}
                  </span>
                  <div className="shrink-0 flex items-center gap-3">
                    <span>
                      Qtde: <span className="text-red-600 font-bold">{w.pi.quantidade}</span>
                    </span>
                    <span>
                      MOQ:{' '}
                      <span className="text-amber-600 font-bold">{w.ci.quantidade_minima}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => {
                if (moqValidation?.action === 'accept') executeAcceptSelected(false)
                else executeFinalize(false)
              }}
            >
              Prosseguir Mesmo Assim
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                if (moqValidation?.action === 'accept') executeAcceptSelected(true)
                else executeFinalize(true)
              }}
            >
              Ajustar para MOQ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
