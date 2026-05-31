import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductCatalog } from './components/ProductCatalog'
import { SelectionPanel } from './components/SelectionPanel'
import { QuickItemModal } from './components/QuickItemModal'
import { SearchQuoteModal } from './components/SearchQuoteModal'
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
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItemData>>(new Map())
  const [isSaving, setIsSaving] = useState(false)

  // Modals state
  const [isSearchQuoteOpen, setIsSearchQuoteOpen] = useState(false)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [itemToEdit, setItemToEdit] = useState<Partial<Item> | undefined>(undefined)

  useEffect(() => {
    const id = searchParams.get('id')
    if (id && !currentPotential) {
      pb.collection('potenciais')
        .getOne(id)
        .then((quote) => {
          handleQuoteSelected(quote as Potencial)
        })
        .catch((err) => {
          console.error('Failed to load quote from URL', err)
          toast.error('Erro ao carregar a cotação a partir da URL.')
        })
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
          unidade_medida: 'Pcs',
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

  const handleSavePotencial = async (data: {
    numero: string
    cliente: string
    observacoes: string
    status: 'rascunho' | 'ativo'
    nome_potencial: string
    proprietario: string
    estagio: string
  }) => {
    setIsSaving(true)
    try {
      const itemsData = Array.from(selectedItems.values()).map((si) => ({
        item_id: si.item.id,
        quantidade: Number(si.quantidade),
        unidade_medida: si.unidade_medida,
        preco_unitario: Number(si.preco_unitario) || 0,
        observacoes: si.observacoes,
      }))

      const saved = await savePotencialFull(
        currentPotential?.id || null,
        {
          numero_potencial: data.numero,
          cliente: data.cliente,
          observacoes: data.observacoes,
          status: data.status,
          nome_potencial: data.nome_potencial,
          proprietario: data.proprietario,
          estagio: data.estagio,
        },
        itemsData,
      )

      toast.success(`Cotação ${saved.numero_potencial} salva com sucesso!`, {
        className: 'bg-green-500 text-white border-none',
      })

      setCurrentPotential(null)
      setSelectedItems(new Map())
      navigate('/potenciais')
    } catch (error) {
      toast.error('Erro ao salvar a cotação.')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleQuoteSelected = async (quote: Potencial) => {
    setCurrentPotential(quote)
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
        unidade_medida: 'Pcs',
        preco_unitario: newItem.preco_venda !== undefined ? newItem.preco_venda : '',
        observacoes: '',
      })
      return next
    })
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {currentPotential
              ? `Editando Cotação: ${currentPotential.numero_potencial}`
              : 'Nova Cotação'}
          </h1>
          {currentPotential && (
            <p className="text-sm text-muted-foreground">
              Cliente: {currentPotential.cliente || '-'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsSearchQuoteOpen(true)}>
            <Search className="h-4 w-4 mr-2" /> Buscar Cotação
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/potenciais')}
            className="text-sm font-medium text-muted-foreground"
          >
            Voltar
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 min-h-0 pb-4">
        <div className="w-full md:w-[70%] flex flex-col min-h-[400px] md:min-h-0">
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
        <div className="w-full md:w-[30%] flex flex-col min-h-[500px] md:min-h-0">
          <SelectionPanel
            items={Array.from(selectedItems.values())}
            currentPotential={currentPotential}
            onUpdate={handleUpdateItem}
            onRemove={handleRemoveItem}
            onSave={handleSavePotencial}
            isSaving={isSaving}
          />
        </div>
      </div>

      <QuickItemModal
        open={isItemModalOpen}
        onOpenChange={setIsItemModalOpen}
        initialData={itemToEdit}
        onSaved={handleItemSaved}
      />

      <SearchQuoteModal
        open={isSearchQuoteOpen}
        onOpenChange={setIsSearchQuoteOpen}
        onSelect={handleQuoteSelected}
      />
    </div>
  )
}
