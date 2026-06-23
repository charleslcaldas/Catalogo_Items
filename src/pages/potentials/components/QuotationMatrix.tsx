import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus,
  Check,
  TrendingDown,
  Download,
  Settings2,
  CheckSquare,
  FileUp,
  ShieldCheck,
  History,
  Maximize2,
  Minimize2,
  Lock,
  Unlock,
  Search,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Switch } from '@/components/ui/switch'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { CounterProposalModal } from './CounterProposalModal'
import { QuotationNotes } from './QuotationNotes'
import { PriceCell } from './PriceCell'
import { ImportMappingModal } from './ImportMappingModal'
import { PriceInput } from '@/components/PriceInput'

export default function QuotationMatrix() {
  const [searchParams] = useSearchParams()
  const potencialId =
    searchParams.get('id') || searchParams.get('potencialId') || searchParams.get('potencial_id')
  const { toast } = useToast()
  const { user } = useAuth()

  const [potencialItens, setPotencialItens] = useState<any[]>([])
  const [cotacoesF, setCotacoesF] = useState<any[]>([])
  const [cotacoesI, setCotacoesI] = useState<any[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [fornecedores, setFornecedores] = useState<any[]>([])

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isCounterOpen, setIsCounterOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const [isFrozen, setIsFrozen] = useState(false)
  const [comboboxSearch, setComboboxSearch] = useState('')

  const [draftPrices, setDraftPrices] = useState<Record<string, number>>({})
  const [draftMoqs, setDraftMoqs] = useState<Record<string, number>>({})
  const [localSalesPrices, setLocalSalesPrices] = useState<Record<string, number>>({})

  const [suppliersWithHistory, setSuppliersWithHistory] = useState<Set<string>>(new Set())
  const [prioritizedSuppliers, setPrioritizedSuppliers] = useState<Set<string>>(new Set())

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

  const [searchTerm, setSearchTerm] = useState('')
  const [filterByLine, setFilterByLine] = useState(false)

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

      const anyFinalizada = cF.some((c) => c.status === 'finalizada')
      if (anyFinalizada && !isFrozen) setIsFrozen(true)

      const itemIds = pItens.map((i) => i.item_id)
      if (itemIds.length > 0) {
        const hist = await pb.collection('historico_precos').getFullList({
          filter: itemIds.map((id) => `item_id="${id}"`).join(' || '),
          sort: '-data_cotacao',
        })
        setHistorico(hist)
      }

      const linhaIds = Array.from(
        new Set(pItens.map((i) => i.expand?.item_id?.linha_id).filter(Boolean)),
      )
      if (linhaIds.length > 0) {
        const histLinhas = await pb.collection('historico_precos').getFullList({
          filter: linhaIds.map((id) => `item_id.linha_id="${id}"`).join(' || '),
          fields: 'fornecedor',
        })
        setPrioritizedSuppliers(new Set(histLinhas.map((h) => h.fornecedor)))
      }

      const allHist = await pb
        .collection('historico_precos')
        .getList(1, 1000, { fields: 'fornecedor' })
      const allNotas = await pb
        .collection('potencial_notas')
        .getList(1, 1000, { filter: 'fornecedor_id != ""', fields: 'fornecedor_id' })

      const histSet = new Set<string>()
      allHist.items.forEach((h) => histSet.add(h.fornecedor))
      allNotas.items.forEach((n) => histSet.add(n.fornecedor_id))
      setSuppliersWithHistory(histSet)
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

  useEffect(() => {
    setLocalSalesPrices((prev) => {
      const next = { ...prev }
      let changed = false
      potencialItens.forEach((pi) => {
        if (!(pi.id in next)) {
          next[pi.id] = pi.preco_unitario || pi.expand?.item_id?.preco_venda || 0
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [potencialItens])

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
          // Ignore carriage return character
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

  const handleAddFornecedor = async (id: string) => {
    if (!potencialId || !id) return
    try {
      await pb.collection('cotacoes_fornecedor').create({
        potencial_id: potencialId,
        fornecedor_id: id,
        status: 'pendente',
        data_solicitacao: new Date().toISOString(),
      })
      setIsAddOpen(false)
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

  const handleSalesPriceBlur = async (piId: string, val: number) => {
    try {
      await pb.collection('potencial_itens').update(piId, { preco_unitario: val })
    } catch {
      /* intentionally ignored */
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
      const moqToUse = draftMoqs[`${w.cotacao_fornecedor_id}_${w.item_id}`] ?? w.quantidade_minima
      if (pi && moqToUse > 0 && pi.quantidade < moqToUse) {
        warnings.push({ pi, ci: { ...w, quantidade_minima: moqToUse } })
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
      const fornecedoresNomes = new Set<string>()

      for (const w of winners) {
        const pi = potencialItens.find((p) => p.item_id === w.item_id)
        if (!pi) continue

        let priceToUse =
          draftPrices[`${w.cotacao_fornecedor_id}_${w.item_id}`] ??
          (w.preco_contraproposta > 0 ? w.preco_contraproposta : w.preco_ofertado)

        const moqToUse = draftMoqs[`${w.cotacao_fornecedor_id}_${w.item_id}`] ?? w.quantidade_minima

        promises.push(pb.collection('itens').update(w.item_id, { preco_compra: priceToUse }))

        const sp = localSalesPrices[pi.id] ?? pi.preco_unitario ?? 0
        const updateData: any = { preco_unitario: sp }
        if (adjustMoq && moqToUse > 0 && pi.quantidade < moqToUse) {
          updateData.quantidade = moqToUse
        }
        promises.push(pb.collection('potencial_itens').update(pi.id, updateData))

        const cf = cotacoesF.find((f) => f.id === w.cotacao_fornecedor_id)
        const fornecedorNome = cf?.expand?.fornecedor_id?.nome || 'Desconhecido'
        if (cf) fornecedoresNomes.add(fornecedorNome)

        promises.push(
          pb.collection('historico_precos').create({
            item_id: w.item_id,
            preco: priceToUse,
            fornecedor: fornecedorNome,
            data_cotacao: new Date().toISOString(),
          }),
        )

        updatedCount++
      }

      const cfsWithWinners = new Set(winners.map((w) => w.cotacao_fornecedor_id))
      for (const cfId of cfsWithWinners) {
        promises.push(pb.collection('cotacoes_fornecedor').update(cfId, { status: 'finalizada' }))
      }

      if (user?.id) {
        promises.push(
          pb.collection('potencial_notas').create({
            potencial_id: potencialId,
            user_id: user.id,
            conteudo: `Cotação aceita e finalizada. Fornecedores selecionados: ${Array.from(fornecedoresNomes).join(', ')}. Itens atualizados: ${updatedCount}.`,
            categoria: 'Cotação',
          }),
        )
      }

      await Promise.all(promises)
      toast({
        title: 'Sucesso',
        description: `${updatedCount} preços de compra aceitos e histórico salvo.`,
      })
      setIsFrozen(true)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setMoqValidation(null)
    }
  }

  const executeFinalize = async (adjustMoq: boolean) => {
    executeAcceptSelected(adjustMoq)
  }

  const handleExportExcel = () => {
    let html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="utf-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Counter Proposal</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
</head>
<body>
  <table border="1">
    <tr>
      <th style="background:#f3f4f6">SKU</th>
      <th style="background:#f3f4f6">Description</th>
      <th style="background:#f3f4f6">Quantity</th>
      <th style="background:#f3f4f6">Unit</th>
      <th style="background:#f3f4f6">Offered Price</th>
      <th style="background:#f3f4f6">Target Price</th>
    </tr>`

    potencialItens.forEach((pi) => {
      const itemNode = pi.expand?.item_id
      const desc =
        itemNode?.descricao_curta_en ||
        itemNode?.descr_en ||
        itemNode?.descricao_curta ||
        itemNode?.descr_pt ||
        ''

      const currentPrices = cotacoesF
        .map((cf) => {
          const draft = draftPrices[`${cf.id}_${pi.item_id}`]
          const ci = cotacoesI.find(
            (c) => c.cotacao_fornecedor_id === cf.id && c.item_id === pi.item_id,
          )
          return draft !== undefined ? draft : ci?.preco_ofertado || 0
        })
        .filter((p) => p > 0)
      const offeredPrice = currentPrices.length > 0 ? Math.min(...currentPrices) : 0

      let targetPrice = 0
      const winners = cotacoesI.filter((c) => c.item_id === pi.item_id && c.vencedor)
      if (winners.length > 0) {
        targetPrice =
          winners[0].preco_contraproposta > 0
            ? winners[0].preco_contraproposta
            : winners[0].preco_ofertado
      } else {
        targetPrice = offeredPrice
      }

      html += `<tr>
        <td>${itemNode?.sku || ''}</td>
        <td>${desc}</td>
        <td>${pi.quantidade}</td>
        <td>${pi.unidade_medida || 'UN'}</td>
        <td>${offeredPrice.toString()}</td>
        <td>${targetPrice.toString()}</td>
      </tr>`
    })

    html += `</table></body></html>`

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Counter_Proposal_${potencialId}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportForSupplier = (cf: any) => {
    let csv = 'SKU,Descricao,Qtd,Unidade,Preco Unitario,MOQ\n'
    potencialItens.forEach((pi) => {
      const itemNode = pi.expand?.item_id
      const desc = itemNode?.descricao_curta || itemNode?.descr_pt || ''
      csv += `"${(itemNode?.sku || '').replace(/"/g, '""')}","${desc.replace(/"/g, '""')}",${pi.quantidade.toString()},"${pi.unidade_medida || 'UN'}","",""\n`
    })

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Cotacao_Preenchimento_${cf.expand?.fornecedor_id?.nome}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getCostPrice = (pi: any) => {
    const winner = cotacoesI.find((c) => c.item_id === pi.item_id && c.vencedor)
    if (winner) {
      const draft = draftPrices[`${winner.cotacao_fornecedor_id}_${pi.item_id}`]
      if (draft !== undefined) return draft
      return winner.preco_contraproposta > 0 ? winner.preco_contraproposta : winner.preco_ofertado
    }

    const currentPrices = cotacoesF.map((cf) => {
      const ci = cotacoesI.find(
        (c) => c.cotacao_fornecedor_id === cf.id && c.item_id === pi.item_id,
      )
      const draft = draftPrices[`${cf.id}_${pi.item_id}`]
      if (draft !== undefined) return draft
      if (ci && ci.preco_ofertado > 0)
        return ci.preco_contraproposta > 0 ? ci.preco_contraproposta : ci.preco_ofertado
      return 0
    })
    const validCurrentPrices = currentPrices.filter((p) => p > 0)
    if (validCurrentPrices.length > 0) return Math.min(...validCurrentPrices)

    return pi.expand?.item_id?.preco_compra || 0
  }

  const totals = useMemo(() => {
    let vendaTotal = 0,
      custoTotal = 0
    potencialItens.forEach((pi) => {
      const qtd = pi.quantidade || 0
      vendaTotal += qtd * (localSalesPrices[pi.id] ?? 0)
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
  }, [potencialItens, cotacoesI, draftPrices, localSalesPrices])

  const formatCurrency = (val: number) =>
    val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (!potencialId) return <div className="p-4 text-center">Potencial não encontrado.</div>

  const availableFornecedores = fornecedores.filter(
    (f) => !cotacoesF.some((cf) => cf.fornecedor_id === f.id),
  )
  const sortedFornecedores = [...availableFornecedores]
    .filter((f) => (filterByLine ? prioritizedSuppliers.has(f.nome) : true))
    .sort((a, b) => {
      const aPrio = prioritizedSuppliers.has(a.nome)
      const bPrio = prioritizedSuppliers.has(b.nome)
      if (aPrio && !bPrio) return -1
      if (!aPrio && bPrio) return 1
      return a.nome.localeCompare(b.nome)
    })

  const filteredPotencialItens = potencialItens.filter((pi) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const sku = (pi.expand?.item_id?.sku || '').toLowerCase()
    const pt = (
      pi.expand?.item_id?.descr_pt ||
      pi.expand?.item_id?.descricao_curta ||
      ''
    ).toLowerCase()
    const en = (
      pi.expand?.item_id?.descr_en ||
      pi.expand?.item_id?.descricao_curta_en ||
      ''
    ).toLowerCase()
    return sku.includes(term) || pt.includes(term) || en.includes(term)
  })

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-card p-4 border rounded-xl shadow-sm gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">Cotação de Fabricantes</h2>
            {isFrozen && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <Lock className="w-3 h-3 mr-1" /> Bloqueada
              </Badge>
            )}
          </div>
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
          <div className="relative w-48 xl:w-64">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar SKU ou Descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCompact(!isCompact)}
            className="hidden xl:flex text-muted-foreground"
            title="Alternar Densidade"
          >
            {isCompact ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>

          {isFrozen ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFrozen(false)}
              className="border-red-200 text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800"
            >
              <Unlock className="w-4 h-4 mr-2" /> Editar Cotação
            </Button>
          ) : (
            <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Fabricante
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-0" align="start">
                <div className="p-2 border-b flex items-center justify-between bg-muted/10">
                  <Label
                    className="text-xs text-muted-foreground cursor-pointer"
                    htmlFor="line-filter"
                  >
                    Apenas fornecedores da linha
                  </Label>
                  <Switch
                    id="line-filter"
                    checked={filterByLine}
                    onCheckedChange={setFilterByLine}
                  />
                </div>
                <Command
                  filter={(value, search) => {
                    const normalizedValue = value.toLowerCase()
                    const normalizedSearch = search.toLowerCase()
                    const tokens = normalizedSearch.split(/\s+/)
                    return tokens.every((token) => normalizedValue.includes(token)) ? 1 : 0
                  }}
                >
                  <CommandInput
                    placeholder="Buscar fabricante..."
                    value={comboboxSearch}
                    onValueChange={setComboboxSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum fabricante encontrado.</CommandEmpty>
                    <CommandGroup>
                      {sortedFornecedores.map((f) => (
                        <CommandItem
                          key={f.id}
                          value={f.nome}
                          onSelect={() => {
                            handleAddFornecedor(f.id)
                            setComboboxSearch('')
                          }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="truncate" title={f.nome}>
                              {f.nome}
                            </span>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {prioritizedSuppliers.has(f.nome) && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1 h-4 font-normal bg-emerald-50 text-emerald-700 border-emerald-200"
                                >
                                  Recomendado
                                </Badge>
                              )}
                              {f.auditado && (
                                <ShieldCheck
                                  className="w-3.5 h-3.5 text-blue-600"
                                  title="Auditado"
                                />
                              )}
                              {(suppliersWithHistory.has(f.id) ||
                                suppliersWithHistory.has(f.nome)) && (
                                <History
                                  className="w-3.5 h-3.5 text-muted-foreground"
                                  title="Possui Histórico"
                                />
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                      {sortedFornecedores.length === 0 && (
                        <CommandItem disabled>Nenhum fabricante disponível</CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCounterOpen(true)}
            disabled={isFrozen}
            className="border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800"
          >
            <TrendingDown className="w-4 h-4 mr-2" /> Contraproposta
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={isFrozen}>
            <Download className="w-4 h-4 mr-2" /> Exportar Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAcceptSelected}
            disabled={isFrozen}
            className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800"
          >
            <CheckSquare className="w-4 h-4 mr-2" /> Aceitar Selecionados
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex flex-col gap-6 pr-1">
        <div className="border rounded-xl shadow-sm bg-card overflow-x-auto shrink-0">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-20 shadow-sm">
              <TableRow>
                <TableHead className="min-w-[160px] font-semibold py-2">Item</TableHead>
                <TableHead className="font-semibold text-center w-16 py-2">Qtd</TableHead>
                <TableHead className="font-semibold text-right min-w-[90px] py-2 bg-muted/10 border-r">
                  Custo Ref.
                  <span className="text-[9px] font-normal text-muted-foreground block">
                    (Menor/Vencedor)
                  </span>
                </TableHead>
                <TableHead className="font-semibold text-right min-w-[90px] py-2 border-r bg-muted/5">
                  Margem %
                  <span className="text-[9px] font-normal text-muted-foreground block">
                    (Inside)
                  </span>
                </TableHead>
                <TableHead className="font-semibold text-right min-w-[100px] py-2 border-r">
                  Preço Venda
                  <span className="text-[9px] font-normal text-muted-foreground block">
                    (Cliente)
                  </span>
                </TableHead>
                {cotacoesF.map((cf) => (
                  <TableHead key={cf.id} className="min-w-[160px] bg-muted/30 border-r py-2">
                    <div className="flex flex-col items-center relative group">
                      <div className="flex items-center gap-1 w-full justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-bold text-foreground truncate max-w-[120px] text-xs cursor-help">
                              {cf.expand?.fornecedor_id?.nome}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>{cf.expand?.fornecedor_id?.nome}</p>
                          </TooltipContent>
                        </Tooltip>

                        {cf.expand?.fornecedor_id?.auditado && (
                          <Badge
                            variant="outline"
                            className="text-[8px] h-4 px-1 bg-blue-50 text-blue-700 border-blue-200"
                          >
                            Aud
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
                                  disabled={isFrozen}
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
                                  disabled={isFrozen}
                                />
                              </div>
                              <div className="pt-2 border-t flex flex-col gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-start text-xs h-7"
                                  onClick={() => handleExportForSupplier(cf)}
                                >
                                  <Download className="w-3 h-3 mr-2" /> Planilha para Preenchimento
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-start text-xs h-7"
                                  onClick={() => handleSelectAllFor(cf.id)}
                                  disabled={isFrozen}
                                >
                                  <CheckSquare className="w-3 h-3 mr-2" /> Selecionar Todos
                                </Button>
                                <div className="relative w-full">
                                  <Input
                                    type="file"
                                    accept=".csv"
                                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    disabled={isFrozen}
                                    onChange={(e) =>
                                      e.target.files?.[0] &&
                                      handleFileSelect(cf.id, e.target.files[0])
                                    }
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start text-xs h-7 pointer-events-none"
                                    disabled={isFrozen}
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
              {filteredPotencialItens.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5 + cotacoesF.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {potencialItens.length === 0
                      ? 'Nenhum item adicionado a este potencial.'
                      : 'Nenhum item encontrado para a busca.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPotencialItens.map((pi) => {
                  const costPrice = getCostPrice(pi)
                  const salesPrice = localSalesPrices[pi.id] ?? 0
                  const markup =
                    costPrice > 0 && salesPrice > 0 ? (1 - costPrice / salesPrice) * 100 : 0

                  const currentPrices = cotacoesF.map((cf) => {
                    const ci = cotacoesI.find(
                      (c) => c.cotacao_fornecedor_id === cf.id && c.item_id === pi.item_id,
                    )
                    const draft = draftPrices[`${cf.id}_${pi.item_id}`]
                    if (draft !== undefined) return draft
                    if (ci)
                      return ci.vencedor && ci.preco_contraproposta > 0
                        ? ci.preco_contraproposta
                        : ci.preco_ofertado
                    return 0
                  })
                  const validCurrentPrices = currentPrices.filter((p) => p > 0)
                  const lowestCurrentPrice =
                    validCurrentPrices.length > 0 ? Math.min(...validCurrentPrices) : undefined

                  return (
                    <TableRow key={pi.id} className="group hover:bg-transparent">
                      <TableCell
                        className={cn('align-top px-3 border-r', isCompact ? 'py-1' : 'py-1.5')}
                      >
                        <div className="font-semibold text-xs">{pi.expand?.item_id?.sku}</div>
                        <div className="text-[10px] text-muted-foreground line-clamp-2 pr-2">
                          {pi.expand?.item_id?.descricao_curta}
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'align-top px-2 text-center border-r',
                          isCompact ? 'py-1' : 'py-1.5',
                        )}
                      >
                        <span className="font-medium text-sm">{pi.quantidade}</span>
                        <span className="text-[9px] text-muted-foreground block">
                          {pi.unidade_medida || 'UN'}
                        </span>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'align-middle px-2 text-right border-r bg-muted/10',
                          isCompact ? 'py-1' : 'py-1.5',
                        )}
                      >
                        <span className="font-mono text-xs text-muted-foreground font-medium">
                          {costPrice > 0 ? `$ ${formatCurrency(costPrice)}` : '-'}
                        </span>
                      </TableCell>

                      <TableCell
                        className={cn(
                          'align-middle px-2 text-right border-r bg-muted/5',
                          isCompact ? 'py-1' : 'py-1.5',
                        )}
                      >
                        <PriceInput
                          className={cn(
                            'h-7 text-xs text-right bg-background',
                            isFrozen && 'pointer-events-none opacity-70 border-transparent',
                          )}
                          value={parseFloat(markup.toFixed(2))}
                          onChange={(m) => {
                            const val = m || 0
                            if (val >= 100) return
                            const sp = costPrice / (1 - val / 100)
                            setLocalSalesPrices((p) => ({ ...p, [pi.id]: sp }))
                          }}
                          onBlur={(e) => {
                            const m = parseFloat(e.target.value.replace(/,/g, '.')) || 0
                            if (m >= 100) return
                            const sp = costPrice / (1 - m / 100)
                            handleSalesPriceBlur(pi.id, sp)
                          }}
                          disabled={isFrozen}
                        />
                      </TableCell>
                      <TableCell
                        className={cn(
                          'align-middle px-2 text-right border-r',
                          isCompact ? 'py-1' : 'py-1.5',
                        )}
                      >
                        <PriceInput
                          className={cn(
                            'h-7 text-xs text-right font-bold text-foreground bg-background',
                            isFrozen && 'pointer-events-none opacity-70 border-transparent',
                          )}
                          value={parseFloat(salesPrice.toFixed(4))}
                          onChange={(sp) => {
                            setLocalSalesPrices((p) => ({ ...p, [pi.id]: sp || 0 }))
                          }}
                          onBlur={(e) =>
                            handleSalesPriceBlur(
                              pi.id,
                              parseFloat(e.target.value.replace(/,/g, '.')) || 0,
                            )
                          }
                          disabled={isFrozen}
                        />
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
                        const isWinnerCell = ci?.vencedor

                        return (
                          <TableCell
                            key={cf.id}
                            className={cn(
                              'align-top px-1 border-r transition-colors relative',
                              isCompact ? 'py-0.5' : 'py-1',
                              isWinnerCell
                                ? 'bg-blue-100/40 border-l-2 border-r-2 border-y-2 border-blue-400 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.5)] z-10'
                                : 'bg-background/50 hover:bg-muted/20',
                              isFrozen && 'pointer-events-none opacity-80',
                            )}
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
            <Button variant="outline" onClick={() => executeAcceptSelected(false)}>
              Prosseguir Mesmo Assim
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => executeAcceptSelected(true)}
            >
              Ajustar para MOQ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
