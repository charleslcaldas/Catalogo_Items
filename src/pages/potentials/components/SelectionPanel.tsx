import { Trash2, PackageOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { SelectedItemData } from '../AddItemsToPotential'

interface SelectionPanelProps {
  items: SelectedItemData[]
  potentialNumber?: string
  isSaving: boolean
  onUpdate: (id: string, field: keyof SelectedItemData, value: string) => void
  onRemove: (id: string) => void
  onSave: () => void
}

export function SelectionPanel({
  items,
  potentialNumber,
  isSaving,
  onUpdate,
  onRemove,
  onSave,
}: SelectionPanelProps) {
  const totalItems = items.length
  const estimatedValue = items.reduce((acc, curr) => {
    const q = Number(curr.quantidade) || 0
    const p = Number(curr.preco_unitario) || 0
    return acc + q * p
  }, 0)

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="p-4 border-b font-semibold bg-slate-50 shrink-0 flex items-center justify-between">
        <span>Resumo da Seleção</span>
        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
          {totalItems} itens
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 min-h-0">
        {totalItems === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <PackageOpen className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">Nenhum item selecionado</p>
          </div>
        ) : (
          items.map((si) => (
            <div
              key={si.item.id}
              className="bg-white p-3 rounded-md border shadow-sm relative group"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemove(si.item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="pr-8 mb-3">
                <div className="font-semibold text-sm">{si.item.sku}</div>
                <div
                  className="text-xs text-muted-foreground line-clamp-2"
                  title={`${si.item.descr_pt}\n${si.item.descr_en}`}
                >
                  {si.item.descr_pt}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <Label className="text-xs">
                    Qtde <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    className={`h-8 text-sm ${si.quantidade === '' || Number(si.quantidade) <= 0 ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    value={si.quantidade}
                    onChange={(e) => onUpdate(si.item.id, 'quantidade', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Preço (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className="h-8 text-sm"
                    value={si.preco_unitario}
                    onChange={(e) => onUpdate(si.item.id, 'preco_unitario', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Textarea
                  className="h-12 min-h-0 text-xs resize-none"
                  value={si.observacoes}
                  onChange={(e) => onUpdate(si.item.id, 'observacoes', e.target.value)}
                  placeholder="Opcional..."
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t bg-white shrink-0">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Total de itens:</span>
          <span className="font-medium">{totalItems}</span>
        </div>
        <div className="flex justify-between items-end mb-4">
          <span className="text-sm text-muted-foreground">Valor estimado:</span>
          <span className="font-bold text-lg text-primary">R$ {estimatedValue.toFixed(2)}</span>
        </div>
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm transition-colors"
          disabled={totalItems === 0 || isSaving || !potentialNumber}
          onClick={onSave}
        >
          {isSaving
            ? 'Salvando...'
            : `Adicionar ao Potencial ${potentialNumber ? `[${potentialNumber}]` : ''}`}
        </Button>
      </div>
    </div>
  )
}
