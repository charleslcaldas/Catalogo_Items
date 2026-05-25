import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useData } from '@/contexts/data-context'
import type { Item } from '@/types'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { LineModal, FinishModal } from '@/components/MetadataModals'
import { getContrastColor } from '@/lib/utils'

interface QuickItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Partial<Item>
  onSaved: (item: Item) => void
}

export function QuickItemModal({ open, onOpenChange, initialData, onSaved }: QuickItemModalProps) {
  const { linhas, acabamentos, atributosLinha } = useData()
  const [formData, setFormData] = useState<Partial<Item>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [lineModalOpen, setLineModalOpen] = useState(false)
  const [finishModalOpen, setFinishModalOpen] = useState(false)

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          ...initialData,
          sku: initialData.sku ? `${initialData.sku}-C` : '',
        })
      } else {
        setFormData({
          ativo: true,
        })
      }
    }
  }, [open, initialData])

  const customTamanhoLabel =
    atributosLinha.find((a) => a.linha_id === formData.linha_id && a.tipo_atributo === 'tamanho')
      ?.nome_campo_customizado || 'Tamanho'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.sku || !formData.linha_id || !formData.descr_pt)
      return toast.error('Preencha todos os campos obrigatórios')
    setIsSaving(true)
    try {
      const record = await pb.collection('itens').create(formData)
      let expandedRecord = record
      try {
        expandedRecord = await pb.collection('itens').getOne(record.id, { expand: 'acabamento_id' })
      } catch {
        /* intentionally ignored */
      }
      onSaved(expandedRecord as Item)
      toast.success('Item salvo com sucesso!')
      onOpenChange(false)
    } catch (error) {
      toast.error('Erro ao salvar o item.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Duplicar Item' : 'Novo Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                SKU <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                value={formData.sku || ''}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Linha <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Select
                  required
                  value={formData.linha_id || ''}
                  onValueChange={(v) => setFormData({ ...formData, linha_id: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {linhas.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome_pt} / {l.nome_en || l.nome_pt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="text-green-600 shrink-0"
                  onClick={() => setLineModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>
                Descrição (PT) <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                value={formData.descr_pt || ''}
                onChange={(e) => setFormData({ ...formData, descr_pt: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{customTamanhoLabel}</Label>
              <Input
                value={formData.tamanho || ''}
                onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Acabamento</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.acabamento_id || ''}
                  onValueChange={(v) => setFormData({ ...formData, acabamento_id: v })}
                >
                  <SelectTrigger
                    className="w-full"
                    style={(() => {
                      const sel = acabamentos.find((a) => a.id === formData.acabamento_id)
                      return sel?.cor_hex
                        ? { backgroundColor: sel.cor_hex, color: getContrastColor(sel.cor_hex) }
                        : {}
                    })()}
                  >
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {acabamentos.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <div className="flex items-center gap-2">
                          {a.cor_hex && (
                            <div
                              className="w-3 h-3 rounded-full border border-black/10"
                              style={{ backgroundColor: a.cor_hex }}
                            />
                          )}
                          {a.nome_pt} / {a.nome_en || a.nome_pt}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="text-green-600 shrink-0"
                  onClick={() => setFinishModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Classe</Label>
              <Select
                value={formData.classe || ''}
                onValueChange={(v) => setFormData({ ...formData, classe: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ex: 8.8" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4.8">4.8</SelectItem>
                  <SelectItem value="5.8">5.8</SelectItem>
                  <SelectItem value="8.8">8.8</SelectItem>
                  <SelectItem value="10.9">10.9</SelectItem>
                  <SelectItem value="12.9">12.9</SelectItem>
                  <SelectItem value="A2-70">A2-70</SelectItem>
                  <SelectItem value="A4-80">A4-80</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Norma</Label>
              <Select
                value={formData.norma || ''}
                onValueChange={(v) => setFormData({ ...formData, norma: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ex: DIN 933" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIN 931">DIN 931</SelectItem>
                  <SelectItem value="DIN 933">DIN 933</SelectItem>
                  <SelectItem value="DIN 934">DIN 934</SelectItem>
                  <SelectItem value="DIN 125">DIN 125</SelectItem>
                  <SelectItem value="ISO 4014">ISO 4014</SelectItem>
                  <SelectItem value="ISO 4017">ISO 4017</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <LineModal
        open={lineModalOpen}
        onOpenChange={setLineModalOpen}
        onSaved={(l) => setFormData({ ...formData, linha_id: l.id })}
      />
      <FinishModal
        open={finishModalOpen}
        onOpenChange={setFinishModalOpen}
        onSaved={(a) => setFormData({ ...formData, acabamento_id: a.id })}
      />
    </Dialog>
  )
}
