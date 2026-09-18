import {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
  useMemo,
  useCallback,
} from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Search,
  Plus,
  ArrowLeft,
  Save,
  CheckCircle,
  Copy,
  Truck,
  CreditCard,
  Clock,
  RotateCcw,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { ProductCatalog } from './components/ProductCatalog'
import { QuickItemModal } from './components/QuickItemModal'
import { SearchQuoteModal } from './components/SearchQuoteModal'
import { PotencialForm } from './components/PotencialForm'
import { SelectedItemsTable } from './components/SelectedItemsTable'
import { PotentialNotes } from './components/PotentialNotes'
import { PotentialAttachments } from './components/PotentialAttachments'
import { StatusManagementModal } from './components/StatusManagementModal'
import { savePotencialFull, getPotencialItens, duplicatePotencial } from '@/services/potenciais'
import { getContrastColor, cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import type { Potencial, Item, UnidadeMedida, StatusPotencial } from '@/types'

export type SelectedItemData = {
  item: Item
  quantidade: number | ''
  unidade_medida: string
  preco_unitario: number | ''
  observacoes: string
  ordem?: number
  referencia_preco?: number
  referencia_fornecedor?: string
  referencia_data?: string
}

export type SelectedItemRecord = {
  id: string
  recordId?: string
  data: SelectedItemData
}

export type AddItemsToPotentialRef = {
  reloadItemsPrices: () => Promise<void>
  reloadQuotationConditions?: () => Promise<void>
  isDirty?: () => boolean
}

export const AddItemsToPotential = forwardRef<AddItemsToPotentialRef, {}>((_props, ref) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [currentPotential, setCurrentPotential] = useState<Potencial | null>(null)

  const [formData, setFormData] = useState({
    numero_potencial: '',
    cliente: '',
    nome_potencial: '',
    nome_comprador: '',
    proprietario: '',
    estagio_id: '',
    observacoes: '',
    status: 'Sem Itens',
    incoterm_cliente: '',
    condicao_pagamento_cliente: '',
    tempo_fabricacao_cliente: '',
  })
  const [condicoesManuais, setCondicoesManuais] = useState({
    incoterm: false,
    condicao_pagamento: false,
    tempo_fabricacao: false,
  })

  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [lastOfferedPrices, setLastOfferedPrices] = useState<Record<string, number>>({})

  // Track initial state to detect unsaved changes
  const initialSnapshotRef = useRef<string>('')
  const isSavedRef = useRef<boolean>(false)

  const buildSnapshot = (data: typeof formData, items: typeof selectedItems) => {
    return JSON.stringify({
      formData: {
        numero_potencial: data.numero_potencial || '',
        cliente: data.cliente || '',
        nome_potencial: data.nome_potencial || '',
        nome_comprador: data.nome_comprador || '',
        proprietario: data.proprietario || '',
        estagio_id: data.estagio_id || '',
        observacoes: data.observacoes || '',
        status: data.status || 'Sem Itens',
        incoterm_cliente: data.incoterm_cliente || '',
        condicao_pagamento_cliente: data.condicao_pagamento_cliente || '',
        tempo_fabricacao_cliente: data.tempo_fabricacao_cliente || '',
      },
      items: items.map((si) => ({
        item_id: si.id,
        quantidade: Number(si.data?.quantidade) || 0,
        unidade_medida: si.data?.unidade_medida || 'Pcs',
        preco_unitario: Number(si.data?.preco_unitario) || 0,
        observacoes: si.data?.observacoes || '',
      })),
    })
  }

  const [isSelecting, setIsSelecting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSearchQuoteOpen, setIsSearchQuoteOpen] = useState(false)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [itemToEdit, setItemToEdit] = useState<Partial<Item> | undefined>(undefined)
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([])
  const [statuses, setStatuses] = useState<StatusPotencial[]>([])
  const [fornecedorCotacoes, setFornecedorCotacoes] = useState<any[]>([])
  const [cotacoesItens, setCotacoesItens] = useState<any[]>([])

  const loadStatuses = () => {
    pb.collection('status_potencial')
      .getFullList<StatusPotencial>({ sort: 'created' })
      .then(setStatuses)
      .catch(console.error)
  }

  useEffect(() => {
    pb.collection('unidades_medida')
      .getFullList<UnidadeMedida>()
      .then(setUnidades)
      .catch(console.error)
    loadStatuses()
  }, [])

  const loadQuotationConditionsData = useCallback(
    async (potId?: string) => {
      const targetId = potId || currentPotential?.id
      if (!targetId) {
        setFornecedorCotacoes([])
        setCotacoesItens([])
        return
      }
      try {
        const [cfs, cis] = await Promise.all([
          pb.collection('cotacoes_fornecedor').getFullList({
            filter: `potencial_id="${targetId}"`,
            expand: 'fornecedor_id',
            sort: 'created',
          }),
          pb.collection('cotacoes_itens').getFullList({
            filter: `cotacao_fornecedor_id.potencial_id="${targetId}"`,
            expand: 'cotacao_fornecedor_id,item_id',
          }),
        ])
        setFornecedorCotacoes(cfs)
        setCotacoesItens(cis)
      } catch (err) {
        console.error('Erro ao carregar cotações para condições comerciais:', err)
      }
    },
    [currentPotential?.id],
  )

  useEffect(() => {
    loadQuotationConditionsData()
  }, [loadQuotationConditionsData])

  useRealtime('cotacoes_itens', () => {
    loadQuotationConditionsData()
  })
  useRealtime('cotacoes_fornecedor', () => {
    loadQuotationConditionsData()
  })

  useEffect(() => {
    const id = searchParams.get('id')
    if (id && !currentPotential) {
      pb.collection('potenciais')
        .getOne(id)
        .then((quote) => handleQuoteSelected(quote as Potencial))
        .catch(() => toast.error('Erro ao carregar a cotação a partir da URL.'))
    }
  }, [searchParams])

  useEffect(() => {
    const loadLastOfferedPrices = async () => {
      const itemIds = selectedItems.map((si) => si.id)
      if (itemIds.length === 0 || !formData.cliente) {
        setLastOfferedPrices({})
        return
      }
      const result: Record<string, number> = {}
      const chunkSize = 50
      const currentPotId = currentPotential?.id || ''
      const clienteEscaped = formData.cliente.replace(/"/g, '')
      for (let i = 0; i < itemIds.length; i += chunkSize) {
        const chunk = itemIds.slice(i, i + chunkSize)
        const itemFilter = chunk.map((id) => `item_id="${id}"`).join(' || ')
        let filter = `(${itemFilter}) && tipo="venda" && cliente="${clienteEscaped}"`
        if (currentPotId) {
          filter += ` && potencial_id!="${currentPotId}"`
        }
        try {
          const records = await pb.collection('historico_precos').getFullList({
            filter,
            sort: '-data_cotacao,-created',
            fields: 'item_id,preco',
          })
          for (const r of records) {
            if (!result[r.item_id]) {
              result[r.item_id] = r.preco
            }
          }
        } catch (err) {
          console.error('Failed to load last offered prices', err)
        }
      }
      setLastOfferedPrices(result)
    }
    loadLastOfferedPrices()
  }, [selectedItems, currentPotential, formData.cliente])

  const handleToggleItem = (item: Item) => {
    setSelectedItems((prev) => {
      const idx = prev.findIndex((si) => si.id === item.id)
      if (idx >= 0) {
        return prev.filter((si) => si.id !== item.id)
      } else {
        const unidadeObj = unidades.find((u) => u.id === item.unidade_id)
        const unidadeNome = unidadeObj ? unidadeObj.nome : item.unidade || 'Pcs'
        const initialCost =
          typeof item.preco_compra === 'number' && item.preco_compra > 0
            ? item.preco_compra
            : undefined
        const initialSupplier = item.fornecedor_ultima_atualizacao || undefined

        return [
          ...prev,
          {
            id: item.id,
            data: {
              item,
              quantidade: 1,
              unidade_medida: unidadeNome,
              preco_unitario: item.preco_venda !== undefined ? item.preco_venda : '',
              observacoes: '',
              ordem: prev.length + 1,
              referencia_preco: initialCost,
              referencia_fornecedor: initialSupplier,
              referencia_data: initialCost ? new Date().toISOString() : undefined,
            },
          },
        ]
      }
    })
  }

  const handleUpdateItem = (id: string, field: keyof SelectedItemData, value: string) => {
    setSelectedItems((prev) =>
      prev.map((si) => {
        if (si.id === id) {
          let parsedValue: any = value
          if (field === 'quantidade' || field === 'preco_unitario') {
            parsedValue = value === '' ? '' : Number(value)
          }
          return { ...si, data: { ...si.data, [field]: parsedValue } }
        }
        return si
      }),
    )
  }

  const handleRemoveItem = async (id: string) => {
    const existing = selectedItems.find((si) => si.id === id)
    setSelectedItems((prev) => prev.filter((si) => si.id !== id))

    if (existing?.recordId) {
      try {
        await pb.collection('potencial_itens').delete(existing.recordId)
      } catch (err) {
        console.error('Failed to remove from DB', err)
      }
    }
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    setSelectedItems((prev) => {
      const next = [...prev]
      const temp = next[index - 1]
      next[index - 1] = next[index]
      next[index] = temp
      return next
    })
  }

  const handleMoveDown = (index: number) => {
    if (index === selectedItems.length - 1) return
    setSelectedItems((prev) => {
      const next = [...prev]
      const temp = next[index + 1]
      next[index + 1] = next[index]
      next[index] = temp
      return next
    })
  }

  const handleSave = async (statusOverride: 'Incompleto' | 'Completo' | null = null) => {
    if (!formData.numero_potencial) {
      return toast.error('O número da cotação é obrigatório.')
    }
    if (statusOverride === 'Completo') {
      const hasIncomplete = selectedItems.some((si) => !si.data.quantidade)
      if (hasIncomplete) {
        return toast.error('Preencha a quantidade para todos os itens antes de concluir.')
      }
    }

    setIsSaving(true)
    try {
      let statusToSave = formData.status
      if (statusOverride) {
        statusToSave = selectedItems.length === 0 ? 'Sem Itens' : statusOverride
      }

      const itemsData = selectedItems
        .filter((si) => Number(si.data.quantidade) > 0)
        .map((si, index) => ({
          item_id: si.id,
          quantidade: Number(si.data.quantidade),
          unidade_medida: si.data.unidade_medida,
          preco_unitario: Number(si.data.preco_unitario) || 0,
          observacoes: si.data.observacoes,
          ordem: index + 1,
          referencia_preco: si.data.referencia_preco,
          referencia_fornecedor: si.data.referencia_fornecedor,
          referencia_data: si.data.referencia_data,
        }))

      const saved = await savePotencialFull(
        currentPotential?.id || null,
        { ...formData, status: statusToSave },
        itemsData,
      )

      setCurrentPotential(saved)
      setFormData((prev) => ({ ...prev, status: statusToSave }))

      // Update snapshot of saved state immediately with the saved values
      isSavedRef.current = true
      initialSnapshotRef.current = JSON.stringify({
        formData: {
          numero_potencial: saved.numero_potencial || '',
          cliente: saved.cliente || '',
          nome_potencial: saved.nome_potencial || '',
          nome_comprador: saved.nome_comprador || '',
          proprietario: saved.proprietario || '',
          estagio_id: saved.estagio_id || '',
          observacoes: saved.observacoes || '',
          status: statusToSave,
          incoterm_cliente: saved.incoterm_cliente || '',
          condicao_pagamento_cliente: saved.condicao_pagamento_cliente || '',
          tempo_fabricacao_cliente: saved.tempo_fabricacao_cliente || '',
        },
        items: itemsData.map((item) => ({
          item_id: item.item_id,
          quantidade: Number(item.quantidade) || 0,
          unidade_medida: item.unidade_medida || 'Pcs',
          preco_unitario: Number(item.preco_unitario) || 0,
          observacoes: item.observacoes || '',
        })),
      })

      toast.success(`Cotação ${saved.numero_potencial} salva com sucesso!`, {
        className: 'bg-green-500 text-white border-none',
      })

      if (!currentPotential) {
        navigate(`/potenciais/adicionar?id=${saved.id}`, { replace: true })
        await handleQuoteSelected(saved)
      } else {
        await handleQuoteSelected(saved)
      }
    } catch (error) {
      toast.error('Erro ao salvar a cotação.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDuplicate = async () => {
    if (!currentPotential) return
    if (!confirm('Deseja duplicar esta cotação? Isso criará uma cópia idêntica.')) return

    setIsSaving(true)
    try {
      const newPotencial = await duplicatePotencial(currentPotential.id)
      toast.success('Cotação duplicada com sucesso!')
      navigate(`/potenciais/adicionar?id=${newPotencial.id}`, { replace: true })
      handleQuoteSelected(newPotencial as unknown as Potencial)
    } catch (err) {
      toast.error('Erro ao duplicar cotação.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleQuoteSelected = async (quote: Potencial) => {
    setCurrentPotential(quote)
    setFormData({
      numero_potencial: quote.numero_potencial || '',
      cliente: quote.cliente || '',
      nome_potencial: quote.nome_potencial || '',
      nome_comprador: quote.nome_comprador || '',
      proprietario: quote.proprietario || '',
      estagio_id: quote.estagio_id || '',
      observacoes: quote.observacoes || '',
      status: quote.status || 'Sem Itens',
      incoterm_cliente: quote.incoterm_cliente || '',
      condicao_pagamento_cliente: quote.condicao_pagamento_cliente || '',
      tempo_fabricacao_cliente: quote.tempo_fabricacao_cliente || '',
    })
    setCondicoesManuais({
      incoterm: !!quote.incoterm_cliente,
      condicao_pagamento: !!quote.condicao_pagamento_cliente,
      tempo_fabricacao: !!quote.tempo_fabricacao_cliente,
    })
    setIsSearchQuoteOpen(false)

    try {
      const items = await getPotencialItens(quote.id)
      const formattedItems = items.map((pi) => ({
        id: pi.item_id,
        recordId: pi.id,
        data: {
          item: pi.expand?.item_id || ({ id: pi.item_id } as any),
          quantidade: pi.quantidade,
          unidade_medida: pi.unidade_medida || 'Pcs',
          preco_unitario: pi.preco_unitario !== undefined ? pi.preco_unitario : '',
          observacoes: pi.observacoes || '',
          ordem: pi.ordem || 0,
          referencia_preco: pi.referencia_preco,
          referencia_fornecedor: pi.referencia_fornecedor,
          referencia_data: pi.referencia_data,
        },
      }))

      formattedItems.sort((a, b) => (a.data.ordem || 0) - (b.data.ordem || 0))
      setSelectedItems(formattedItems)

      // Set clean initial snapshot when loaded from search or URL
      initialSnapshotRef.current = buildSnapshot(quote as any, formattedItems)
      isSavedRef.current = false

      toast.success('Cotação carregada com sucesso!')
    } catch (error) {
      toast.error('Erro ao carregar itens da cotação.')
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => isDirty(),
      reloadQuotationConditions: async () => {
        const targetPotencialId =
          currentPotential?.id ||
          searchParams.get('id') ||
          searchParams.get('potencialId') ||
          searchParams.get('potencial_id')
        if (targetPotencialId) {
          await loadQuotationConditionsData(targetPotencialId)
        }
      },
      reloadItemsPrices: async () => {
        const targetPotencialId =
          currentPotential?.id ||
          searchParams.get('id') ||
          searchParams.get('potencialId') ||
          searchParams.get('potencial_id')
        if (!targetPotencialId) return
        try {
          const updatedItems = await pb.collection('potencial_itens').getFullList({
            filter: `potencial_id="${targetPotencialId}"`,
            expand: 'item_id,item_id.linha_id,item_id.acabamento_id',
            sort: 'ordem',
          })
          const itemMapById = new Map<string, any>()
          const itemMapByItemId = new Map<string, any>()
          updatedItems.forEach((it) => {
            itemMapById.set(it.id, it)
            if (it.item_id) {
              itemMapByItemId.set(it.item_id, it)
            }
          })
          setSelectedItems((prev) => {
            if (prev.length === 0 && updatedItems.length > 0) {
              return updatedItems.map((pi) => ({
                id: pi.item_id,
                recordId: pi.id,
                data: {
                  item: pi.expand?.item_id || ({ id: pi.item_id } as any),
                  quantidade: pi.quantidade,
                  unidade_medida: pi.unidade_medida || 'Pcs',
                  preco_unitario: pi.preco_unitario !== undefined ? pi.preco_unitario : '',
                  observacoes: pi.observacoes || '',
                  ordem: pi.ordem || 0,
                  referencia_preco: pi.referencia_preco,
                  referencia_fornecedor: pi.referencia_fornecedor,
                  referencia_data: pi.referencia_data,
                },
              }))
            }

            return prev.map((si) => {
              const it = (si.recordId && itemMapById.get(si.recordId)) || itemMapByItemId.get(si.id)
              if (it) {
                return {
                  ...si,
                  recordId: it.id,
                  data: {
                    ...si.data,
                    quantidade: it.quantidade !== undefined ? it.quantidade : si.data.quantidade,
                    preco_unitario:
                      typeof it.preco_unitario === 'number'
                        ? it.preco_unitario
                        : si.data.preco_unitario,
                    referencia_preco: it.referencia_preco,
                    referencia_fornecedor: it.referencia_fornecedor,
                    referencia_data: it.referencia_data,
                  },
                }
              }
              return si
            })
          })
        } catch (err) {
          console.error('Failed to reload items prices', err)
        }
      },
    }),
    [currentPotential?.id, searchParams],
  )

  // Unsaved changes detection for beforeunload and navigation
  const isDirty = () => {
    // If empty new quote with nothing filled, not dirty
    const isEmptyNew =
      !currentPotential &&
      !formData.numero_potencial &&
      !formData.cliente &&
      !formData.nome_potencial &&
      !formData.nome_comprador &&
      !formData.proprietario &&
      !formData.estagio_id &&
      !formData.observacoes &&
      selectedItems.length === 0

    if (isEmptyNew) return false

    // Compare with snapshot using consistent builder
    const currentSimplified = buildSnapshot(formData, selectedItems)

    return currentSimplified !== initialSnapshotRef.current
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty()) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  })

  const handleItemSaved = (newItem: Item) => {
    setSelectedItems((prev) => {
      const unidadeObj = unidades.find((u) => u.id === newItem.unidade_id)
      const unidadeNome = unidadeObj ? unidadeObj.nome : newItem.unidade || 'Pcs'
      const initialCost =
        typeof newItem.preco_compra === 'number' && newItem.preco_compra > 0
          ? newItem.preco_compra
          : undefined
      const initialSupplier = newItem.fornecedor_ultima_atualizacao || undefined

      return [
        ...prev,
        {
          id: newItem.id,
          data: {
            item: newItem,
            quantidade: 1,
            unidade_medida: unidadeNome,
            preco_unitario: newItem.preco_venda !== undefined ? newItem.preco_venda : '',
            observacoes: '',
            ordem: prev.length + 1,
            referencia_preco: initialCost,
            referencia_fornecedor: initialSupplier,
            referencia_data: initialCost ? new Date().toISOString() : undefined,
          },
        },
      ]
    })
  }

  const getStatusBadge = () => {
    if (selectedItems.length === 0) {
      return (
        <Badge
          variant="secondary"
          className="border-0 font-normal rounded-full px-2 h-5 text-[10px]"
        >
          Sem Itens
        </Badge>
      )
    }
    const dynamicStatus = statuses.find((s) => s.nome === formData.status)
    if (dynamicStatus && dynamicStatus.cor_hex) {
      return (
        <Badge
          style={{
            backgroundColor: dynamicStatus.cor_hex,
            color: getContrastColor(dynamicStatus.cor_hex),
          }}
          className="border-0 font-normal rounded-full px-2 h-5 text-[10px] shadow-none whitespace-nowrap"
        >
          {formData.status}
        </Badge>
      )
    }
    const hasIncomplete = selectedItems.some((si) => !si.data.quantidade || !si.data.preco_unitario)
    if (!hasIncomplete && formData.status === 'Completo') {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 font-normal rounded-full px-2 h-5 text-[10px]">
          Completo
        </Badge>
      )
    }
    return (
      <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200 font-normal rounded-full px-2 h-5 text-[10px]">
        {formData.status}
      </Badge>
    )
  }

  const calculateTotals = () => {
    const totalSKUs = new Set(selectedItems.map((si) => si.id)).size
    const totalQty = selectedItems.reduce((acc, si) => acc + (Number(si.data.quantidade) || 0), 0)
    const totalValue = selectedItems.reduce(
      (acc, si) => acc + (Number(si.data.quantidade) || 0) * (Number(si.data.preco_unitario) || 0),
      0,
    )
    const totalCostRef = selectedItems.reduce((acc, si) => {
      const qty = Number(si.data.quantidade) || 0
      const refPrice =
        typeof si.data.referencia_preco === 'number' && !isNaN(si.data.referencia_preco)
          ? si.data.referencia_preco
          : 0
      return acc + (refPrice > 0 ? qty * refPrice : 0)
    }, 0)
    const profitValue = totalValue - totalCostRef
    const profitPercent = totalValue > 0 ? (profitValue / totalValue) * 100 : null

    return { totalSKUs, totalQty, totalValue, totalCostRef, profitValue, profitPercent }
  }

  const { totalSKUs, totalQty, totalValue, totalCostRef, profitValue, profitPercent } =
    calculateTotals()

  // Fornecedores efetivamente aceitos na Cotação de Fabricantes (somente com itens vencedores vigentes)
  const fornecedoresAceitosComValor = useMemo(() => {
    // Identificar fornecedores que têm itens vencedores vigentes para itens atualmente na cotação
    const supplierWinningTotals = new Map<
      string,
      { cf: any; valorTotal: number; numItens: number }
    >()

    // Criar mapa de itens de potencial por item_id para pegar quantidades
    const itemQtyMap = new Map<string, number>()
    selectedItems.forEach((si) => {
      itemQtyMap.set(si.id, Number(si.data.quantidade) || 0)
    })

    // Analisar cotacoesItens apenas dos itens vencedores vigentes da cotação atual
    cotacoesItens.forEach((ci) => {
      if (ci.vencedor && itemQtyMap.has(ci.item_id)) {
        const cfId = ci.cotacao_fornecedor_id
        const cf = fornecedorCotacoes.find((f) => f.id === cfId)
        if (cf) {
          const qty = itemQtyMap.get(ci.item_id) || 0
          const preco =
            typeof ci.preco_ofertado === 'number' ? ci.preco_ofertado : Number(ci.preco) || 0
          const subtotal = qty * preco

          const current = supplierWinningTotals.get(cf.id) || { cf, valorTotal: 0, numItens: 0 }
          current.valorTotal += subtotal
          current.numItens += 1
          supplierWinningTotals.set(cf.id, current)
        }
      }
    })

    return Array.from(supplierWinningTotals.values())
  }, [fornecedorCotacoes, cotacoesItens, selectedItems])

  // Cálculo automático das condições comerciais para o cliente
  const condicoesSugeridas = useMemo(() => {
    if (fornecedoresAceitosComValor.length === 0) {
      return {
        incoterm: '',
        condicao_pagamento: '',
        tempo_fabricacao: '',
      }
    }

    if (fornecedoresAceitosComValor.length === 1) {
      const unico = fornecedoresAceitosComValor[0].cf
      return {
        incoterm: unico.incoterm || '',
        condicao_pagamento: unico.condicao_pagamento || '',
        tempo_fabricacao: unico.tempo_fabricacao || '',
      }
    }

    // 2 ou mais fornecedores aceitos:
    // 1. Incoterm do fornecedor com MAIOR pedido (maior valor total aceito)
    const sortedByValor = [...fornecedoresAceitosComValor].sort(
      (a, b) => b.valorTotal - a.valorTotal,
    )
    const fornecedorMaiorPedido = sortedByValor[0]?.cf
    const incotermCalculado = fornecedorMaiorPedido?.incoterm || ''

    // 2. Tempo de fabricação = MAIOR prazo entre os aceitos
    // Extrai números de prazo (ex: "30 dias" -> 30) se possível, senão pega a string mais longa ou maior número
    let maiorPrazoTexto = ''
    let maiorPrazoNumero = -1
    fornecedoresAceitosComValor.forEach(({ cf }) => {
      const tf = (cf.tempo_fabricacao || '').trim()
      if (!tf) return
      const matches = tf.match(/\d+/)
      const num = matches ? parseInt(matches[0], 10) : 0
      if (num > maiorPrazoNumero) {
        maiorPrazoNumero = num
        maiorPrazoTexto = tf
      } else if (maiorPrazoNumero <= 0 && tf.length > maiorPrazoTexto.length) {
        maiorPrazoTexto = tf
      }
    })

    return {
      incoterm: incotermCalculado,
      condicao_pagamento: '', // Condição própria para o cliente quando 2+ fornecedores
      tempo_fabricacao: maiorPrazoTexto,
    }
  }, [fornecedoresAceitosComValor])

  // Auto-preenchimento ou atualização automática das condições para o cliente quando não editado manualmente
  useEffect(() => {
    if (fornecedoresAceitosComValor.length === 0) return

    setFormData((prev) => {
      let changed = false
      const updated = { ...prev }

      // Se incoterm não foi editado manualmente pelo usuário, atualizar para a sugestão atual
      if (
        !condicoesManuais.incoterm &&
        condicoesSugeridas.incoterm &&
        prev.incoterm_cliente !== condicoesSugeridas.incoterm
      ) {
        updated.incoterm_cliente = condicoesSugeridas.incoterm
        changed = true
      }
      if (
        !condicoesManuais.condicao_pagamento &&
        condicoesSugeridas.condicao_pagamento &&
        prev.condicao_pagamento_cliente !== condicoesSugeridas.condicao_pagamento
      ) {
        updated.condicao_pagamento_cliente = condicoesSugeridas.condicao_pagamento
        changed = true
      }
      if (
        !condicoesManuais.tempo_fabricacao &&
        condicoesSugeridas.tempo_fabricacao &&
        prev.tempo_fabricacao_cliente !== condicoesSugeridas.tempo_fabricacao
      ) {
        updated.tempo_fabricacao_cliente = condicoesSugeridas.tempo_fabricacao
        changed = true
      }

      return changed ? updated : prev
    })
  }, [condicoesSugeridas, fornecedoresAceitosComValor, condicoesManuais])

  const handleRecalcularCondicoes = () => {
    setFormData((prev) => ({
      ...prev,
      incoterm_cliente: condicoesSugeridas.incoterm || prev.incoterm_cliente,
      condicao_pagamento_cliente:
        fornecedoresAceitosComValor.length === 1
          ? condicoesSugeridas.condicao_pagamento || prev.condicao_pagamento_cliente
          : prev.condicao_pagamento_cliente,
      tempo_fabricacao_cliente:
        condicoesSugeridas.tempo_fabricacao || prev.tempo_fabricacao_cliente,
    }))
    setCondicoesManuais({
      incoterm: false,
      condicao_pagamento: false,
      tempo_fabricacao: false,
    })
    toast.success('Condições comerciais recalculadas a partir dos fornecedores aceitos!')
  }

  if (isSelecting) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6 max-w-[1600px] mx-auto w-full bg-slate-50/50">
        <div className="flex items-center justify-between mb-4 shrink-0 bg-white p-3 rounded-lg border shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsSelecting(false)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Catálogo de Produtos</h1>
              <p className="text-xs text-muted-foreground">
                Selecione os itens para a cotação {formData.numero_potencial || 'Nova Cotação'}
              </p>
            </div>
          </div>
          <Button size="sm" className="rounded-full h-8 px-4" onClick={() => setIsSelecting(false)}>
            Concluir ({selectedItems.length})
          </Button>
        </div>
        <div className="flex-1 min-h-0">
          <ProductCatalog
            selectedItems={selectedItems}
            onToggle={handleToggleItem}
            onUpdateItem={handleUpdateItem}
            onAddNew={() => {
              setItemToEdit(undefined)
              setIsItemModalOpen(true)
            }}
            onDuplicate={(item) => {
              setItemToEdit(item)
              setIsItemModalOpen(true)
            }}
          />
        </div>
        <QuickItemModal
          open={isItemModalOpen}
          onOpenChange={setIsItemModalOpen}
          initialData={itemToEdit}
          onSaved={handleItemSaved}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col p-4 md:p-6 max-w-[1600px] mx-auto w-full min-h-[calc(100vh-4rem)] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs gap-1.5 font-medium shadow-xs"
            onClick={() => {
              if (isDirty()) {
                setShowUnsavedDialog(true)
                return
              }
              navigate('/potenciais')
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Button>
          <h1 className="text-xl font-bold tracking-tight">
            {currentPotential
              ? `Cotação: ${currentPotential.cliente || 'Desconhecido'}`
              : 'Nova Cotação'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {currentPotential && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleDuplicate}
              disabled={isSaving}
            >
              <Copy className="h-3 w-3 mr-1.5" /> Duplicar
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setIsSearchQuoteOpen(true)}
          >
            <Search className="h-3 w-3 mr-1.5" /> Buscar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              if (isDirty()) {
                setShowUnsavedDialog(true)
                return
              }
              navigate('/potenciais')
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 rounded-full text-xs"
            disabled={isSaving}
            onClick={() => handleSave(null)}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" /> Salvar Rascunho
          </Button>
          <Button
            disabled={isSaving}
            size="sm"
            className="h-8 rounded-full text-xs"
            onClick={() => handleSave('Completo')}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Salvar e Concluir
          </Button>
        </div>
      </div>

      <PotencialForm
        formData={formData}
        setFormData={setFormData}
        currentPotential={currentPotential}
        statusBadge={getStatusBadge()}
        statuses={statuses}
        onManageStatuses={() => setIsStatusModalOpen(true)}
      />

      <div className="bg-white rounded-lg border shadow-sm flex flex-col flex-1 min-h-0">
        <div className="p-3 border-b flex items-center justify-end bg-slate-50/50 rounded-t-lg shrink-0">
          <Button
            size="sm"
            className="rounded-full h-8 px-4 text-xs font-medium shadow-sm"
            onClick={() => setIsSelecting(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Abrir Catálogo Completo
          </Button>
        </div>

        <SelectedItemsTable
          selectedItems={selectedItems}
          handleUpdateItem={handleUpdateItem}
          handleRemoveItem={handleRemoveItem}
          handleMoveUp={handleMoveUp}
          handleMoveDown={handleMoveDown}
          setIsSelecting={setIsSelecting}
          lastOfferedPrices={lastOfferedPrices}
        />

        {/* Totals Summary Widget */}
        <div className="p-4 border-t bg-slate-50 flex flex-wrap items-center justify-between gap-4 sm:gap-6 shrink-0 rounded-b-lg">
          {/* Lado Esquerdo: Custo Ref. Total e Lucro Estimado */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Custo Ref. Total
              </span>
              <span className="text-sm font-semibold font-mono text-amber-700">
                ${' '}
                {totalCostRef.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="w-px h-8 bg-border"></div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Lucro Estimado
              </span>
              <div className="flex items-baseline gap-1.5 font-mono">
                <span
                  className={cn(
                    'text-sm font-semibold',
                    profitValue > 0
                      ? 'text-emerald-600'
                      : profitValue < 0
                        ? 'text-red-600'
                        : 'text-foreground',
                  )}
                >
                  {profitValue < 0 ? '-' : ''}$
                  {Math.abs(profitValue).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium',
                    profitValue > 0
                      ? 'text-emerald-600/90'
                      : profitValue < 0
                        ? 'text-red-600/90'
                        : 'text-muted-foreground',
                  )}
                >
                  (
                  {profitPercent !== null
                    ? `${profitPercent >= 0 ? '+' : ''}${profitPercent.toLocaleString('pt-BR', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}%`
                    : '—'}
                  )
                </span>
              </div>
            </div>
          </div>

          {/* Lado Direito: Total SKUs, Quantidade Total e Valor Total Estimado */}
          <div className="flex items-center gap-6 ml-auto">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Total SKUs
              </span>
              <span className="text-sm font-semibold">{totalSKUs}</span>
            </div>
            <div className="w-px h-8 bg-border"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Quantidade Total
              </span>
              <span className="text-sm font-semibold">{totalQty.toLocaleString('en-US')}</span>
            </div>
            <div className="w-px h-8 bg-border"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Valor Total Estimado
              </span>
              <span className="text-lg font-bold text-primary">
                ${' '}
                {totalValue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Condições Comerciais dos Fabricantes Selecionados */}
      {fornecedoresAceitosComValor.length > 0 && (
        <Card className="p-4 shadow-sm border-blue-200/80 bg-blue-50/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Condições Comerciais dos Fabricantes
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-blue-50 text-blue-700 border-blue-300"
                >
                  {fornecedoresAceitosComValor.length} selecionado
                  {fornecedoresAceitosComValor.length > 1 ? 's' : ''}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Exibindo apenas os fabricantes selecionados/aceitos para formar o preço na cotação.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {fornecedoresAceitosComValor.map(({ cf, valorTotal, numItens }) => {
              const nome = cf.expand?.fornecedor_id?.nome || 'Fabricante'
              return (
                <div
                  key={cf.id}
                  className="flex flex-col gap-2 border border-blue-200 rounded-lg p-3 min-w-[240px] bg-white shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-foreground truncate">{nome}</span>
                    <Badge
                      variant="outline"
                      className="text-[9px] h-4 px-1.5 bg-blue-50 text-blue-700 border-blue-300 font-medium"
                    >
                      Selecionado
                    </Badge>
                  </div>
                  {valorTotal > 0 && (
                    <div className="text-[10px] text-muted-foreground bg-slate-50 px-2 py-1 rounded border border-slate-100 flex justify-between items-center">
                      <span>Total aceito:</span>
                      <span className="font-semibold text-foreground">
                        ${' '}
                        {valorTotal.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        ({numItens} {numItens === 1 ? 'item' : 'itens'})
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-1.5 text-[11px] pt-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Truck className="w-3 h-3 shrink-0 text-blue-600" />
                      <span className="font-medium text-foreground">Incoterm:</span>
                      <span className="truncate">{cf.incoterm || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CreditCard className="w-3 h-3 shrink-0 text-blue-600" />
                      <span className="font-medium text-foreground">Pagamento:</span>
                      <span className="truncate">{cf.condicao_pagamento || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-3 h-3 shrink-0 text-blue-600" />
                      <span className="font-medium text-foreground">Fabricação:</span>
                      <span className="truncate">{cf.tempo_fabricacao || '—'}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* 2. Nova seção: Condições Comerciais para o Cliente */}
      <Card className="p-4 shadow-sm border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Condições Comerciais para o Cliente
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] bg-slate-50 text-slate-700 border-slate-200"
              >
                Proposta ao Cliente
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Condições comerciais que serão enviadas na proposta para o cliente. Preenchidas
              automaticamente a partir dos fabricantes aceitos ou personalizadas.
            </p>
          </div>
          {fornecedoresAceitosComValor.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRecalcularCondicoes}
              className="h-7 text-xs px-2.5 self-start sm:self-auto gap-1.5 text-muted-foreground hover:text-foreground"
              title="Recalcula as condições comerciais a partir dos fornecedores aceitos"
            >
              <RotateCcw className="w-3 h-3" />
              Recalcular automático
            </Button>
          )}
        </div>

        {fornecedoresAceitosComValor.length > 0 && (
          <div className="mb-3 px-3 py-2 bg-blue-50/60 border border-blue-100 rounded-md text-[11px] text-blue-800 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
            <div className="flex-1 leading-relaxed">
              {fornecedoresAceitosComValor.length === 1 ? (
                <span>
                  <strong>1 fornecedor aceito:</strong> Incoterm, condição de pagamento e prazo
                  herdados automaticamente do fabricante selecionado.
                </span>
              ) : (
                <span>
                  <strong>{fornecedoresAceitosComValor.length} fornecedores aceitos:</strong>{' '}
                  Incoterm obtido do fabricante com maior volume de pedido (
                  {condicoesSugeridas.incoterm || '—'}), prazo definido como o maior entre os
                  aceitos ({condicoesSugeridas.tempo_fabricacao || '—'}) e condição de pagamento
                  definida especialmente para o cliente.
                </span>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="incoterm_cliente"
              className="text-xs font-medium flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5 text-muted-foreground" />
              Incoterm
              {condicoesManuais.incoterm && (
                <span className="text-[10px] text-amber-600 font-normal">
                  (editado manualmente)
                </span>
              )}
            </Label>
            <Input
              id="incoterm_cliente"
              placeholder="Ex: FOB, CIF, EXW..."
              value={formData.incoterm_cliente || ''}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, incoterm_cliente: e.target.value }))
                setCondicoesManuais((prev) => ({ ...prev, incoterm: true }))
              }}
              className="h-8 text-xs bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="condicao_pagamento_cliente"
              className="text-xs font-medium flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
              Condição de Pagamento
              {condicoesManuais.condicao_pagamento && (
                <span className="text-[10px] text-amber-600 font-normal">
                  (editado manualmente)
                </span>
              )}
            </Label>
            <Input
              id="condicao_pagamento_cliente"
              placeholder="Ex: 30% sinal + 70% embarque..."
              value={formData.condicao_pagamento_cliente || ''}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, condicao_pagamento_cliente: e.target.value }))
                setCondicoesManuais((prev) => ({ ...prev, condicao_pagamento: true }))
              }}
              className="h-8 text-xs bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="tempo_fabricacao_cliente"
              className="text-xs font-medium flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              Tempo de Fabricação
              {condicoesManuais.tempo_fabricacao && (
                <span className="text-[10px] text-amber-600 font-normal">
                  (editado manualmente)
                </span>
              )}
            </Label>
            <Input
              id="tempo_fabricacao_cliente"
              placeholder="Ex: 30 a 45 dias..."
              value={formData.tempo_fabricacao_cliente || ''}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, tempo_fabricacao_cliente: e.target.value }))
                setCondicoesManuais((prev) => ({ ...prev, tempo_fabricacao: true }))
              }}
              className="h-8 text-xs bg-white"
            />
          </div>
        </div>
      </Card>

      <PotentialNotes potencialId={currentPotential?.id || ''} />
      <PotentialAttachments potencial={currentPotential} onUpdate={setCurrentPotential} />

      <SearchQuoteModal
        open={isSearchQuoteOpen}
        onOpenChange={setIsSearchQuoteOpen}
        onSelect={handleQuoteSelected}
      />
      <StatusManagementModal
        open={isStatusModalOpen}
        onOpenChange={setIsStatusModalOpen}
        onSaved={loadStatuses}
      />

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
})

export default AddItemsToPotential
