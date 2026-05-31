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
import { ScrollArea } from '@/components/ui/scroll-area'

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
  const [ncms, setNcms] = useState<any[]>([])

  useEffect(() => {
    pb.collection('ncm')
      .getFullList({ sort: 'codigo' })
      .then(setNcms)
      .catch(() => {})
  }, [])

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
          unidade: 'Pcs',
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
        expandedRecord = await pb
          .collection('itens')
          .getOne(record.id, { expand: 'acabamento_id,linha_id' })
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
      <DialogContent className="sm:max-w-[700px] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>{initialData ? 'Duplicar Item' : 'Novo Item Completo'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          <form id="item-form" onSubmit={handleSubmit} className="space-y-6 pb-8">
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
                          {l.nome_pt}
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
                  Descrição Completa (PT) <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  value={formData.descr_pt || ''}
                  onChange={(e) => setFormData({ ...formData, descr_pt: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Descrição Curta (PT)</Label>
                <Input
                  value={formData.descricao_curta || ''}
                  onChange={(e) => setFormData({ ...formData, descricao_curta: e.target.value })}
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
                            {a.nome_pt}
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
                <Label>Material</Label>
                <Input
                  value={formData.material || ''}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Classe / Norma</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Ex: 8.8"
                    value={formData.classe || ''}
                    onChange={(e) => setFormData({ ...formData, classe: e.target.value })}
                  />
                  <Input
                    placeholder="Ex: DIN 933"
                    value={formData.norma || ''}
                    onChange={(e) => setFormData({ ...formData, norma: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>NCM</Label>
                <Select
                  value={formData.ncm_id || ''}
                  onValueChange={(v) => setFormData({ ...formData, ncm_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ncms.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.codigo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select
                  value={formData.unidade || 'Pcs'}
                  onValueChange={(v) => setFormData({ ...formData, unidade: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pcs">Pcs</SelectItem>
                    <SelectItem value="MPC">MPC</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Preço Compra</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-muted-foreground text-sm font-medium">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    className="pl-8"
                    value={formData.preco_compra ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preco_compra: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Preço Venda</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-muted-foreground text-sm font-medium">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    className="pl-8"
                    value={formData.preco_venda ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preco_venda: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </form>
        </ScrollArea>
        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button type="submit" form="item-form" disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Item'}
          </Button>
        </DialogFooter>
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
