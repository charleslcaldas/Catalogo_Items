import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Search, Plus, ArrowLeft, Save } from 'lucide-react'
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
}

export default function AddItemsToPotential() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [currentPotential, setCurrentPotential] = useState<Potencial | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    numero_potencial: '',
    cliente: '',
    nome_potencial: '',
    proprietario: '',
    estagio: '',
    observacoes: '',
    status: 'rascunho' as 'rascunho' | 'ativo',
  })

  // Selected Items State
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItemData>>(new Map())

  // UI State
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
      const next = new Map(prev)
      if (next.has(item.id)) {
        next.delete(item.id)
      } else {
        next.set(item.id, {
          item,
          quantidade: 1,
          unidade_medida: item.unidade || 'Pcs',
          preco_unitario: item.preco_venda !== undefined ? item.preco_venda : '',
          observacoes: '',
        })
      }
      return next
    })
  }

  const handleUpdateItem = (id: string, field: keyof SelectedItemData, value: string) => {
    if (id === 'VALIDATION_ERROR') {
      toast.error('Preencha a quantidade, unidade e preço para todos os itens selecionados.')
      return
    }
    setSelectedItems((prev) => {
      const next = new Map(prev)
      const data = next.get(id)
      if (data) {
        let parsedValue: any = value
        if (field === 'quantidade' || field === 'preco_unitario') {
          parsedValue = value === '' ? '' : Number(value)
        }
        next.set(id, { ...data, [field]: parsedValue })
      }
      return next
    })
  }

  const handleRemoveItem = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }

  const handleSave = async () => {
    if (!formData.numero_potencial) {
      return toast.error('O número da cotação é obrigatório.')
    }
    setIsSaving(true)
    try {
      const itemsData = Array.from(selectedItems.values())
        .filter((si) => Number(si.quantidade) > 0)
        .map((si) => ({
          item_id: si.item.id,
          quantidade: Number(si.quantidade),
          unidade_medida: si.unidade_medida,
          preco_unitario: Number(si.preco_unitario) || 0,
          observacoes: si.observacoes,
        }))

      const saved = await savePotencialFull(
        currentPotential?.id || null,
        { ...formData },
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
      status: (quote.status as 'rascunho' | 'ativo') || 'rascunho',
    })
    setIsSearchQuoteOpen(false)

    try {
      const items = await getPotencialItens(quote.id)
      const newMap = new Map<string, SelectedItemData>()
      items.forEach((pi) => {
        newMap.set(pi.item_id, {
          item: pi.expand?.item_id || ({ id: pi.item_id } as any),
          quantidade: pi.quantidade,
          unidade_medida: pi.unidade_medida || 'Pcs',
          preco_unitario: pi.preco_unitario !== undefined ? pi.preco_unitario : '',
          observacoes: pi.observacoes || '',
        })
      })
      setSelectedItems(newMap)
      toast.success('Cotação carregada com sucesso!')
    } catch (error) {
      toast.error('Erro ao carregar itens da cotação.')
    }
  }

  const handleItemSaved = (newItem: Item) => {
    setSelectedItems((prev) => {
      const next = new Map(prev)
      next.set(newItem.id, {
        item: newItem,
        quantidade: 1,
        unidade_medida: newItem.unidade || 'Pcs',
        preco_unitario: newItem.preco_venda !== undefined ? newItem.preco_venda : '',
        observacoes: '',
      })
      return next
    })
  }

  const getStatusBadge = () => {
    if (selectedItems.size === 0) {
      return (
        <Badge
          variant="secondary"
          className="bg-slate-100 text-slate-600 border-slate-200 font-normal"
        >
          🚫 Sem Itens
        </Badge>
      )
    }

    const items = Array.from(selectedItems.values())
    const hasIncomplete = items.some((i) => !i.quantidade || !i.preco_unitario)

    if (!hasIncomplete) {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 font-normal">
          ✅ Completo
        </Badge>
      )
    }
    return (
      <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200 font-normal">
        ⚠️ Itens incompletos
      </Badge>
    )
  }

  if (isSelecting) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6 max-w-[1600px] mx-auto w-full bg-slate-50/50">
        <div className="flex items-center justify-between mb-4 shrink-0 bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsSelecting(false)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Catálogo de Produtos</h1>
              <p className="text-sm text-muted-foreground">
                Selecione os itens para a cotação {formData.numero_potencial || 'Nova Cotação'}
              </p>
            </div>
          </div>
          <Button onClick={() => setIsSelecting(false)}>
            Concluir Seleção ({selectedItems.size})
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
    <div className="flex flex-col p-4 md:p-6 max-w-[1600px] mx-auto w-full min-h-[calc(100vh-4rem)] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {currentPotential
              ? `Cotação: ${currentPotential.numero_potencial}${currentPotential.cliente ? ` - ${currentPotential.cliente}` : ''}`
              : 'Nova Cotação'}
          </h1>
          <p className="text-sm text-muted-foreground">Preencha os detalhes e adicione itens</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsSearchQuoteOpen(true)}>
            <Search className="h-4 w-4 mr-2" /> Buscar Cotação
          </Button>
          <Button variant="outline" onClick={() => navigate('/potenciais')}>
            Cancelar
          </Button>
          <Button disabled={isSaving} onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" /> Salvar Cotação
          </Button>
        </div>
      </div>

      <PotencialForm
        formData={formData}
        setFormData={setFormData}
        currentPotential={currentPotential}
        statusBadge={getStatusBadge()}
      />

      <div className="bg-white rounded-lg border shadow-sm flex flex-col flex-1">
        <div className="p-4 border-b flex items-center justify-between bg-slate-50/50 rounded-t-lg">
          <div>
            <h2 className="text-lg font-semibold">Itens da Cotação</h2>
            <p className="text-sm text-muted-foreground">Gerencie os produtos desta cotação</p>
          </div>
          <Button onClick={() => setIsSelecting(true)}>
            <Plus className="h-4 w-4 mr-2" /> Incluir itens
          </Button>
        </div>
        <SelectedItemsTable
          selectedItems={selectedItems}
          handleUpdateItem={handleUpdateItem}
          handleRemoveItem={handleRemoveItem}
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
