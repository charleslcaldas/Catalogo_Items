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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useData } from '@/contexts/data-context'
import { Item } from '@/types'
import { X, Upload, Link as LinkIcon, RefreshCw, Plus } from 'lucide-react'
import { LineModal, FinishModal, NcmModal } from '@/components/MetadataModals'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'

function generateDescription(base: string, parts: (string | undefined)[]) {
  return [base, ...parts]
    .filter(Boolean)
    .map((s) => s?.trim())
    .join(' ')
}

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
      })
    }
  }, [item])

  const autoGeneratePt = () => {
    const acabamento = acabamentos.find((a) => a.id === formData.acabamento_id)?.nome_pt
    const desc = generateDescription(formData.descricao_base_pt || '', [
      formData.classe_material,
      formData.tipo_rosca,
      formData.norma,
      formData.comprimento_rosca,
      formData.informacao_extra,
      formData.tamanho,
      acabamento,
    ])
    setFormData((prev) => ({ ...prev, descr_pt: desc }))
  }

  const autoGenerateEn = () => {
    const acabamento = acabamentos.find((a) => a.id === formData.acabamento_id)?.nome_en
    const desc = generateDescription(formData.descricao_base_en || '', [
      formData.classe_material,
      formData.tipo_rosca,
      formData.norma,
      formData.comprimento_rosca,
      formData.informacao_extra,
      formData.tamanho,
      acabamento,
    ])
    setFormData((prev) => ({ ...prev, descr_en: desc }))
  }

  const handleSave = async () => {
    if (!formData.sku || !formData.linha_id || !formData.descr_pt) {
      return toast.error('Preencha os campos obrigatórios (SKU, Linha, Descrição PT)')
    }

    if (
      isFixador &&
      (!formData.tipo ||
        !formData.subtipo ||
        !formData.descricao_base_pt ||
        !formData.tamanho ||
        !formData.acabamento_id ||
        !formData.ncm_id)
    ) {
      return toast.error(
        'Fixadores exigem Tipo, Subtipo, Descrição Base, Tamanho, Acabamento e NCM.',
      )
    }
    if (
      isMaquina &&
      (!formData.tipo ||
        !formData.descricao_base_pt ||
        !formData.voltagem ||
        !formData.potencia ||
        !formData.marca ||
        !formData.ncm_id)
    ) {
      return toast.error('Máquinas exigem Tipo, Descrição Base, Voltagem, Potência, Marca e NCM.')
    }
    if (
      isVidro &&
      (!formData.tipo ||
        !formData.descricao_base_pt ||
        !formData.espessura ||
        !formData.dimensao ||
        !formData.tipo_vidro ||
        !formData.ncm_id)
    ) {
      return toast.error(
        'Vidros exigem Tipo, Descrição Base, Espessura, Dimensão, Tipo Vidro e NCM.',
      )
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

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <h2 className="font-semibold text-lg">{item ? 'Editar Item' : 'Novo Item'}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid grid-cols-3 md:grid-cols-6 h-auto p-1 bg-muted/50 rounded-lg">
              <TabsTrigger value="geral" className="text-xs">
                Geral
              </TabsTrigger>
              <TabsTrigger value="class" className="text-xs">
                Classe
              </TabsTrigger>
              <TabsTrigger value="desc" className="text-xs">
                Desc
              </TabsTrigger>
              <TabsTrigger value="attrs" className="text-xs">
                Atrbs
              </TabsTrigger>
              <TabsTrigger value="preco" className="text-xs">
                Status
              </TabsTrigger>
              <TabsTrigger value="img" className="text-xs">
                Img
              </TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>
                  SKU <span className="text-destructive">*</span>
                </Label>
                <Input
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
              <div className="grid grid-cols-2 gap-4">
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
              </div>
            </TabsContent>

            <TabsContent value="class" className="space-y-4 pt-4">
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
              <div className="space-y-2">
                <Label>Classe Material</Label>
                <Input
                  value={formData.classe_material || ''}
                  onChange={(e) => setFormData({ ...formData, classe_material: e.target.value })}
                />
              </div>
            </TabsContent>

            <TabsContent value="desc" className="space-y-4 pt-4">
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

              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label>
                    Descrição PT <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={autoGeneratePt}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Auto
                  </Button>
                </div>
                <Textarea
                  value={formData.descr_pt || ''}
                  onChange={(e) => setFormData({ ...formData, descr_pt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Descrição EN</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={autoGenerateEn}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Auto
                  </Button>
                </div>
                <Textarea
                  value={formData.descr_en || ''}
                  onChange={(e) => setFormData({ ...formData, descr_en: e.target.value })}
                />
              </div>
            </TabsContent>

            <TabsContent value="attrs" className="space-y-4 pt-4">
              {isMaquina && (
                <div className="grid grid-cols-2 gap-4">
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
              )}
              {isVidro && (
                <div className="grid grid-cols-2 gap-4">
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
              )}
              {!isMaquina && !isVidro && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tamanho {isFixador && '*'}</Label>
                      <Input
                        value={formData.tamanho || ''}
                        onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
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
                      <Label>Comp. Rosca</Label>
                      <Input
                        value={formData.comprimento_rosca || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, comprimento_rosca: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
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
                              {a.nome_pt}
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
                </>
              )}
              <div className="space-y-2">
                <Label>Informação Extra</Label>
                <Input
                  value={formData.informacao_extra || ''}
                  onChange={(e) => setFormData({ ...formData, informacao_extra: e.target.value })}
                />
              </div>
            </TabsContent>

            <TabsContent value="preco" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2 col-span-2">
                  <Label>ID Zoho Books</Label>
                  <Input disabled value={formData.item_id_books || 'Não sincronizado'} />
                </div>
                <div className="flex items-center space-x-2 pt-4 col-span-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(c) => setFormData({ ...formData, ativo: c })}
                  />
                  <Label htmlFor="ativo">Item Ativo no Sistema</Label>
                </div>
                <div className="flex items-center space-x-2 pt-2 col-span-2">
                  <Switch
                    id="sync"
                    checked={formData.sincronizado_com_zoho}
                    onCheckedChange={(c) => setFormData({ ...formData, sincronizado_com_zoho: c })}
                  />
                  <Label htmlFor="sync">Forçar Sincronização Concluída</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="img" className="space-y-4 pt-4">
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 hover:bg-muted/50 transition-colors">
                {formData.foto_arquivo ? (
                  <img
                    src={pb.files.getURL(item!, formData.foto_arquivo)}
                    alt="Preview"
                    className="h-32 object-contain rounded-lg"
                  />
                ) : formData.foto_url ? (
                  <img
                    src={formData.foto_url}
                    alt="Preview"
                    className="h-32 object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center">
                    <Upload className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm">Nenhuma imagem</span>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload de Arquivo (Substitui URL)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="file:text-primary file:bg-primary/10 file:border-0 file:rounded-md file:px-2 file:py-1 hover:file:bg-primary/20"
                    />
                  </div>
                </div>
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t"></div>
                  <span className="shrink-0 px-2 text-xs text-muted-foreground uppercase">Ou</span>
                  <div className="flex-grow border-t"></div>
                </div>
                <div className="space-y-2">
                  <Label>URL da Imagem</Label>
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-muted-foreground" />
                    <Input
                      value={formData.foto_url || ''}
                      onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      <div className="p-4 border-t shrink-0 flex justify-end gap-2 bg-muted/20">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave}>Salvar</Button>
      </div>

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
