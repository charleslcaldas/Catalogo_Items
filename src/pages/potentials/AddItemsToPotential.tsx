import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Search, Plus, ArrowLeft, Save, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { ProductCatalog } from './components/ProductCatalog'
import { QuickItemModal } from './components/QuickItemModal'
import { SearchQuoteModal } from './components/SearchQuoteModal'
import { PotencialForm } from './components/PotencialForm'
import { SelectedItemsTable } from './components/SelectedItemsTable'
import { savePotencialFull, getPotencialItens } from '@/services/potenciais'
import pb from '@/lib/pocketbase/client'
import type { Potencial, Item } from '@/types'

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
  const [itemToEdit, setItemToEdit] = useState<Partial<Item> | undefined>(undefined)

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
        return [
          ...prev,
          {
            id: item.id,
            data: {
              item,
              quantidade: 1,
              unidade_medida: item.unidade || 'Pcs',
              preco_unitario: item.preco_venda !== undefined ? item.preco_venda : '',
              observacoes: '',
              ordem: prev.length + 1,
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

  const handleRemoveItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((si) => si.id !== id))
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

  const handleSave = async (statusOverride: 'Itens incompletos' | 'Completo') => {
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
      const statusToSave = selectedItems.length === 0 ? 'Sem Itens' : statusOverride
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
      toast.success(`Cotação ${saved.numero_potencial} salva com sucesso!`, {
        className: 'bg-green-500 text-white border-none',
      })
      navigate('/potenciais')
    } catch (error) {
      toast.error('Erro ao salvar a cotação.')
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
    setSelectedItems((prev) => [
      ...prev,
      {
        id: newItem.id,
        data: {
          item: newItem,
          quantidade: 1,
          unidade_medida: newItem.unidade || 'Pcs',
          preco_unitario: newItem.preco_venda !== undefined ? newItem.preco_venda : '',
          observacoes: '',
          ordem: prev.length + 1,
        },
      },
    ])
  }

  const getStatusBadge = () => {
    if (selectedItems.length === 0) {
      return (
        <Badge
          variant="secondary"
          className="bg-slate-100 text-slate-600 border-slate-200 font-normal rounded-full px-2 h-5 text-[10px]"
        >
          🚫 Sem Itens
        </Badge>
      )
    }
    const hasIncomplete = selectedItems.some((si) => !si.data.quantidade || !si.data.preco_unitario)
    if (!hasIncomplete && formData.status === 'Completo') {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 font-normal rounded-full px-2 h-5 text-[10px]">
          ✅ Completo
        </Badge>
      )
    }
    return (
      <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200 font-normal rounded-full px-2 h-5 text-[10px]">
        ⚠️ Itens incompletos
      </Badge>
    )
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
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {currentPotential
              ? `Cotação: ${currentPotential.cliente || 'Desconhecido'}`
              : 'Nova Cotação'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setIsSearchQuoteOpen(true)}
          >
            <Search className="h-3 w-3 mr-2" /> Buscar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => navigate('/potenciais')}
          >
            Cancelar
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-8"
            disabled={isSaving}
            onClick={() => handleSave('Itens incompletos')}
          >
            <Save className="h-3 w-3 mr-2" /> Salvar Rascunho
          </Button>
          <Button
            disabled={isSaving}
            size="sm"
            className="h-8"
            onClick={() => handleSave('Completo')}
          >
            <CheckCircle className="h-3 w-3 mr-2" /> Salvar e Concluir
          </Button>
        </div>
      </div>

      <PotencialForm
        formData={formData}
        setFormData={setFormData}
        currentPotential={currentPotential}
        statusBadge={getStatusBadge()}
      />

      <div className="bg-white rounded-lg border shadow-sm flex flex-col flex-1 min-h-0">
        <div className="p-3 border-b flex items-center justify-between bg-slate-50/50 rounded-t-lg shrink-0">
          <div>
            <h2 className="text-sm font-semibold">Itens da Cotação</h2>
          </div>
          <Button
            size="sm"
            className="rounded-full h-7 px-3 text-xs"
            onClick={() => setIsSelecting(true)}
          >
            <Plus className="h-3 w-3 mr-1" /> Incluir Itens
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
      </div>

      <SearchQuoteModal
        open={isSearchQuoteOpen}
        onOpenChange={setIsSearchQuoteOpen}
        onSelect={handleQuoteSelected}
      />
    </div>
  )
}
