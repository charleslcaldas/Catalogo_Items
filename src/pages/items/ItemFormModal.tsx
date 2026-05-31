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
import { Separator } from '@/components/ui/separator'
import { useData } from '@/contexts/data-context'
import { Item, UnidadeMedida } from '@/types'
import { Plus } from 'lucide-react'
import { LineModal, FinishModal, NcmModal } from '@/components/MetadataModals'
import { toast } from 'sonner'
import { PriceInput } from '@/components/PriceInput'
import pb from '@/lib/pocketbase/client'

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
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadeMedida[]>([])

  useEffect(() => {
    pb.collection('unidades_medida')
      .getFullList<UnidadeMedida>()
      .then(setUnidadesMedida)
      .catch(console.error)
  }, [])

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

  const selectedNcmObj = ncms.find((n) => n.id === formData.ncm_id)

  const renderTabContent = (lang: 'pt' | 'en') => {
    const isPt = lang === 'pt'

    const customTamanhoLabel =
      atributosLinha.find((a) => a.linha_id === formData.linha_id && a.tipo_atributo === 'tamanho')
        ?.nome_campo_customizado || (isPt ? 'Tamanho' : 'Size')

    return (
      <div className="space-y-6 pt-4 h-[65vh] overflow-y-auto pr-2 pb-4">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {isPt ? 'Geral & Atributos' : 'General & Attributes'}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {isPt ? 'Linha' : 'Line'} <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Select
                  value={formData.linha_id}
                  onValueChange={(v) => setFormData({ ...formData, linha_id: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {linhas.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {isPt ? l.nome_pt : l.nome_en || l.nome_pt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isPt && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-9 w-9"
                    onClick={() => setLineModalOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                {isPt ? 'Descrição (PT)' : 'Description (EN)'}{' '}
                {isPt && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                required={isPt}
                className="min-h-[40px] resize-y text-sm"
                value={(isPt ? formData.descr_pt : formData.descr_en) || ''}
                onChange={(e) =>
                  setFormData(
                    isPt
                      ? { ...formData, descr_pt: e.target.value }
                      : { ...formData, descr_en: e.target.value },
                  )
                }
              />
            </div>
          </div>

          <div className="flex gap-4 items-end">
            <div className="flex-grow space-y-2">
              <Label>{isPt ? 'Descrição Base' : 'Base Description'}</Label>
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
                      linha_id: db.linha_id,
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
                        {d.codigo} - {isPt ? d.nome_pt : d.nome_en || d.nome_pt}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="shrink-0 w-32 flex items-center space-x-2 pb-2">
              <Switch
                checked={formData.ativo}
                onCheckedChange={(c) => setFormData({ ...formData, ativo: c })}
              />
              <Label>Status</Label>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{isPt ? 'Grau (Classe)' : 'Grade (Class)'}</Label>
              <Input
                value={formData.classe || ''}
                onChange={(e) => setFormData({ ...formData, classe: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{isPt ? 'Norma' : 'Standard'}</Label>
              <Input
                value={formData.norma || ''}
                onChange={(e) => setFormData({ ...formData, norma: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{isPt ? 'Tipo de Rosca' : 'Thread Type'}</Label>
              <Input
                value={formData.tipo_rosca || ''}
                onChange={(e) => setFormData({ ...formData, tipo_rosca: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{isPt ? 'Compr. Rosca' : 'Thread Length'}</Label>
              <Input
                value={(isPt ? formData.comprimento_rosca : formData.comprimento_rosca_en) || ''}
                onChange={(e) =>
                  setFormData(
                    isPt
                      ? { ...formData, comprimento_rosca: e.target.value }
                      : { ...formData, comprimento_rosca_en: e.target.value },
                  )
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{customTamanhoLabel}</Label>
              <Input
                value={formData.tamanho || ''}
                onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{isPt ? 'Acabamento' : 'Finish'}</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.acabamento_id}
                  onValueChange={(v) => setFormData({ ...formData, acabamento_id: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {acabamentos.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {isPt ? a.nome_pt : a.nome_en || a.nome_pt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isPt && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-9 w-9"
                    onClick={() => setFinishModalOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isPt ? 'Preço de Venda' : 'Selling Price'}</Label>
              <PriceInput
                value={formData.preco_venda}
                onChange={(val) => setFormData({ ...formData, preco_venda: val })}
              />
            </div>
            <div className="space-y-2">
              <Label>{isPt ? 'Preço de Compra' : 'Purchase Price'}</Label>
              <PriceInput
                value={formData.preco_compra}
                onChange={(val) => setFormData({ ...formData, preco_compra: val })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{isPt ? 'Material' : 'Material'}</Label>
              <Input
                value={formData.material || ''}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Foto URL</Label>
              <Input
                value={formData.foto_url || ''}
                onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Item ID (Zoho Books)</Label>
              <Input
                readOnly
                disabled
                value={formData.item_id_books || (isPt ? 'Não sincronizado' : 'Not synchronized')}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {isPt ? 'Textos e Descrições (PT)' : 'Texts and Descriptions (EN)'}
          </h3>

          <div className="grid grid-cols-4 gap-4">
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
              <Label>{isPt ? 'Unidade de medida' : 'Unit of Measure'}</Label>
              <Select
                value={formData.unidade_id}
                onValueChange={(v) => setFormData({ ...formData, unidade_id: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {unidadesMedida.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isPt ? 'Informação extra' : 'Extra Information'}</Label>
              <Textarea
                className="min-h-[40px] text-sm"
                value={(isPt ? formData.informacao_extra : formData.informacao_extra_en) || ''}
                onChange={(e) =>
                  setFormData(
                    isPt
                      ? { ...formData, informacao_extra: e.target.value }
                      : { ...formData, informacao_extra_en: e.target.value },
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{isPt ? 'Descrição extra' : 'Extra Description'}</Label>
              <Textarea
                className="min-h-[40px] text-sm"
                value={(isPt ? formData.descricao_extra : formData.descricao_extra_en) || ''}
                onChange={(e) =>
                  setFormData(
                    isPt
                      ? { ...formData, descricao_extra: e.target.value }
                      : { ...formData, descricao_extra_en: e.target.value },
                  )
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isPt ? 'Descrição Curta (PT)' : 'Short Description (EN)'}</Label>
              <Input
                value={(isPt ? formData.descricao_curta : formData.descricao_curta_en) || ''}
                onChange={(e) =>
                  setFormData(
                    isPt
                      ? { ...formData, descricao_curta: e.target.value }
                      : { ...formData, descricao_curta_en: e.target.value },
                  )
                }
              />
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
                {isPt && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-9 w-9"
                    onClick={() => setNcmModalOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {selectedNcmObj && (
            <div className="grid grid-cols-4 gap-4 bg-muted/30 p-4 rounded-lg border border-border">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">II (%)</Label>
                <div className="text-sm font-medium">{selectedNcmObj.ii ?? 0}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">IPI (%)</Label>
                <div className="text-sm font-medium">{selectedNcmObj.ipi ?? 0}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">PIS (%)</Label>
                <div className="text-sm font-medium">{selectedNcmObj.pis ?? 0}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">COFINS (%)</Label>
                <div className="text-sm font-medium">{selectedNcmObj.cofins ?? 0}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{isPt ? 'Data de atualização' : 'Update Date'}</Label>
              <Input
                type="date"
                value={formData.data_atualizacao ? formData.data_atualizacao.substring(0, 10) : ''}
                onChange={(e) => setFormData({ ...formData, data_atualizacao: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{isPt ? 'Validade do preço' : 'Price Validity'}</Label>
              <Input
                type="date"
                value={formData.validade_preco ? formData.validade_preco.substring(0, 10) : ''}
                onChange={(e) => setFormData({ ...formData, validade_preco: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{isPt ? 'Fornecedor' : 'Supplier'}</Label>
              <Input
                value={formData.fornecedor_ultima_atualizacao || ''}
                onChange={(e) =>
                  setFormData({ ...formData, fornecedor_ultima_atualizacao: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{item ? 'Editar Item' : 'Novo Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="px-6 flex-grow">
            <Tabs defaultValue="pt" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-2">
                <TabsTrigger value="pt">Português</TabsTrigger>
                <TabsTrigger value="en">English</TabsTrigger>
              </TabsList>
              <TabsContent value="pt" className="mt-0 outline-none">
                {renderTabContent('pt')}
              </TabsContent>
              <TabsContent value="en" className="mt-0 outline-none">
                {renderTabContent('en')}
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter className="p-6 pt-4 border-t bg-muted/20">
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
