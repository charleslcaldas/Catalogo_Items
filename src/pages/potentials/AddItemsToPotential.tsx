import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PotentialHeader } from './components/PotentialHeader'
import { ProductCatalog } from './components/ProductCatalog'
import { SelectionPanel } from './components/SelectionPanel'
import { addPotencialItens } from '@/services/potenciais'
import type { Potencial, Item } from '@/types'

export type SelectedItemData = {
  item: Item
  quantidade: number | ''
  preco_unitario: number | ''
  observacoes: string
}

export default function AddItemsToPotential() {
  const navigate = useNavigate()
  const [selectedPotential, setSelectedPotential] = useState<Potencial | null>(null)
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItemData>>(new Map())
  const [isSaving, setIsSaving] = useState(false)

  const handleToggleItem = (item: Item) => {
    setSelectedItems((prev) => {
      const next = new Map(prev)
      if (next.has(item.id)) {
        next.delete(item.id)
      } else {
        next.set(item.id, {
          item,
          quantidade: 1,
          preco_unitario: item.preco_venda || '',
          observacoes: '',
        })
      }
      return next
    })
  }

  const handleUpdateItem = (id: string, field: keyof SelectedItemData, value: string) => {
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
    if (!selectedPotential) {
      toast.error('Selecione um Potencial primeiro.')
      return
    }

    const items = Array.from(selectedItems.values())
    const missingQuantities = items.some((i) => i.quantidade === '' || Number(i.quantidade) <= 0)

    if (missingQuantities) {
      toast.error('Preencha a quantidade para todos os itens', {
        action: { label: 'Tentar novamente', onClick: () => {} },
      })
      return
    }

    setIsSaving(true)
    try {
      const payload = items.map((i) => ({
        potencial_id: selectedPotential.id,
        item_id: i.item.id,
        quantidade: Number(i.quantidade),
        preco_unitario: Number(i.preco_unitario) || 0,
        observacoes: i.observacoes,
      }))

      await addPotencialItens(payload)

      toast.success(
        `${items.length} itens adicionados ao potencial ${selectedPotential.numero_potencial}`,
        {
          duration: 3000,
          className: 'bg-green-500 text-white border-none',
        },
      )
      setSelectedItems(new Map())
    } catch (error) {
      toast.error('Erro ao salvar itens. Tente novamente.', {
        action: { label: 'Tentar novamente', onClick: handleSave },
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Adicionar Itens ao Potencial</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline transition-colors"
        >
          Voltar
        </button>
      </div>

      <PotentialHeader selected={selectedPotential} onSelect={setSelectedPotential} />

      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 min-h-0 pb-4">
        <div className="w-full md:w-[70%] flex flex-col min-h-[400px] md:min-h-0">
          <ProductCatalog selectedItems={selectedItems} onToggle={handleToggleItem} />
        </div>
        <div className="w-full md:w-[30%] flex flex-col min-h-[500px] md:min-h-0">
          <SelectionPanel
            items={Array.from(selectedItems.values())}
            potentialNumber={selectedPotential?.numero_potencial}
            onUpdate={handleUpdateItem}
            onRemove={handleRemoveItem}
            onSave={handleSave}
            isSaving={isSaving}
          />
        </div>
      </div>
    </div>
  )
}
