import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Search,
  Plus,
  ArrowLeft,
  Save,
  CheckCircle,
  Copy,
  Check,
  ChevronsUpDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

import { ProductCatalog } from './components/ProductCatalog'
import { QuickItemModal } from './components/QuickItemModal'
import { SearchQuoteModal } from './components/SearchQuoteModal'
import { PotencialForm } from './components/PotencialForm'
import { SelectedItemsTable } from './components/SelectedItemsTable'
import { PotentialNotes } from './components/PotentialNotes'
import { PotentialAttachments } from './components/PotentialAttachments'
import { StatusManagementModal } from './components/StatusManagementModal'
import { savePotencialFull, getPotencialItens, duplicatePotencial } from '@/services/potenciais'
import { getContrastColor } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import type { Potencial, Item, UnidadeMedida, StatusPotencial } from '@/types'

export type SelectedItemData = {
  item: Item
  quantidade: number | ''
  unidade_medida: string
  preco_unitario: number | ''
  observacoes: string
  ordem?: number
}

export type SelectedItemRecord = {
  id: string
  recordId?: string
  data: SelectedItemData
}

export default function AddItemsToPotential() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [currentPotential, setCurrentPotential] = useState<Potencial | null>(null)

  const [formData, setFormData] = useState({
    numero_potencial: '',
    cliente: '',
    nome_potencial: '',
    proprietario: '',
    estagio: '',
    observacoes: '',
    status: 'Sem Itens',
  })

  const [selectedItems, setSelectedItems] = useState<SelectedItemRecord[]>([])

  const [isSelecting, setIsSelecting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSearchQuoteOpen, setIsSearchQuoteOpen] = useState(false)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [itemToEdit, setItemToEdit] = useState<Partial<Item> | undefined>(undefined)
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([])
  const [statuses, setStatuses] = useState<StatusPotencial[]>([])

  // Quick Search state
  const [quickSearchOpen, setQuickSearchOpen] = useState(false)
  const [quickSearchQuery, setQuickSearchQuery] = useState('')
  const [quickSearchResults, setQuickSearchResults] = useState<Item[]>([])

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

  useEffect(() => {
    const delay = setTimeout(() => {
      if (quickSearchQuery.length > 1) {
        pb.collection('itens')
          .getList<Item>(1, 15, {
            filter: `sku ~ "${quickSearchQuery}" || descr_pt ~ "${quickSearchQuery}" || descricao_curta ~ "${quickSearchQuery}"`,
            expand: 'acabamento_id,unidade_id',
          })
          .then((res) => setQuickSearchResults(res.items))
      } else {
        setQuickSearchResults([])
      }
    }, 300)
    return () => clearTimeout(delay)
  }, [quickSearchQuery])

  useEffect(() => {
    const id = searchParams.get('id')
    if (id && !currentPotential) {
      pb.collection('potenciais')
        .getOne(id)
        .then((quote) => handleQuoteSelected(quote as Potencial))
        .catch(() => toast.error('Erro ao carregar a cotação a partir da URL.'))
    }
  }, [searchParams])

  const handleToggleItem = (item: Item) => {
    setSelectedItems((prev) => {
      const idx = prev.findIndex((si) => si.id === item.id)
      if (idx >= 0) {
        return prev.filter((si) => si.id !== item.id)
      } else {
        const unidadeObj = unidades.find((u) => u.id === item.unidade_id)
        const unidadeNome = unidadeObj ? unidadeObj.nome : item.unidade || 'Pcs'
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
            },
          },
        ]
      }
    })
  }

  const handleQuickAdd = async (item: Item) => {
    const existing = selectedItems.find((si) => si.id === item.id)
    const unidadeObj = unidades.find((u) => u.id === item.unidade_id)
    const unidadeNome = unidadeObj ? unidadeObj.nome : item.unidade || 'Pcs'

    if (existing) {
      const newQty = Number(existing.data.quantidade || 0) + 1

      setSelectedItems((prev) => {
        const next = [...prev]
        const idx = next.findIndex((si) => si.id === item.id)
        next[idx] = { ...next[idx], data: { ...next[idx].data, quantidade: newQty } }
        return next
      })

      if (currentPotential && existing.recordId) {
        try {
          await pb.collection('potencial_itens').update(existing.recordId, { quantidade: newQty })
          toast.success(`Quantidade do item ${item.sku} atualizada.`)
        } catch (error: any) {
          toast.error(`Erro ao atualizar quantidade no banco de dados.`)
        }
      } else {
        toast.success(`Quantidade do item ${item.sku} atualizada.`)
      }
    } else {
      const newItemData: SelectedItemData = {
        item,
        quantidade: 1,
        unidade_medida: unidadeNome,
        preco_unitario: item.preco_venda !== undefined ? item.preco_venda : '',
        observacoes: '',
        ordem: selectedItems.length + 1,
      }

      if (currentPotential) {
        try {
          const created = await pb.collection('potencial_itens').create({
            potencial_id: currentPotential.id,
            item_id: item.id,
            quantidade: 1,
            unidade_medida: unidadeNome,
            preco_unitario: Number(item.preco_venda) || 0,
            observacoes: '',
            ordem: selectedItems.length + 1,
          })
          setSelectedItems((prev) => [
            ...prev,
            { id: item.id, recordId: created.id, data: newItemData },
          ])
          toast.success(`Item ${item.sku} adicionado à cotação.`)
        } catch (error: any) {
          toast.error(`Erro ao salvar item no banco: ${error.message}`)
        }
      } else {
        setSelectedItems((prev) => [...prev, { id: item.id, data: newItemData }])
        toast.success(`Item ${item.sku} adicionado (rascunho).`)
      }
    }
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
      const hasIncomplete = selectedItems.some(
        (si) => !si.data.quantidade || !si.data.preco_unitario,
      )
      if (hasIncomplete) {
        return toast.error('Preencha quantidade e preço para todos os itens antes de concluir.')
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
        }))

      const saved = await savePotencialFull(
        currentPotential?.id || null,
        { ...formData, status: statusToSave },
        itemsData,
      )

      setCurrentPotential(saved)
      setFormData((prev) => ({ ...prev, status: statusToSave }))

      toast.success(`Cotação ${saved.numero_potencial} salva com sucesso!`, {
        className: 'bg-green-500 text-white border-none',
      })

      if (statusOverride === 'Completo') {
        navigate('/potenciais')
      } else if (!currentPotential) {
        navigate(`/potenciais/adicionar?id=${saved.id}`, { replace: true })
        handleQuoteSelected(saved)
      } else {
        handleQuoteSelected(saved)
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
      handleQuoteSelected(newPotencial)
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
      proprietario: quote.proprietario || '',
      estagio: quote.estagio || '',
      observacoes: quote.observacoes || '',
      status: quote.status || 'Sem Itens',
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
        },
      }))

      formattedItems.sort((a, b) => (a.data.ordem || 0) - (b.data.ordem || 0))
      setSelectedItems(formattedItems)
      toast.success('Cotação carregada com sucesso!')
    } catch (error) {
      toast.error('Erro ao carregar itens da cotação.')
    }
  }

  const handleItemSaved = (newItem: Item) => {
    setSelectedItems((prev) => {
      const unidadeObj = unidades.find((u) => u.id === newItem.unidade_id)
      const unidadeNome = unidadeObj ? unidadeObj.nome : newItem.unidade || 'Pcs'
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
    return { totalSKUs, totalQty, totalValue }
  }

  const { totalSKUs, totalQty, totalValue } = calculateTotals()

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
        <div>
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
            onClick={() => navigate('/potenciais')}
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
        <div className="p-3 border-b flex items-center justify-between bg-slate-50/50 rounded-t-lg shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold">Itens da Cotação</h2>

            <Popover open={quickSearchOpen} onOpenChange={setQuickSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={quickSearchOpen}
                  className="w-[300px] justify-between h-8 text-xs bg-white shadow-sm"
                >
                  Adição rápida de item...
                  <Search className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Buscar por SKU ou descrição..."
                    onValueChange={setQuickSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                    <CommandGroup>
                      {quickSearchResults.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.sku}
                          onSelect={() => {
                            handleQuickAdd(item)
                            setTimeout(() => {
                              setQuickSearchOpen(false)
                              setQuickSearchQuery('')
                            }, 0)
                          }}
                        >
                          <Check className="mr-2 h-4 w-4 opacity-0" />
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-xs">{item.sku}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {item.descricao_curta || item.descr_pt}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

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
        />

        {/* Totals Summary Widget */}
        <div className="p-4 border-t bg-slate-50 flex items-center justify-end gap-6 shrink-0 rounded-b-lg">
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
    </div>
  )
}
