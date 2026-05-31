import { useEffect, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useData } from '@/contexts/data-context'
import { Item } from '@/types'
import { Plus } from 'lucide-react'
import { LineModal, FinishModal, NcmModal } from '@/components/MetadataModals'
import { getContrastColor } from '@/lib/utils'
import { toast } from 'sonner'
import { PriceInput } from '@/components/PriceInput'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function ItemFormModal({
  open,
  onOpenChange,
  item,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: Item
}) {
  const { linhas, acabamentos, ncms, atributosLinha, descricoesBase, saveItem } = useData()
  const [formData, setFormData] = useState<Partial<Item>>({})
  const [lineModalOpen, setLineModalOpen] = useState(false)
  const [finishModalOpen, setFinishModalOpen] = useState(false)
  const [ncmModalOpen, setNcmModalOpen] = useState(false)

  const customTamanhoLabel =
    atributosLinha.find((a) => a.linha_id === formData.linha_id && a.tipo_atributo === 'tamanho')
      ?.nome_campo_customizado || 'Tamanho'

  useEffect(() => {
    if (item) setFormData(item)
    else
      setFormData({
        ativo: true,
        sincronizado_com_zoho: false,
        foto_url: 'https://img.usecurling.com/p/200/200?q=tools&color=gray',
      })
  }, [item, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.sku || !formData.linha_id || !formData.descr_pt)
      return toast.error('Preencha todos os campos obrigatórios')
    saveItem(formData as Item)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar Item' : 'Novo Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="atributos">Atributos</TabsTrigger>
              <TabsTrigger value="especificacoes">Especificações</TabsTrigger>
              <TabsTrigger value="financeiro">Preço/Status</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 pt-4">
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
                  <Label>Material</Label>
                  <Input
                    required
                    value={formData.material || ''}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>
                    Descrição (PT) <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    required
                    className="min-h-[80px] resize-y text-sm"
                    value={formData.descr_pt || ''}
                    onChange={(e) => setFormData({ ...formData, descr_pt: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Descrição (EN)</Label>
                  <Textarea
                    className="min-h-[80px] resize-y text-sm"
                    value={formData.descr_en || ''}
                    onChange={(e) => setFormData({ ...formData, descr_en: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Foto URL</Label>
                  <Input
                    value={formData.foto_url || ''}
                    onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="atributos" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Linha <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      required
                      value={formData.linha_id}
                      onValueChange={(v) => setFormData({ ...formData, linha_id: v })}
                    >
                      <SelectTrigger
                        className="w-full"
                        style={(() => {
                          const sel = linhas.find((l) => l.id === formData.linha_id)
                          return sel?.color
                            ? {
                                backgroundColor: sel.color,
                                color: getContrastColor(sel.color),
                                borderColor: 'transparent',
                              }
                            : {}
                        })()}
                      >
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
                      className="text-green-600 shrink-0 rounded-full h-9 w-9"
                      onClick={() => setLineModalOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Acabamento</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.acabamento_id}
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
                              {a.nome_pt} / {a.nome_en || a.nome_pt} ({a.codigo})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="text-green-600 shrink-0 rounded-full h-9 w-9"
                      onClick={() => setFinishModalOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>NCM</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.ncm_id}
                      onValueChange={(v) => setFormData({ ...formData, ncm_id: v })}
                    >
                      <SelectTrigger className="w-full">
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
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="text-green-600 shrink-0 rounded-full h-9 w-9"
                      onClick={() => setNcmModalOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{customTamanhoLabel}</Label>
                  <Input
                    value={formData.tamanho || ''}
                    onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="especificacoes" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Descrição Base</Label>
                  <Select
                    value={formData.descricao_base_id}
                    onValueChange={(v) => {
                      const db = descricoesBase.find((d) => d.id === v)
                      if (db) {
                        setFormData({
                          ...formData,
                          descricao_base_id: v,
                          descricao_base_pt: db.nome_pt,
                          descricao_base_en: db.nome_en,
                        })
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione ou deixe em branco..." />
                    </SelectTrigger>
                    <SelectContent>
                      {descricoesBase
                        .filter((d) => !formData.linha_id || d.linha_id === formData.linha_id)
                        .map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.codigo} - {d.nome_pt}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Classe Material</Label>
                  <Input
                    value={formData.classe_material || ''}
                    onChange={(e) => setFormData({ ...formData, classe_material: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Norma</Label>
                  <Input
                    value={formData.norma || ''}
                    onChange={(e) => setFormData({ ...formData, norma: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo Rosca</Label>
                  <Input
                    value={formData.tipo_rosca || ''}
                    onChange={(e) => setFormData({ ...formData, tipo_rosca: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Comprimento Rosca</Label>
                  <Input
                    value={formData.comprimento_rosca || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, comprimento_rosca: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Informação Extra</Label>
                  <Textarea
                    className="min-h-[60px] text-sm"
                    value={formData.informacao_extra || ''}
                    onChange={(e) => setFormData({ ...formData, informacao_extra: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Descrição Curta (Auto-gerada/Manual)</Label>
                  <Input
                    value={formData.descricao_curta || ''}
                    onChange={(e) => setFormData({ ...formData, descricao_curta: e.target.value })}
                    placeholder="Se vazio, será gerada automaticamente"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="financeiro" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço de Compra</Label>
                  <PriceInput
                    value={formData.preco_compra}
                    onChange={(val) => setFormData({ ...formData, preco_compra: val })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço de Venda</Label>
                  <PriceInput
                    value={formData.preco_venda}
                    onChange={(val) => setFormData({ ...formData, preco_venda: val })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Item ID (Zoho Books)</Label>
                  <Input readOnly disabled value={formData.item_id_books || 'Não sincronizado'} />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(c) => setFormData({ ...formData, ativo: c })}
                  />
                  <Label htmlFor="ativo">Item Ativo</Label>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="rounded-full">
              Salvar
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
      <NcmModal
        open={ncmModalOpen}
        onOpenChange={setNcmModalOpen}
        onSaved={(n) => setFormData({ ...formData, ncm_id: n.id })}
      />
    </Dialog>
  )
}
