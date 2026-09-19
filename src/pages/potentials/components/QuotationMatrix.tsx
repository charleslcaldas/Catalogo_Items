import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus,
  TrendingDown,
  Download,
  Settings2,
  CheckSquare,
  FileUp,
  ShieldCheck,
  History,
  Maximize2,
  Minimize2,
  Search,
  Save,
  Loader2,
  Truck,
  Clock,
  CreditCard,
  Check,
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
import { cn, textMatchesAll } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { CounterProposalModal } from './CounterProposalModal'
import { QuotationNotes } from './QuotationNotes'
import { PriceCell } from './PriceCell'
import { ImportMappingModal } from './ImportMappingModal'

interface QuotationMatrixProps {
  onAccepted?: () => void
}

export default function QuotationMatrix({ onAccepted }: QuotationMatrixProps = {}) {
  const [searchParams] = useSearchParams()
  const potencialId =
    searchParams.get('id') || searchParams.get('potencialId') || searchParams.get('potencial_id')
  const { toast } = useToast()
  const { user } = useAuth()

  const [potencialItens, setPotencialItens] = useState<any[]>([])
  const [cotacoesF, setCotacoesF] = useState<any[]>([])
  const [cotacoesI, setCotacoesI] = useState<any[]>([])
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [latestHistorico, setLatestHistorico] = useState<Record<string, any>>({})
  const [potencial, setPotencial] = useState<any>(null)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isCounterOpen, setIsCounterOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const [comboboxSearch, setComboboxSearch] = useState('')

  const [draftPrices, setDraftPrices] = useState<Record<string, number>>({})
  const [draftMoqs, setDraftMoqs] = useState<Record<string, number>>({})
  const [cfDrafts, setCfDrafts] = useState<
    Record<string, { incoterm?: string; tempo_fabricacao?: string; condicao_pagamento?: string }>
  >({})
  const [savingCfIds, setSavingCfIds] = useState<Record<string, boolean>>({})
  const [isSavingDraft, setIsSavingDraft] = useState(false)

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
          expand: 'item_id,item_id.linha_id,item_id.acabamento_id',
          sort: 'ordem',
        }),
        pb.collection('cotacoes_fornecedor').getFullList({
          filter: `potencial_id="${potencialId}"`,
          expand: 'fornecedor_id',
          sort: 'created',
        }),
        pb.collection('cotacoes_itens').getFullList({
          filter: `cotacao_fornecedor_id.potencial_id="${potencialId}"`,
          expand: 'cotacao_fornecedor_id,cotacao_fornecedor_id.fornecedor_id',
        }),
        pb.collection('fornecedores').getFullList({ filter: 'ativo=true', sort: 'nome' }),
      ])
      setPotencialItens(pItens)
      setCotacoesF(cF)
      setCotacoesI(cI)
      setFornecedores(forn)

      const linhaIds = Array.from(
        new Set(pItens.map((i) => i.expand?.item_id?.linha_id).filter(Boolean)),
      )
      if (linhaIds.length > 0) {
        const histLinhas = await pb.collection('historico_precos').getFullList({
          filter: `(${linhaIds.map((id) => `item_id.linha_id="${id}"`).join(' || ')}) && tipo="compra"`,
          fields: 'fornecedor',
        })
        setPrioritizedSuppliers(new Set(histLinhas.map((h) => h.fornecedor)))
      }

      const allHist = await pb
        .collection('historico_precos')
        .getList(1, 1000, { filter: 'tipo="compra"', fields: 'fornecedor' })
      const allNotas = await pb
        .collection('potencial_notas')
        .getList(1, 1000, { filter: 'fornecedor_id != ""', fields: 'fornecedor_id' })

      const histSet = new Set<string>()
      allHist.items.forEach((h) => histSet.add(h.fornecedor))
      allNotas.items.forEach((n) => histSet.add(n.fornecedor_id))
      setSuppliersWithHistory(histSet)

      const potencialRecord = await pb.collection('potenciais').getOne(potencialId)
      setPotencial(potencialRecord)
      const potencialDate = potencialRecord.created

      const itemIds = Array.from(new Set(pItens.map((i) => i.item_id)))
      const latestHist: Record<string, any> = {}
      if (itemIds.length > 0) {
        const chunkSize = 50
        for (let i = 0; i < itemIds.length; i += chunkSize) {
          const chunk = itemIds.slice(i, i + chunkSize)
          const itemFilter = chunk.map((id) => `item_id="${id}"`).join(' || ')
          const h = await pb.collection('historico_precos').getFullList({
            filter: `(${itemFilter}) && tipo="compra" && created < "${potencialDate}"`,
            sort: '-data_cotacao',
          })
          h.forEach((record) => {
            if (!latestHist[record.item_id]) {
              latestHist[record.item_id] = record
            }
          })
        }
      }
      setLatestHistorico(latestHist)
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
          // Ignore
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

  const handleSaveSupplierOptions = async (cfId: string) => {
    const draft = cfDrafts[cfId]
    if (!draft || Object.keys(draft).length === 0) {
      toast({
        title: 'Nenhuma alteração',
        description: 'Não há alterações pendentes nas opções deste fabricante.',
      })
      return
    }

    try {
      setSavingCfIds((prev) => ({ ...prev, [cfId]: true }))
      const updatePayload: Record<string, any> = {}
      if (draft.incoterm !== undefined) updatePayload.incoterm = draft.incoterm
      if (draft.tempo_fabricacao !== undefined)
        updatePayload.tempo_fabricacao = draft.tempo_fabricacao
      if (draft.condicao_pagamento !== undefined)
        updatePayload.condicao_pagamento = draft.condicao_pagamento

      await pb.collection('cotacoes_fornecedor').update(cfId, updatePayload)

      // Atualiza o estado local imediatamente
      setCotacoesF((prev) =>
        prev.map((item) => (item.id === cfId ? { ...item, ...updatePayload } : item)),
      )

      // Limpa os rascunhos salvos deste fornecedor
      setCfDrafts((prev) => {
        const next = { ...prev }
        delete next[cfId]
        return next
      })

      // Se houver callback onAccepted ou recarregamento de condições da cotação
      if (onAccepted) {
        await onAccepted()
      }

      toast({
        title: 'Opções salvas com sucesso',
        description: 'Condições comerciais do fabricante atualizadas.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar opções',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSavingCfIds((prev) => ({ ...prev, [cfId]: false }))
    }
  }

  const handleAddFornecedor = async (id: string) => {
    if (!potencialId || !id) return
    try {
      // Pull the Incoterm and Tempo de Fabricação registered on the fornecedor
      // so they are automatically linked to this quotation.
      const fornecedor = await pb.collection('fornecedores').getOne(id)
      await pb.collection('cotacoes_fornecedor').create({
        potencial_id: potencialId,
        fornecedor_id: id,
        status: 'pendente',
        data_solicitacao: new Date().toISOString(),
        incoterm: fornecedor.incoterm || '',
        tempo_fabricacao: fornecedor.tempo_fabricacao || '',
        condicao_pagamento: fornecedor.condicao_pagamento || '',
      })
      setIsAddOpen(false)
      toast({ title: 'Fabricante adicionado' })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleSaveDraftPrices = async () => {
    try {
      setIsSavingDraft(true)
      const allDraftKeys = new Set([...Object.keys(draftPrices), ...Object.keys(draftMoqs)])

      const promises: Promise<any>[] = []

      for (const key of allDraftKeys) {
        const separatorIdx = key.indexOf('_')
        if (separatorIdx === -1) continue
        const cfId = key.substring(0, separatorIdx)
        const itemId = key.substring(separatorIdx + 1)

        const existingCi = cotacoesI.find(
          (c) => c.cotacao_fornecedor_id === cfId && c.item_id === itemId,
        )

        const preco =
          draftPrices[key] !== undefined ? draftPrices[key] : existingCi?.preco_ofertado || 0

        const moq =
          draftMoqs[key] !== undefined ? draftMoqs[key] : existingCi?.quantidade_minima || 0

        if (existingCi) {
          promises.push(
            pb.collection('cotacoes_itens').update(existingCi.id, {
              preco_ofertado: preco,
              quantidade_minima: moq,
            }),
          )
        } else {
          promises.push(
            pb.collection('cotacoes_itens').create({
              cotacao_fornecedor_id: cfId,
              item_id: itemId,
              preco_ofertado: preco,
              quantidade_minima: moq,
              vencedor: false,
            }),
          )
        }
      }

      for (const [cfId, drafts] of Object.entries(cfDrafts)) {
        if (!drafts || Object.keys(drafts).length === 0) continue
        const updatePayload: Record<string, any> = {}
        if (drafts.incoterm !== undefined) updatePayload.incoterm = drafts.incoterm
        if (drafts.tempo_fabricacao !== undefined)
          updatePayload.tempo_fabricacao = drafts.tempo_fabricacao
        if (drafts.condicao_pagamento !== undefined)
          updatePayload.condicao_pagamento = drafts.condicao_pagamento

        if (Object.keys(updatePayload).length > 0) {
          promises.push(pb.collection('cotacoes_fornecedor').update(cfId, updatePayload))
        }
      }

      await Promise.all(promises)

      setDraftPrices({})
      setDraftMoqs({})
      setCfDrafts({})

      await loadData()
      if (onAccepted) {
        await onAccepted()
      }

      toast({
        title: 'Edições salvas',
        description: 'Edições da cotação salvas com sucesso.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar cotação',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsSavingDraft(false)
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

  const getWinnerPrice = (ci: any) => {
    const draftKey = `${ci.cotacao_fornecedor_id}_${ci.item_id}`
    const draft = draftPrices[draftKey]
    if (draft !== undefined && draft > 0) return draft
    return ci.preco_ofertado || 0
  }

  const handleAcceptSelected = async () => {
    const winners = cotacoesI.filter((c) => c.vencedor && getWinnerPrice(c) > 0)
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
      const winners = cotacoesI.filter((c) => c.vencedor && getWinnerPrice(c) > 0)
      const promises: Promise<any>[] = []
      let updatedCount = 0
      const fornecedoresNomes = new Set<string>()

      for (const w of winners) {
        const pi = potencialItens.find((p) => p.item_id === w.item_id)
        if (!pi) continue

        const draftKey = `${w.cotacao_fornecedor_id}_${w.item_id}`
        const draft = draftPrices[draftKey]
        const priceToUse = draft !== undefined && draft > 0 ? draft : w.preco_ofertado

        // Se houver draft > 0 para uma cotação aceita, persista também esse valor em cotacoes_itens
        if (draft !== undefined && draft > 0) {
          const draftMoq = draftMoqs[draftKey]
          const moqVal = draftMoq !== undefined ? draftMoq : w.quantidade_minima || 0
          promises.push(
            pb.collection('cotacoes_itens').update(w.id, {
              preco_ofertado: draft,
              quantidade_minima: moqVal,
              vencedor: true,
            }),
          )
        }

        const moqToUse = draftMoqs[draftKey] ?? w.quantidade_minima

        promises.push(pb.collection('itens').update(w.item_id, { preco_compra: priceToUse }))

        const oldRefPrice = typeof pi.referencia_preco === 'number' ? pi.referencia_preco : 0
        const oldVendaPrice = typeof pi.preco_unitario === 'number' ? pi.preco_unitario : 0

        let marginToUse = pi.expand?.item_id?.expand?.linha_id?.margem_padrao ?? 7.5
        if (oldRefPrice > 0 && oldVendaPrice > 0) {
          marginToUse = (1 - oldRefPrice / oldVendaPrice) * 100
        }

        let newSellingPrice = marginToUse < 100 ? priceToUse / (1 - marginToUse / 100) : priceToUse
        newSellingPrice = Number(newSellingPrice.toFixed(3))

        let qtdeToUpdate = pi.quantidade
        if (adjustMoq && moqToUse > 0 && pi.quantidade < moqToUse) {
          qtdeToUpdate = moqToUse
        }

        const cf = cotacoesF.find((f) => f.id === w.cotacao_fornecedor_id)
        const fornecedorNome = cf?.expand?.fornecedor_id?.nome || 'Desconhecido'
        if (cf) fornecedoresNomes.add(fornecedorNome)

        promises.push(
          pb.collection('potencial_itens').update(pi.id, {
            quantidade: qtdeToUpdate,
            referencia_preco: priceToUse,
            referencia_fornecedor: fornecedorNome,
            referencia_data: new Date().toISOString(),
            preco_unitario: newSellingPrice,
          }),
        )

        promises.push(
          pb.collection('historico_precos').create({
            item_id: w.item_id,
            preco: priceToUse,
            fornecedor: fornecedorNome,
            data_cotacao: new Date().toISOString(),
            tipo: 'compra',
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

      // Limpar os drafts dos itens aceitos
      setDraftPrices((prev) => {
        const next = { ...prev }
        for (const w of winners) {
          delete next[`${w.cotacao_fornecedor_id}_${w.item_id}`]
        }
        return next
      })
      setDraftMoqs((prev) => {
        const next = { ...prev }
        for (const w of winners) {
          delete next[`${w.cotacao_fornecedor_id}_${w.item_id}`]
        }
        return next
      })

      toast({
        title: 'Sucesso',
        description: `${updatedCount} preços de compra aceitos e propagados para os itens do potencial.`,
      })
      if (onAccepted) {
        await onAccepted()
      }
      await loadData()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setMoqValidation(null)
    }
  }

  const handleAcceptCounterProposalForSupplier = async (cfId: string) => {
    const cf = cotacoesF.find((f) => f.id === cfId)
    const supplierName = cf?.expand?.fornecedor_id?.nome || 'Fabricante'

    // Buscar itens deste fornecedor que possuem contraproposta > 0
    const itemsWithCounter = cotacoesI.filter(
      (c) => c.cotacao_fornecedor_id === cfId && c.preco_contraproposta > 0,
    )

    if (itemsWithCounter.length === 0) {
      toast({
        title: 'Sem contraproposta',
        description: `Não há itens com contraproposta definida para ${supplierName}.`,
      })
      return
    }

    try {
      const promises: Promise<any>[] = []
      let updatedCount = 0

      for (const ci of itemsWithCounter) {
        const finalPrice = ci.preco_contraproposta
        const pi = potencialItens.find((p) => p.item_id === ci.item_id)
        if (!pi) continue

        // Atualizar cotacoes_itens: novo preco_ofertado = preco_contraproposta, zerar preco_contraproposta e marcar como vencedor
        promises.push(
          pb.collection('cotacoes_itens').update(ci.id, {
            preco_ofertado: finalPrice,
            preco_contraproposta: 0,
            vencedor: true,
          }),
        )

        // Desmarcar vencedor anterior se for de outro fornecedor
        const otherWinners = cotacoesI.filter(
          (c) => c.item_id === ci.item_id && c.vencedor && c.id !== ci.id,
        )
        for (const ow of otherWinners) {
          promises.push(pb.collection('cotacoes_itens').update(ow.id, { vencedor: false }))
        }

        // Atualiza preco_compra no cadastro de itens
        promises.push(pb.collection('itens').update(ci.item_id, { preco_compra: finalPrice }))

        const oldRefPrice = typeof pi.referencia_preco === 'number' ? pi.referencia_preco : 0
        const oldVendaPrice = typeof pi.preco_unitario === 'number' ? pi.preco_unitario : 0

        let marginToUse = pi.expand?.item_id?.expand?.linha_id?.margem_padrao ?? 7.5
        if (oldRefPrice > 0 && oldVendaPrice > 0) {
          marginToUse = (1 - oldRefPrice / oldVendaPrice) * 100
        }

        let newSellingPrice = marginToUse < 100 ? finalPrice / (1 - marginToUse / 100) : finalPrice
        newSellingPrice = Number(newSellingPrice.toFixed(3))

        const moqToUse = ci.quantidade_minima || 0
        let qtdeToUpdate = pi.quantidade
        if (moqToUse > 0 && pi.quantidade < moqToUse) {
          qtdeToUpdate = moqToUse
        }

        promises.push(
          pb.collection('potencial_itens').update(pi.id, {
            quantidade: qtdeToUpdate,
            referencia_preco: finalPrice,
            referencia_fornecedor: supplierName,
            referencia_data: new Date().toISOString(),
            preco_unitario: newSellingPrice,
          }),
        )

        promises.push(
          pb.collection('historico_precos').create({
            item_id: ci.item_id,
            preco: finalPrice,
            fornecedor: supplierName,
            data_cotacao: new Date().toISOString(),
            tipo: 'compra',
          }),
        )

        updatedCount++
      }

      // Marcar cotação deste fornecedor como finalizada
      promises.push(pb.collection('cotacoes_fornecedor').update(cfId, { status: 'finalizada' }))

      if (user?.id) {
        promises.push(
          pb.collection('potencial_notas').create({
            potencial_id: potencialId,
            user_id: user.id,
            conteudo: `Contraproposta aceita para ${supplierName}. Itens atualizados: ${updatedCount}.`,
            categoria: 'Cotação',
          }),
        )
      }

      await Promise.all(promises)

      // Limpar eventuais drafts deste fornecedor
      setDraftPrices((prev) => {
        const next = { ...prev }
        for (const ci of itemsWithCounter) {
          delete next[`${ci.cotacao_fornecedor_id}_${ci.item_id}`]
        }
        return next
      })

      toast({
        title: 'Contraproposta Aceita',
        description: `${updatedCount} itens da contraproposta foram aceitos e propagados para os itens do potencial.`,
      })

      if (onAccepted) {
        await onAccepted()
      }
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao aceitar contraproposta',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleExportExcel = () => {
    let csv = 'SKU;Description;Size;Finish;Quantity;Unit;'

    cotacoesF.forEach((cf) => {
      csv += `"${(cf.expand?.fornecedor_id?.nome || '').replace(/"/g, '""')} Price";`
    })
    csv += 'Lowest Price;Target Price\n'

    potencialItens.forEach((pi) => {
      const itemNode = pi.expand?.item_id
      const desc =
        itemNode?.descricao_curta_en ||
        itemNode?.descricao_curta ||
        itemNode?.descr_en ||
        itemNode?.descr_pt ||
        ''
      const extraDesc = itemNode?.descricao_extra_en || itemNode?.descricao_extra || ''
      const combinedDesc = extraDesc ? `${desc}\n\n${extraDesc}` : desc
      const sku = (itemNode?.sku || '').replace(/"/g, '""')
      const size = (itemNode?.tamanho || '').replace(/"/g, '""')
      const finish = (
        itemNode?.expand?.acabamento_id?.nome_en ||
        itemNode?.expand?.acabamento_id?.nome_pt ||
        itemNode?.expand?.acabamento_id?.codigo ||
        ''
      ).replace(/"/g, '""')
      const qty = pi.quantidade || 0
      const unit = pi.unidade_medida || 'UN'

      let row = `"${sku}";"${combinedDesc.replace(/"/g, '""')}";"${size}";"${finish}";${qty};"${unit}";`

      let currentPrices: number[] = []

      cotacoesF.forEach((cf) => {
        const draft = draftPrices[`${cf.id}_${pi.item_id}`]
        const ci = cotacoesI.find(
          (c) => c.cotacao_fornecedor_id === cf.id && c.item_id === pi.item_id,
        )
        const price = draft !== undefined ? draft : ci?.preco_ofertado || 0
        if (price > 0) currentPrices.push(price)
        row += price > 0 ? `"${price.toFixed(3).replace('.', ',')}";` : `"";`
      })

      const offeredPrice = currentPrices.length > 0 ? Math.min(...currentPrices) : 0

      let targetPrice = 0
      const winners = cotacoesI.filter((c) => c.item_id === pi.item_id && c.vencedor)
      if (winners.length > 0) {
        const draft = draftPrices[`${winners[0].cotacao_fornecedor_id}_${pi.item_id}`]
        targetPrice = draft !== undefined && draft > 0 ? draft : winners[0].preco_ofertado || 0
      } else {
        targetPrice = offeredPrice
      }

      row += `"${offeredPrice > 0 ? offeredPrice.toFixed(3).replace('.', ',') : ''}";"${targetPrice > 0 ? targetPrice.toFixed(3).replace('.', ',') : ''}"\n`
      csv += row
    })

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Comparative_Matrix_${potencialId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCounterProposal = (cf: any) => {
    let csv = 'SKU;Description;Size;Finish;Quantity;Unit;MOQ;Offered Price;Target Price\n'
    potencialItens.forEach((pi) => {
      const itemNode = pi.expand?.item_id
      const desc =
        itemNode?.descricao_curta_en ||
        itemNode?.descricao_curta ||
        itemNode?.descr_en ||
        itemNode?.descr_pt ||
        ''
      const extraDesc = itemNode?.descricao_extra_en || itemNode?.descricao_extra || ''
      const combinedDesc = extraDesc ? `${desc}\n\n${extraDesc}` : desc
      const sku = (itemNode?.sku || '').replace(/"/g, '""')
      const size = (itemNode?.tamanho || '').replace(/"/g, '""')
      const finish = (
        itemNode?.expand?.acabamento_id?.nome_en ||
        itemNode?.expand?.acabamento_id?.nome_pt ||
        itemNode?.expand?.acabamento_id?.codigo ||
        ''
      ).replace(/"/g, '""')
      const qty = pi.quantidade || 0
      const unit = pi.unidade_medida || 'UN'

      const ci = cotacoesI.find(
        (c) => c.cotacao_fornecedor_id === cf.id && c.item_id === pi.item_id,
      )
      const offered = ci?.preco_ofertado || 0
      const target = ci?.preco_contraproposta > 0 ? ci.preco_contraproposta : offered
      const moq = ci?.quantidade_minima || 0

      const offeredStr = offered > 0 ? offered.toFixed(3).replace('.', ',') : ''
      const targetStr = target > 0 ? target.toFixed(3).replace('.', ',') : ''

      csv += `"${sku}";"${combinedDesc.replace(/"/g, '""')}";"${size}";"${finish}";${qty};"${unit}";${moq};"${offeredStr}";"${targetStr}"\n`
    })

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Counter_Proposal_${cf.expand?.fornecedor_id?.nome}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportForSupplier = (cf: any) => {
    let csv = 'SKU;Description;Size;Finish;Quantity;Unit;MOQ;Offered Price;Target Price\n'
    potencialItens.forEach((pi) => {
      const itemNode = pi.expand?.item_id
      const desc =
        itemNode?.descricao_curta_en ||
        itemNode?.descricao_curta ||
        itemNode?.descr_en ||
        itemNode?.descr_pt ||
        ''
      const extraDesc = itemNode?.descricao_extra_en || itemNode?.descricao_extra || ''
      const combinedDesc = extraDesc ? `${desc}\n\n${extraDesc}` : desc
      const sku = (itemNode?.sku || '').replace(/"/g, '""')
      const size = (itemNode?.tamanho || '').replace(/"/g, '""')
      const finish = (
        itemNode?.expand?.acabamento_id?.nome_en ||
        itemNode?.expand?.acabamento_id?.nome_pt ||
        itemNode?.expand?.acabamento_id?.codigo ||
        ''
      ).replace(/"/g, '""')

      csv += `"${sku}";"${combinedDesc.replace(/"/g, '""')}";"${size}";"${finish}";${pi.quantidade};"${pi.unidade_medida || 'UN'}";"";"";""\n`
    })

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Quotation_${cf.expand?.fornecedor_id?.nome}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totals = useMemo(() => {
    let custoTotal = 0
    potencialItens.forEach((pi) => {
      const qtd = pi.quantidade || 0
      const winner = cotacoesI.find((c) => c.item_id === pi.item_id && c.vencedor)
      if (winner) {
        let draftP = draftPrices[`${winner.cotacao_fornecedor_id}_${pi.item_id}`]
        let p = draftP !== undefined ? draftP : (winner.preco_ofertado ?? 0)
        custoTotal += qtd * p
      }
    })
    return {
      custoTotal,
    }
  }, [potencialItens, cotacoesI, draftPrices])

  const formatCurrency = (val: number) =>
    val.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

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
    const haystack = [
      pi.expand?.item_id?.sku,
      pi.expand?.item_id?.descr_pt,
      pi.expand?.item_id?.descricao_curta,
      pi.expand?.item_id?.descr_en,
      pi.expand?.item_id?.descricao_curta_en,
      pi.expand?.item_id?.tamanho,
      pi.expand?.item_id?.linha_id?.nome_pt,
      pi.expand?.item_id?.acabamento_id?.nome_pt,
      pi.expand?.item_id?.acabamento_id?.codigo,
    ]
      .filter(Boolean)
      .join(' ')
    return textMatchesAll(haystack, searchTerm)
  })

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-card p-4 border rounded-xl shadow-sm gap-4 shrink-0">
        <div className="flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight whitespace-nowrap">
              Cotação de Fabricantes
            </h2>
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs px-2.5 py-0.5 whitespace-nowrap"
            >
              Cotação #{potencial?.numero_potencial || potencialId}
            </Badge>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
              Custo Selecionado
            </span>
            <span className="font-mono font-bold text-lg text-green-700 leading-tight">
              $ {formatCurrency(totals.custoTotal)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-0">
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
            className="text-muted-foreground"
            title="Alternar Densidade"
          >
            {isCompact ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>

          <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="whitespace-nowrap">
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
                <Switch id="line-filter" checked={filterByLine} onCheckedChange={setFilterByLine} />
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
                              <span title="Auditado">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                              </span>
                            )}
                            {(suppliersWithHistory.has(f.id) ||
                              suppliersWithHistory.has(f.nome)) && (
                              <span title="Possui Histórico">
                                <History className="w-3.5 h-3.5 text-muted-foreground" />
                              </span>
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCounterOpen(true)}
            className="border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 whitespace-nowrap"
          >
            <TrendingDown className="w-4 h-4 mr-2" /> Contraproposta
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="whitespace-nowrap"
          >
            <Download className="w-4 h-4 mr-2" /> Exportar Planilha (.csv)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraftPrices}
            disabled={
              isSavingDraft ||
              (Object.keys(draftPrices).length === 0 &&
                Object.keys(draftMoqs).length === 0 &&
                Object.keys(cfDrafts).length === 0)
            }
            className="border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-900 whitespace-nowrap"
            title="Salva as edições manuais de preço e condições sem finalizar a cotação"
          >
            {isSavingDraft ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Cotação
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAcceptSelected}
            className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 whitespace-nowrap"
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
                  Último Preço
                  <span className="text-[9px] font-normal text-muted-foreground block">
                    (Histórico)
                  </span>
                </TableHead>
                <TableHead className="font-semibold text-right min-w-[90px] py-2 border-r bg-muted/5">
                  Menor Oferta
                  <span className="text-[9px] font-normal text-muted-foreground block">
                    (Atual)
                  </span>
                </TableHead>
                {cotacoesF.map((cf) => (
                  <TableHead
                    key={cf.id}
                    className="min-w-[160px] bg-muted/30 border-r py-2 cursor-pointer select-none"
                    onDoubleClick={() => handleSelectAllFor(cf.id)}
                    title="Duplo clique para selecionar todos os itens deste fabricante"
                  >
                    <div className="flex flex-col items-center relative group">
                      <div className="flex items-center gap-1 w-full justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-bold text-foreground truncate max-w-[120px] text-xs cursor-pointer">
                              {cf.expand?.fornecedor_id?.nome}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="font-semibold">{cf.expand?.fornecedor_id?.nome}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Dê duplo clique para selecionar todos os itens
                            </p>
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
                              className="h-5 w-5 opacity-70 hover:opacity-100 group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => e.stopPropagation()}
                              title="Opções do Fabricante"
                            >
                              <Settings2 className="w-3 h-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-80 p-3"
                            align="center"
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => e.stopPropagation()}
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between pb-1 border-b">
                                <h4 className="font-semibold text-xs text-foreground">
                                  Opções do Fabricante
                                </h4>
                                <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                                  {cf.expand?.fornecedor_id?.nome}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs flex items-center gap-1">
                                  <Truck className="w-3 h-3 text-muted-foreground" />
                                  Incoterm
                                  <span className="text-[9px] font-normal text-muted-foreground">
                                    (desta cotação)
                                  </span>
                                </Label>
                                <Input
                                  className="h-7 text-xs bg-white"
                                  placeholder="Ex: CIF, FOB, EXW..."
                                  value={
                                    cfDrafts[cf.id]?.incoterm !== undefined
                                      ? cfDrafts[cf.id].incoterm!
                                      : cf.incoterm || ''
                                  }
                                  onChange={(e) =>
                                    setCfDrafts((prev) => ({
                                      ...prev,
                                      [cf.id]: {
                                        ...prev[cf.id],
                                        incoterm: e.target.value,
                                      },
                                    }))
                                  }
                                  title="Editar para esta cotação (não altera o cadastro do fabricante)"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  Tempo de Fabricação
                                  <span className="text-[9px] font-normal text-muted-foreground">
                                    (desta cotação)
                                  </span>
                                </Label>
                                <Input
                                  className="h-7 text-xs bg-white"
                                  placeholder="Ex: 30 a 45 dias..."
                                  value={
                                    cfDrafts[cf.id]?.tempo_fabricacao !== undefined
                                      ? cfDrafts[cf.id].tempo_fabricacao!
                                      : cf.tempo_fabricacao || ''
                                  }
                                  onChange={(e) =>
                                    setCfDrafts((prev) => ({
                                      ...prev,
                                      [cf.id]: {
                                        ...prev[cf.id],
                                        tempo_fabricacao: e.target.value,
                                      },
                                    }))
                                  }
                                  title="Editar para esta cotação (não altera o cadastro do fabricante)"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs flex items-center gap-1">
                                  <CreditCard className="w-3 h-3 text-muted-foreground" />
                                  Condição de Pagamento
                                  <span className="text-[9px] font-normal text-muted-foreground">
                                    (desta cotação)
                                  </span>
                                </Label>
                                <Input
                                  className="h-7 text-xs bg-white"
                                  placeholder="Ex: 30% sinal + 70% embarque..."
                                  value={
                                    cfDrafts[cf.id]?.condicao_pagamento !== undefined
                                      ? cfDrafts[cf.id].condicao_pagamento!
                                      : cf.condicao_pagamento || ''
                                  }
                                  onChange={(e) =>
                                    setCfDrafts((prev) => ({
                                      ...prev,
                                      [cf.id]: {
                                        ...prev[cf.id],
                                        condicao_pagamento: e.target.value,
                                      },
                                    }))
                                  }
                                  title="Editar para esta cotação (não altera o cadastro do fabricante)"
                                />
                              </div>
                              {/* Botão de salvar no painel */}
                              {(() => {
                                const hasDraftChanges =
                                  cfDrafts[cf.id] !== undefined &&
                                  (cfDrafts[cf.id]?.incoterm !== undefined ||
                                    cfDrafts[cf.id]?.tempo_fabricacao !== undefined ||
                                    cfDrafts[cf.id]?.condicao_pagamento !== undefined)
                                const isSavingThisCf = !!savingCfIds[cf.id]

                                return (
                                  <Button
                                    size="sm"
                                    className="w-full text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shadow-xs"
                                    disabled={isSavingThisCf || !hasDraftChanges}
                                    onClick={() => handleSaveSupplierOptions(cf.id)}
                                  >
                                    {isSavingThisCf ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Save className="w-3.5 h-3.5" />
                                    )}
                                    {isSavingThisCf ? 'Salvando...' : 'Salvar Condições'}
                                  </Button>
                                )
                              })()}
                              <div className="pt-2 border-t flex flex-col gap-1.5">
                                {(() => {
                                  const countWithCounter = cotacoesI.filter(
                                    (c) =>
                                      c.cotacao_fornecedor_id === cf.id &&
                                      c.preco_contraproposta > 0,
                                  ).length
                                  return (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full justify-start text-xs h-7 bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 font-medium"
                                      disabled={countWithCounter === 0}
                                      title={
                                        countWithCounter > 0
                                          ? `Aceita a contraproposta para ${countWithCounter} item(ns) deste fabricante`
                                          : 'Nenhum item com contraproposta definida'
                                      }
                                      onClick={() => handleAcceptCounterProposalForSupplier(cf.id)}
                                    >
                                      <TrendingDown className="w-3 h-3 mr-2 text-amber-600" />
                                      Aceitar Contraproposta{' '}
                                      {countWithCounter > 0 && `(${countWithCounter})`}
                                    </Button>
                                  )
                                })()}
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
                                  onClick={() => handleExportCounterProposal(cf)}
                                >
                                  <Download className="w-3 h-3 mr-2" /> Exportar Contra-proposta
                                </Button>
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
                                    accept=".csv,.xlsx,.xls"
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
                                    <FileUp className="w-3 h-3 mr-2" /> Importar Preços
                                  </Button>
                                </div>
                              </div>{' '}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {(() => {
                        const isFinalizada = cf.status === 'finalizada'
                        return isFinalizada ? (
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
                        )
                      })()}

                      {/* Informações comerciais desta cotação (Incoterm, Fabricação, Pagamento) */}
                      {(() => {
                        const effectiveIncoterm =
                          cfDrafts[cf.id]?.incoterm !== undefined
                            ? cfDrafts[cf.id].incoterm
                            : cf.incoterm || cf.expand?.fornecedor_id?.incoterm || ''
                        const effectiveTempo =
                          cfDrafts[cf.id]?.tempo_fabricacao !== undefined
                            ? cfDrafts[cf.id].tempo_fabricacao
                            : cf.tempo_fabricacao ||
                              cf.expand?.fornecedor_id?.tempo_fabricacao ||
                              ''
                        const effectivePagamento =
                          cfDrafts[cf.id]?.condicao_pagamento !== undefined
                            ? cfDrafts[cf.id].condicao_pagamento
                            : cf.condicao_pagamento ||
                              cf.expand?.fornecedor_id?.condicao_pagamento ||
                              ''

                        const hasAnyCondition =
                          !!effectiveIncoterm || !!effectiveTempo || !!effectivePagamento

                        if (!hasAnyCondition) {
                          return (
                            <span className="text-[9px] text-muted-foreground/60 italic mt-1">
                              Sem condições cadastradas
                            </span>
                          )
                        }

                        return (
                          <div className="w-full flex flex-col gap-0.5 mt-1 pt-1 border-t border-border/50 text-[10px] text-left">
                            {effectiveIncoterm && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-default">
                                    <Truck className="w-2.5 h-2.5 shrink-0 text-blue-600" />
                                    <span className="font-medium text-foreground shrink-0 text-[9px]">
                                      Incoterm:
                                    </span>
                                    <span className="truncate font-semibold text-[9px] text-blue-700 bg-blue-50/70 px-1 py-0.2 rounded border border-blue-200/60 max-w-[100px]">
                                      {effectiveIncoterm}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                  <p>
                                    <strong>Incoterm:</strong> {effectiveIncoterm}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {effectiveTempo && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-default">
                                    <Clock className="w-2.5 h-2.5 shrink-0 text-blue-600" />
                                    <span className="font-medium text-foreground shrink-0 text-[9px]">
                                      Fabricação:
                                    </span>
                                    <span className="truncate text-[9px] text-muted-foreground max-w-[100px]">
                                      {effectiveTempo}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                  <p>
                                    <strong>Tempo de Fabricação:</strong> {effectiveTempo}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {effectivePagamento && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-default">
                                    <CreditCard className="w-2.5 h-2.5 shrink-0 text-blue-600" />
                                    <span className="font-medium text-foreground shrink-0 text-[9px]">
                                      Pagamento:
                                    </span>
                                    <span className="truncate text-[9px] text-muted-foreground max-w-[100px]">
                                      {effectivePagamento}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                  <p>
                                    <strong>Condição de Pagamento:</strong> {effectivePagamento}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPotencialItens.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4 + cotacoesF.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {potencialItens.length === 0
                      ? 'Nenhum item adicionado a este potencial.'
                      : 'Nenhum item encontrado para a busca.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPotencialItens.map((pi) => {
                  const currentPrices = cotacoesF.map((cf) => {
                    const ci = cotacoesI.find(
                      (c) => c.cotacao_fornecedor_id === cf.id && c.item_id === pi.item_id,
                    )
                    const draft = draftPrices[`${cf.id}_${pi.item_id}`]
                    if (draft !== undefined) return draft
                    return ci?.preco_ofertado || 0
                  })
                  const validCurrentPrices = currentPrices.filter((p) => p > 0)
                  const lowestCurrentPrice =
                    validCurrentPrices.length > 0 ? Math.min(...validCurrentPrices) : undefined

                  return (
                    <TableRow key={pi.id} className="group hover:bg-transparent">
                      <TableCell
                        className={cn('align-top px-3 border-r', isCompact ? 'py-1' : 'py-1.5')}
                      >
                        {(() => {
                          const extraDesc =
                            pi.expand?.item_id?.descricao_extra_en ||
                            pi.expand?.item_id?.descricao_extra ||
                            ''
                          const content = (
                            <div className={cn(extraDesc && 'cursor-help')}>
                              <div className="font-semibold text-xs">{pi.expand?.item_id?.sku}</div>
                              <div className="text-[10px] text-muted-foreground line-clamp-2 pr-2">
                                {pi.expand?.item_id?.descr_en ||
                                  pi.expand?.item_id?.descricao_curta}
                              </div>
                            </div>
                          )

                          return extraDesc ? (
                            <Tooltip>
                              <TooltipTrigger asChild>{content}</TooltipTrigger>
                              <TooltipContent
                                side="right"
                                className="max-w-[300px] whitespace-pre-wrap text-xs"
                              >
                                {extraDesc}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            content
                          )
                        })()}
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
                        {(() => {
                          const hist = latestHistorico[pi.item_id]
                          if (hist && hist.preco > 0) {
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-mono text-xs text-blue-600 font-bold cursor-help underline decoration-dashed underline-offset-2">
                                    $ {formatCurrency(hist.preco)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-semibold">
                                    Fornecedor: {hist.fornecedor || 'Não informado'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Data do Preço:{' '}
                                    {new Date(hist.data_cotacao).toLocaleDateString()}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )
                          }
                          return (
                            <span className="font-mono text-xs text-blue-600 font-bold">N/A</span>
                          )
                        })()}
                      </TableCell>

                      <TableCell
                        className={cn(
                          'align-middle px-2 text-right border-r bg-emerald-50/40',
                          isCompact ? 'py-1' : 'py-1.5',
                        )}
                      >
                        {lowestCurrentPrice ? (
                          <span className="font-mono text-xs text-emerald-700 font-bold">
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
                        const isWinnerCell = ci?.vencedor

                        return (
                          <TableCell
                            key={cf.id}
                            className={cn(
                              'align-top px-1 border-r transition-colors relative',
                              isCompact ? 'py-0.5' : 'py-1',
                              isWinnerCell
                                ? 'bg-blue-100/70'
                                : 'bg-background/50 hover:bg-muted/20',
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
                <TableCell colSpan={4} className="text-right font-semibold py-2 border-r text-xs">
                  Valor Total:
                </TableCell>
                {cotacoesF.map((cf) => {
                  let total = 0
                  potencialItens.forEach((pi) => {
                    const ci = cotacoesI.find(
                      (c) => c.cotacao_fornecedor_id === cf.id && c.item_id === pi.item_id,
                    )
                    const draft = draftPrices[`${cf.id}_${pi.item_id}`]
                    const price = draft !== undefined ? draft : (ci?.preco_ofertado ?? 0)
                    total += price * (pi.quantidade || 0)
                  })
                  return (
                    <TableCell
                      key={`tot-${cf.id}`}
                      className="text-center font-mono font-bold py-2 border-r text-foreground bg-background/50 text-xs text-green-700"
                    >
                      $ {formatCurrency(total)}
                    </TableCell>
                  )
                })}
              </TableRow>
              <TableRow className="bg-amber-50/50">
                <TableCell
                  colSpan={4}
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
                      const price = draft !== undefined ? draft : (ci.preco_ofertado ?? 0)
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
        <div className="shrink-0 flex flex-col gap-4 mb-4">
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
