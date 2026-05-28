import { useEffect, useState, useRef } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useData } from '@/contexts/data-context'
import { Item } from '@/types'
import {
  X,
  Upload,
  Link as LinkIcon,
  Plus,
  Box,
  Settings,
  Info,
  DollarSign,
  History,
  ImagePlus,
  CheckCircle2,
  Search,
} from 'lucide-react'
import { LineModal, FinishModal, NcmModal } from '@/components/MetadataModals'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { Badge } from '@/components/ui/badge'

export function ItemDetailPanel({ item, onClose }: { item?: Item; onClose: () => void }) {
  const { linhas, categorias, acabamentos, ncms, saveItem } = useData()
  const [formData, setFormData] = useState<Partial<Item>>({})

  const [lineModalOpen, setLineModalOpen] = useState(false)
  const [finishModalOpen, setFinishModalOpen] = useState(false)
  const [ncmModalOpen, setNcmModalOpen] = useState(false)

  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const linhaSelected = linhas.find((l) => l.id === formData.linha_id)
  const categoriaSelected = categorias.find((c) => c.id === linhaSelected?.categoria_id)

  const isFixador = categoriaSelected?.nome_pt.toLowerCase().includes('fixador')
  const isMaquina =
    categoriaSelected?.nome_pt.toLowerCase().includes('mã¡quina') ||
    categoriaSelected?.nome_pt.toLowerCase().includes('maquina') ||
    categoriaSelected?.nome_pt.toLowerCase().includes('máquina')
  const isVidro = categoriaSelected?.nome_pt.toLowerCase().includes('vidro')

  useEffect(() => {
    if (item) {
      setFormData(item)
    } else {
      setFormData({
        ativo: true,
        sincronizado_com_zoho: false,
        unidade: 'Pcs',
      })
    }
  }, [item])

  // Reactive Description Logic
  useEffect(() => {
    const t = setTimeout(() => {
      const acabPt = acabamentos.find((a) => a.id === formData.acabamento_id)?.nome_pt
      const partsPt = [
        formData.descricao_base_pt,
        formData.material,
        formData.norma,
        formData.classe_material,
        formData.tipo_rosca,
        formData.comprimento_rosca,
        formData.informacao_extra,
        formData.tamanho,
        acabPt,
      ]
        .map((s) => s?.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')

      const acabEn = acabamentos.find((a) => a.id === formData.acabamento_id)?.nome_en
      const partsEn = [
        formData.descricao_base_en,
        formData.material,
        formData.norma,
        formData.classe_material,
        formData.tipo_rosca,
        formData.comprimento_rosca,
        formData.descricao_extra,
        formData.tamanho,
        acabEn,
      ]
        .map((s) => s?.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')

      setFormData((prev) => {
        if (prev.descr_pt === partsPt && prev.descr_en === partsEn) return prev
        return { ...prev, descr_pt: partsPt, descr_en: partsEn }
      })
    }, 300)
    return () => clearTimeout(t)
  }, [
    formData.descricao_base_pt,
    formData.descricao_base_en,
    formData.material,
    formData.norma,
    formData.classe_material,
    formData.tipo_rosca,
    formData.comprimento_rosca,
    formData.informacao_extra,
    formData.descricao_extra,
    formData.tamanho,
    formData.acabamento_id,
    acabamentos,
  ])

  const handleSave = async () => {
    if (!formData.sku || !formData.linha_id) {
      return toast.error('Preencha os campos obrigatórios (SKU, Linha)')
    }

    try {
      await saveItem(formData as Item)
      toast.success('Item salvo com sucesso')
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      if (item?.id) {
        const record = await pb.collection('itens').update(item.id, { foto_arquivo: file })
        setFormData((prev) => ({ ...prev, foto_arquivo: record.foto_arquivo }))
        toast.success('Imagem enviada')
      } else {
        toast.info('Salve o item primeiro para enviar uma imagem por arquivo, ou use uma URL.')
      }
    } catch (err) {
      toast.error('Erro ao enviar imagem')
    } finally {
      setUploading(false)
    }
  }

  const handleSmartPhotoFetch = async () => {
    if (!formData.tipo || !formData.tamanho || !formData.acabamento_id) {
      return toast.error('Preencha Tipo, Tamanho e Acabamento para buscar a foto inteligente.')
    }
    try {
      const filters = [
        `tipo="${formData.tipo}"`,
        `tamanho="${formData.tamanho}"`,
        `acabamento_id="${formData.acabamento_id}"`,
      ]
      if (formData.subtipo) filters.push(`subtipo="${formData.subtipo}"`)

      const record = await pb.collection('foto_catalogo').getFirstListItem(filters.join(' && '))
      if (record && record.url_foto) {
        setFormData((prev) => ({ ...prev, foto_url: record.url_foto, foto_arquivo: '' }))
        toast.success('Foto vinculada via catálogo inteligente!')
      } else {
        toast.info('Nenhuma foto encontrada para esta combinação.')
      }
    } catch (err) {
      toast.info('Nenhuma foto encontrada para esta combinação.')
    }
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="flex items-center justify-between p-4 border-b shrink-0 bg-card">
        <div>
          <h2 className="font-semibold text-lg">{item ? 'Editar Item' : 'Novo Item'}</h2>
          <p className="text-xs text-muted-foreground">{formData.sku || 'SKU pendente'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} size="sm" className="h-8">
            Salvar
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-12">
          {/* SECTION 1: Identificação */}
          <section>
            <h3 className="text-lg font-semibold mb-6 border-b pb-2 flex items-center text-primary">
              <Box className="mr-2 h-5 w-5" /> Identificação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>
                  SKU <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.sku || ''}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Linha <span className="text-destructive">*</span>
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
                          {l.nome_pt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setLineModalOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo {(isFixador || isMaquina || isVidro) && '*'}</Label>
                <Input
                  value={formData.tipo || ''}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Subtipo {isFixador && '*'}</Label>
                <Input
                  value={formData.subtipo || ''}
                  onChange={(e) => setFormData({ ...formData, subtipo: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição Base (PT) {(isFixador || isMaquina || isVidro) && '*'}</Label>
                <Input
                  value={formData.descricao_base_pt || ''}
                  onChange={(e) => setFormData({ ...formData, descricao_base_pt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição Base (EN)</Label>
                <Input
                  value={formData.descricao_base_en || ''}
                  onChange={(e) => setFormData({ ...formData, descricao_base_en: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 p-4 bg-primary/5 border rounded-xl">
              <Label className="text-xs text-primary uppercase tracking-wider mb-3 font-semibold flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Preview da Descrição Automática
              </Label>
              <div className="space-y-2">
                <p className="text-sm font-medium leading-relaxed">
                  {formData.descr_pt || (
                    <span className="text-muted-foreground italic">
                      Preencha os campos para gerar (PT)
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {formData.descr_en || (
                    <span className="italic">Preencha os campos para gerar (EN)</span>
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 2: Especificações */}
          <section>
            <h3 className="text-lg font-semibold mb-6 border-b pb-2 flex items-center text-primary">
              <Settings className="mr-2 h-5 w-5" /> Especificações Técnicas
            </h3>

            {isMaquina ? (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Voltagem *</Label>
                  <Input
                    value={formData.voltagem || ''}
                    onChange={(e) => setFormData({ ...formData, voltagem: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Potência *</Label>
                  <Input
                    value={formData.potencia || ''}
                    onChange={(e) => setFormData({ ...formData, potencia: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Marca *</Label>
                  <Input
                    value={formData.marca || ''}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  />
                </div>
              </div>
            ) : isVidro ? (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Espessura *</Label>
                  <Input
                    value={formData.espessura || ''}
                    onChange={(e) => setFormData({ ...formData, espessura: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dimensão *</Label>
                  <Input
                    value={formData.dimensao || ''}
                    onChange={(e) => setFormData({ ...formData, dimensao: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Tipo Vidro *</Label>
                  <Input
                    value={formData.tipo_vidro || ''}
                    onChange={(e) => setFormData({ ...formData, tipo_vidro: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Material</Label>
                  <Input
                    value={formData.material || ''}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
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
                  <Label>Classe/Grau do Material</Label>
                  <Input
                    value={formData.classe_material || ''}
                    onChange={(e) => setFormData({ ...formData, classe_material: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Rosca</Label>
                  <Input
                    value={formData.tipo_rosca || ''}
                    onChange={(e) => setFormData({ ...formData, tipo_rosca: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Comprimento da Rosca</Label>
                  <Select
                    value={formData.comprimento_rosca}
                    onValueChange={(v) => setFormData({ ...formData, comprimento_rosca: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Total">Total</SelectItem>
                      <SelectItem value="Parcial">Parcial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tamanho {isFixador && '*'}</Label>
                  <Input
                    value={formData.tamanho || ''}
                    onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Acabamento {isFixador && '*'}</Label>
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
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full border border-black/10"
                                style={{ backgroundColor: a.cor_hex || '#fff' }}
                              />
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
                      className="shrink-0"
                      onClick={() => setFinishModalOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 3: Informações Adicionais */}
          <section>
            <h3 className="text-lg font-semibold mb-6 border-b pb-2 flex items-center text-primary">
              <Info className="mr-2 h-5 w-5" /> Informações Adicionais
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Info Extra (PT)</Label>
                <Textarea
                  value={formData.informacao_extra || ''}
                  onChange={(e) => setFormData({ ...formData, informacao_extra: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Info Extra (EN)</Label>
                <Textarea
                  value={formData.descricao_extra || ''}
                  onChange={(e) => setFormData({ ...formData, descricao_extra: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>NCM {(isFixador || isMaquina || isVidro) && '*'}</Label>
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
                    className="shrink-0"
                    onClick={() => setNcmModalOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 4: Preços e Status */}
          <section>
            <h3 className="text-lg font-semibold mb-6 border-b pb-2 flex items-center text-primary">
              <DollarSign className="mr-2 h-5 w-5" /> Preços e Status
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Preço Compra</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.preco_compra || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, preco_compra: parseFloat(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Preço Venda</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.preco_venda || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, preco_venda: parseFloat(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade de Medida</Label>
                <Select
                  value={formData.unidade || 'Pcs'}
                  onValueChange={(v) => setFormData({ ...formData, unidade: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pcs">Pcs (Peças)</SelectItem>
                    <SelectItem value="MPC">MPC (Mil Peças)</SelectItem>
                    <SelectItem value="kg">kg (Quilograma)</SelectItem>
                    <SelectItem value="m">m (Metro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ID Zoho Books</Label>
                <Input
                  disabled
                  value={formData.item_id_books || 'Não sincronizado'}
                  className="bg-muted"
                />
              </div>
              <div className="col-span-2 flex items-center justify-between p-4 border rounded-xl bg-card">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(c) => setFormData({ ...formData, ativo: c })}
                  />
                  <Label htmlFor="ativo" className="cursor-pointer">
                    Item Ativo no Catálogo
                  </Label>
                </div>
                <div>
                  {formData.sincronizado_com_zoho ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      Sincronizado
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200"
                    >
                      Pendente Sync
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 5: Fornecedor */}
          <section>
            <h3 className="text-lg font-semibold mb-6 border-b pb-2 flex items-center text-primary">
              <History className="mr-2 h-5 w-5" /> Fornecedor e Histórico
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Último Fornecedor Atualizado</Label>
                <Input
                  value={formData.fornecedor_ultima_atualizacao || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, fornecedor_ultima_atualizacao: e.target.value })
                  }
                />
              </div>
              {item && (
                <div className="space-y-2">
                  <Label>Última Atualização (Sistema)</Label>
                  <Input
                    disabled
                    value={new Date(item.updated).toLocaleString('pt-BR')}
                    className="bg-muted text-muted-foreground"
                  />
                </div>
              )}
            </div>
          </section>

          {/* SECTION 6: Imagem */}
          <section>
            <h3 className="text-lg font-semibold mb-6 border-b pb-2 flex items-center text-primary">
              <ImagePlus className="mr-2 h-5 w-5" /> Imagem e Catálogo
            </h3>

            <div className="mb-6 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSmartPhotoFetch}
                className="shadow-sm"
              >
                <Search className="w-4 h-4 mr-2" /> Buscar Foto Inteligente
              </Button>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 hover:bg-muted/30 transition-colors bg-card">
              {formData.foto_arquivo ? (
                <img
                  src={pb.files.getURL(item!, formData.foto_arquivo)}
                  alt="Preview"
                  className="max-h-48 object-contain rounded-lg shadow-sm"
                />
              ) : formData.foto_url ? (
                <img
                  src={formData.foto_url}
                  alt="Preview"
                  className="max-h-48 object-contain rounded-lg shadow-sm"
                />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center">
                  <Upload className="w-10 h-10 mb-3 opacity-40" />
                  <span className="text-sm font-medium">Nenhuma imagem vinculada</span>
                </div>
              )}
            </div>

            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label>Upload de Arquivo Local</Label>
                <Input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="file:text-primary file:bg-primary/10 file:border-0 file:rounded-md file:px-3 file:py-1 hover:file:bg-primary/20 text-sm h-auto py-2"
                />
              </div>
              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t"></div>
                <span className="shrink-0 px-4 text-xs text-muted-foreground uppercase font-medium">
                  Ou Link Externo
                </span>
                <div className="flex-grow border-t"></div>
              </div>
              <div className="space-y-2">
                <Label>URL da Imagem</Label>
                <div className="flex items-center gap-2">
                  <div className="bg-muted p-2 rounded-md border">
                    <LinkIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <Input
                    value={formData.foto_url || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, foto_url: e.target.value, foto_arquivo: '' })
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>

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
    </div>
  )
}
