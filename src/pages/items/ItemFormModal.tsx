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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useData } from '@/contexts/data-context'
import { Categoria, Item, UnidadeMedida } from '@/types'
import { useAtributosLinha } from '@/hooks/use-atributos-linha'
import { Plus } from 'lucide-react'
import { LineModal, FinishModal, NcmModal } from '@/components/MetadataModals'
import { toast } from 'sonner'
import { PriceInput } from '@/components/PriceInput'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'

export function ItemFormModal({
  open,
  onOpenChange,
  item,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: Item
}) {
  const { linhas, acabamentos, ncms, descricoesBase, saveItem } = useData()
  const realTimeAtributos = useAtributosLinha()
  const [formData, setFormData] = useState<Partial<Item>>({})
  const [lineModalOpen, setLineModalOpen] = useState(false)
  const [finishModalOpen, setFinishModalOpen] = useState(false)
  const [ncmModalOpen, setNcmModalOpen] = useState(false)
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadeMedida[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])

  useEffect(() => {
    pb.collection('unidades_medida')
      .getFullList<UnidadeMedida>()
      .then(setUnidadesMedida)
      .catch(console.error)

    pb.collection('categorias').getFullList<Categoria>().then(setCategorias).catch(console.error)
  }, [])

  useEffect(() => {
    if (item) {
      setFormData(item)
    } else {
      setFormData({
        ativo: true,
        sincronizado_com_zoho: false,
        foto_url: 'https://img.usecurling.com/p/200/200?q=tools&color=gray',
      })
    }
  }, [item, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.sku || !formData.linha_id)
      return toast.error('Preencha todos os campos obrigatórios (SKU, Linha)')

    const descricao_curta = formData.descricao_curta || autoDescCurtaPt
    const descricao_curta_en = formData.descricao_curta_en || autoDescCurtaEn

    try {
      await saveItem({
        ...formData,
        descricao_curta: descricao_curta,
        descricao_curta_en: descricao_curta_en,
        descr_pt: autoDescCompletaPt || 'Sem descrição',
        descr_en: autoDescCompletaEn || '',
        descricao_catalogo_pt: autoDescCompletaPt || 'Sem descrição',
        descricao_catalogo_en: autoDescCompletaEn || '',
      } as Item)
      toast.success('Item salvo com sucesso!')
      onOpenChange(false)
    } catch (err: any) {
      const fieldErrors = extractFieldErrors(err)
      if (Object.keys(fieldErrors).length > 0) {
        const msgs = Object.entries(fieldErrors)
          .map(([f, m]) => `${f}: ${m}`)
          .join(', ')
        toast.error(`Erro de validação: ${msgs}`)
      } else {
        toast.error('Erro ao salvar: ' + (getErrorMessage(err) || err.message))
      }
    }
  }

  const selectedNcmObj = ncms.find((n) => n.id === formData.ncm_id)

  const selAcabamento = acabamentos.find((a) => a.id === formData.acabamento_id)
  const descBasePt =
    descricoesBase.find((d) => d.id === formData.descricao_base_id)?.nome_pt ||
    formData.descricao_base_pt ||
    ''
  const descBaseEn =
    descricoesBase.find((d) => d.id === formData.descricao_base_id)?.nome_en ||
    formData.descricao_base_en ||
    ''

  const autoDescCurtaPt = [
    descBasePt,
    formData.norma,
    formData.grau,
    formData.tipo_rosca,
    formData.comprimento_rosca,
    formData.informacao_extra,
  ]
    .filter(Boolean)
    .join(' ')

  const autoDescCurtaEn = [
    descBaseEn,
    formData.norma,
    formData.grau,
    formData.tipo_rosca,
    formData.comprimento_rosca_en,
    formData.informacao_extra_en,
  ]
    .filter(Boolean)
    .join(' ')

  const descCurtaToUsePt = formData.descricao_curta || autoDescCurtaPt
  const autoDescCompletaPt = `${descCurtaToUsePt}${formData.tamanho ? ` - ${formData.tamanho}` : ''}${selAcabamento?.nome_pt ? ` /${selAcabamento.nome_pt}` : ''}`

  const descCurtaToUseEn = formData.descricao_curta_en || autoDescCurtaEn
  const autoDescCompletaEn = `${descCurtaToUseEn}${formData.tamanho ? ` - ${formData.tamanho}` : ''}${selAcabamento?.nome_en || selAcabamento?.nome_pt ? ` /${selAcabamento.nome_en || selAcabamento.nome_pt}` : ''}`

  const renderTabContent = (lang: 'pt' | 'en') => {
    const isPt = lang === 'pt'

    const getFieldConfig = (field: string, defaultLabelPt: string, defaultLabelEn: string) => {
      const config = realTimeAtributos.find(
        (a) =>
          a.linha_id === formData.linha_id &&
          (a.campo_sistema === field || a.tipo_atributo === field),
      )
      const isVisible = config ? config.ativo !== false : true
      const customName =
        config?.nome_customizado ||
        (config?.nome_campo_customizado === '-' ? '' : config?.nome_campo_customizado)
      const label = customName ? customName : isPt ? defaultLabelPt : defaultLabelEn
      return { isVisible, label }
    }

    const confTamanho = getFieldConfig('tamanho', 'Tamanho', 'Size')
    const confTipoRosca = getFieldConfig('tipo_rosca', 'Tipo de Rosca', 'Thread Type')
    const confCompRosca = getFieldConfig('comprimento_rosca', 'Comp. Rosca', 'Thread Length')
    const confGrau = getFieldConfig('grau', 'Grau', 'Grade')
    const confNorma = getFieldConfig('norma', 'Norma', 'Standard')

    const selectedLinha = linhas.find((l) => l.id === formData.linha_id)
    const derivedCategoria = categorias.find((c) => c.id === selectedLinha?.categoria_id)

    return (
      <div className="space-y-6 pt-4 h-[65vh] overflow-y-auto pr-2 pb-4">
        {/* Block 1: Descrição do Item */}
        <Card>
          <CardHeader className="py-3 px-4 bg-muted/30 border-b">
            <CardTitle className="text-base font-semibold">
              {isPt ? 'Descrição do Item' : 'Item Description'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-12 gap-4">
            <div className="col-span-12 sm:col-span-6 space-y-2">
              <Label>
                SKU <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                value={formData.sku || ''}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>

            <div className="col-span-12 space-y-2">
              <Label>{isPt ? 'Descrição Curta' : 'Short Description'}</Label>
              <Textarea
                className="min-h-[40px] resize-y text-sm"
                placeholder={isPt ? autoDescCurtaPt : autoDescCurtaEn}
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

            <div className="col-span-12 space-y-2">
              <Label>{isPt ? 'Descrição Completa (Auto)' : 'Full Description (Auto)'}</Label>
              <Textarea
                className="min-h-[40px] resize-none text-sm bg-muted text-muted-foreground font-medium"
                disabled
                value={isPt ? autoDescCompletaPt : autoDescCompletaEn}
                title="This description is auto-generated based on selected attributes."
              />
            </div>

            {confGrau.isVisible && (
              <div className="col-span-12 sm:col-span-3 space-y-2">
                <Label>{confGrau.label}</Label>
                <Input
                  value={formData.grau || ''}
                  onChange={(e) => setFormData({ ...formData, grau: e.target.value })}
                />
              </div>
            )}
            {confNorma.isVisible && (
              <div className="col-span-12 sm:col-span-3 space-y-2">
                <Label>{confNorma.label}</Label>
                <Input
                  value={formData.norma || ''}
                  onChange={(e) => setFormData({ ...formData, norma: e.target.value })}
                />
              </div>
            )}
            {confTipoRosca.isVisible && (
              <div className="col-span-12 sm:col-span-3 space-y-2">
                <Label>{confTipoRosca.label}</Label>
                <Input
                  value={formData.tipo_rosca || ''}
                  onChange={(e) => setFormData({ ...formData, tipo_rosca: e.target.value })}
                />
              </div>
            )}
            {confCompRosca.isVisible && (
              <div className="col-span-12 sm:col-span-3 space-y-2">
                <Label>{confCompRosca.label}</Label>
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
            )}

            {confTamanho.isVisible && (
              <div className="col-span-12 sm:col-span-4 space-y-2">
                <Label>{confTamanho.label}</Label>
                <Input
                  value={formData.tamanho || ''}
                  onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                />
              </div>
            )}
            <div className="col-span-12 sm:col-span-4 space-y-2">
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
          </CardContent>
        </Card>

        {/* Block 2: Geral & Atributos */}
        <Card>
          <CardHeader className="py-3 px-4 bg-muted/30 border-b">
            <CardTitle className="text-base font-semibold">
              {isPt ? 'Geral & Atributos' : 'General & Attributes'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-12 gap-4">
            <div className="col-span-12 flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <Label className="sm:w-1/3 shrink-0 font-medium text-sm">
                {isPt ? 'Descrição Base (Auto/Manual)' : 'Base Description (Auto/Manual)'}
              </Label>
              <div className="flex-1">
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
            </div>

            <div className="col-span-12 sm:col-span-4 space-y-2">
              <Label>{isPt ? 'Categoria' : 'Category'}</Label>
              <Input
                readOnly
                disabled
                value={
                  derivedCategoria
                    ? isPt
                      ? derivedCategoria.nome_pt
                      : derivedCategoria.nome_en || derivedCategoria.nome_pt
                    : '-'
                }
              />
            </div>
            <div className="col-span-12 sm:col-span-4 space-y-2">
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
            <div className="col-span-12 sm:col-span-4 space-y-2 flex flex-col justify-end">
              <div className="flex items-center space-x-2 pb-2">
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(c) => setFormData({ ...formData, ativo: c })}
                />
                <Label>
                  {formData.ativo ? (isPt ? 'Ativo' : 'Active') : isPt ? 'Inativo' : 'Inactive'}
                </Label>
              </div>
            </div>

            <div className="col-span-12 sm:col-span-4 space-y-2">
              <Label>{isPt ? 'Unid. Medida' : 'Unit of Measure'}</Label>
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
            <div className="col-span-12 sm:col-span-4 space-y-2">
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
            <div className="col-span-12 sm:col-span-4 space-y-2">
              <Label>Foto URL</Label>
              <Input
                value={formData.foto_url || ''}
                onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
              />
            </div>

            {selectedNcmObj && (
              <div className="col-span-12 grid grid-cols-4 gap-4 bg-muted/40 p-4 rounded-lg border border-border mt-2">
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

            <div className="col-span-12 sm:col-span-4 space-y-2">
              <Label>Item ID (Zoho Books)</Label>
              <Input
                readOnly
                disabled
                value={formData.item_id_books || (isPt ? 'Não sincronizado' : 'Not synchronized')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Block 3: Preço e Texto */}
        <Card>
          <CardHeader className="py-3 px-4 bg-muted/30 border-b">
            <CardTitle className="text-base font-semibold">
              {isPt ? 'Preço e Texto' : 'Price and Text'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-12 gap-4">
            <div className="col-span-12 sm:col-span-3 space-y-2">
              <Label>{isPt ? 'Último Preço (Compra)' : 'Last Price (Purchase)'}</Label>
              <PriceInput
                value={formData.preco_compra}
                onChange={(val) => setFormData({ ...formData, preco_compra: val })}
              />
            </div>
            <div className="col-span-12 sm:col-span-3 space-y-2">
              <Label>{isPt ? 'Último Fornecedor' : 'Last Supplier'}</Label>
              <Input
                value={formData.fornecedor_ultima_atualizacao || ''}
                onChange={(e) =>
                  setFormData({ ...formData, fornecedor_ultima_atualizacao: e.target.value })
                }
              />
            </div>
            <div className="col-span-12 sm:col-span-3 space-y-2">
              <Label>{isPt ? 'Data do Preço' : 'Price Date'}</Label>
              <Input
                type="date"
                value={formData.data_atualizacao ? formData.data_atualizacao.substring(0, 10) : ''}
                onChange={(e) => setFormData({ ...formData, data_atualizacao: e.target.value })}
              />
            </div>
            <div className="col-span-12 sm:col-span-3 space-y-2">
              <Label>{isPt ? 'Preço de Venda' : 'Selling Price'}</Label>
              <PriceInput
                value={formData.preco_venda}
                onChange={(val) => setFormData({ ...formData, preco_venda: val })}
              />
            </div>

            <div className="col-span-12 space-y-2">
              <Label>{isPt ? 'Descrição Curta' : 'Short Description'}</Label>
              <Input
                placeholder={isPt ? autoDescCurtaPt : autoDescCurtaEn}
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

            <div className="col-span-12 space-y-2">
              <Label>{isPt ? 'Informação Extra' : 'Extra Information'}</Label>
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
            <div className="col-span-12 space-y-2">
              <Label>{isPt ? 'Descrição Extra' : 'Extra Description'}</Label>
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
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden">
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
