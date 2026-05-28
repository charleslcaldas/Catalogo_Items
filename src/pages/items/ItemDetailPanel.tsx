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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useData, Item } from '@/contexts/data-context'
import { UnidadeMedidaModal } from '@/components/MetadataModals'
import { X, Upload, Link as LinkIcon, Plus, Trash2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { Badge } from '@/components/ui/badge'

export function ItemDetailPanel({ item, onClose }: { item?: Item; onClose: () => void }) {
  const { linhas, categorias, acabamentos, ncms, descricoesBase, unidadesMedida, saveItem } =
    useData()
  const [formData, setFormData] = useState<Partial<Item>>({})
  const [uploading, setUploading] = useState(false)
  const [unidModalOpen, setUnidModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleSave = async () => {
    if (!formData.sku || !formData.linha_id) {
      return toast.error('Preencha os campos obrigatórios (SKU, Linha)')
    }
    try {
      await saveItem(formData as Item)
      toast.success('Item salvo com sucesso')
      if (!item) onClose()
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message)
    }
  }

  const handleDuplicate = () => {
    if (!window.confirm('Deseja duplicar este item?')) return
    const clone = { ...formData }
    delete clone.id
    delete clone.created
    delete clone.updated
    clone.sincronizado_com_zoho = false
    clone.sku = `${clone.sku}-COPY`
    setFormData(clone)
    toast.success('Item duplicado na tela. Clique em Salvar para confirmar no banco.')
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

  const handleRemoveImage = async () => {
    if (item?.id && formData.foto_arquivo) {
      try {
        await pb.collection('itens').update(item.id, { foto_arquivo: null })
        setFormData((prev) => ({ ...prev, foto_arquivo: '' }))
        toast.success('Imagem removida')
      } catch (e) {
        toast.error('Erro ao remover')
      }
    } else {
      setFormData((prev) => ({ ...prev, foto_arquivo: '', foto_url: '' }))
    }
  }

  const handleBaseDescChange = (val: string) => {
    const desc = descricoesBase.find((d) => d.id === val)
    if (!desc) return
    setFormData((prev) => {
      const next = {
        ...prev,
        descricao_base_id: val,
        descricao_base_pt: desc.nome_pt,
        descricao_base_en: desc.nome_en,
        linha_id: desc.linha_id,
        ncm_id: desc.ncm_id || prev.ncm_id,
      }
      if (desc.ncm_id) {
        const ncm = ncms.find((n) => n.id === desc.ncm_id)
        if (ncm) {
          next.ii = ncm.ii
          next.ipi = ncm.ipi
          next.pis = ncm.pis
          next.cofins = ncm.cofins
        }
      }
      return next
    })
  }

  const handleNcmChange = (val: string) => {
    const ncm = ncms.find((n) => n.id === val)
    setFormData((prev) => ({
      ...prev,
      ncm_id: val,
      ...(ncm ? { ii: ncm.ii, ipi: ncm.ipi, pis: ncm.pis, cofins: ncm.cofins } : {}),
    }))
  }

  const getDescBaseTextPt = () =>
    formData.descricao_base_id
      ? descricoesBase.find((d) => d.id === formData.descricao_base_id)?.nome_pt
      : formData.descricao_base_pt
  const getDescBaseTextEn = () =>
    formData.descricao_base_id
      ? descricoesBase.find((d) => d.id === formData.descricao_base_id)?.nome_en
      : formData.descricao_base_en

  const previewPt =
    [
      getDescBaseTextPt(),
      formData.norma,
      formData.classe_material,
      formData.tipo_rosca,
      formData.tamanho,
    ]
      .filter(Boolean)
      .join(' ') || '-'
  const previewEn =
    [
      getDescBaseTextEn(),
      formData.norma,
      formData.classe_material,
      formData.tipo_rosca,
      formData.tamanho,
    ]
      .filter(Boolean)
      .join(' ') || '-'

  const selectedLinha = linhas.find((l) => l.id === formData.linha_id)
  const selectedCategoria = categorias.find((c) => c.id === selectedLinha?.categoria_id)
  const selectedNcm = ncms.find((n) => n.id === formData.ncm_id)

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="flex items-center justify-between p-4 border-b shrink-0 bg-card">
        <div>
          <h2 className="font-semibold text-lg">
            {item && formData.id ? 'Editar Item' : 'Novo Item'}
          </h2>
          <p className="text-xs text-muted-foreground">{formData.sku || 'SKU pendente'}</p>
        </div>
        <div className="flex items-center gap-2">
          {item && formData.id && (
            <Button variant="outline" size="sm" onClick={handleDuplicate} title="Duplicar">
              <Copy className="h-4 w-4 mr-2" /> Duplicar
            </Button>
          )}
          <Button onClick={handleSave} size="sm" className="h-8">
            Salvar
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-4">
        <div className="grid grid-cols-2 gap-4 mb-4 shrink-0">
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl p-3 shadow-sm">
            <div className="text-[10px] font-semibold text-blue-800 dark:text-blue-300 mb-1 uppercase tracking-wider">
              Preview Descrição (PT)
            </div>
            <div className="text-sm font-medium text-blue-950 dark:text-blue-100">{previewPt}</div>
          </div>
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl p-3 shadow-sm">
            <div className="text-[10px] font-semibold text-blue-800 dark:text-blue-300 mb-1 uppercase tracking-wider">
              Preview Descrição (EN)
            </div>
            <div className="text-sm font-medium text-blue-950 dark:text-blue-100">{previewEn}</div>
          </div>
        </div>

        <Tabs defaultValue="aba1" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-4 h-auto py-1 shrink-0 bg-muted/50">
            <TabsTrigger value="aba1" className="text-xs">
              Identificação
            </TabsTrigger>
            <TabsTrigger value="aba2" className="text-xs">
              Especificações
            </TabsTrigger>
            <TabsTrigger value="aba3" className="text-xs">
              Info Extras
            </TabsTrigger>
            <TabsTrigger value="aba4" className="text-xs">
              Preço/Status
            </TabsTrigger>
            <TabsTrigger value="aba5" className="text-xs">
              Fornecedor
            </TabsTrigger>
            <TabsTrigger value="aba6" className="text-xs">
              Imagem
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-1 pb-4">
            <TabsContent value="aba1" className="space-y-6 mt-0">
              <div className="space-y-2">
                <Label>Descrição Base (Template)</Label>
                <Select
                  value={formData.descricao_base_id || ''}
                  onValueChange={handleBaseDescChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione para preencher automaticamente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {descricoesBase.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.codigo} - {d.nome_pt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    SKU <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    readOnly={!!(item && formData.id)}
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className={item && formData.id ? 'bg-muted font-mono' : 'font-mono'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição Base (PT)</Label>
                  <Input
                    readOnly={!!formData.descricao_base_id}
                    value={getDescBaseTextPt() || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao_base_pt: e.target.value })
                    }
                    className={formData.descricao_base_id ? 'bg-muted' : ''}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Descrição Base (EN)</Label>
                  <Input
                    readOnly={!!formData.descricao_base_id}
                    value={getDescBaseTextEn() || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao_base_en: e.target.value })
                    }
                    className={formData.descricao_base_id ? 'bg-muted' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input
                    readOnly
                    value={selectedCategoria?.nome_pt || 'Selecione a Linha'}
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Linha <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.linha_id || ''}
                    onValueChange={(v) => setFormData({ ...formData, linha_id: v })}
                  >
                    <SelectTrigger>
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
                </div>
              </div>
            </TabsContent>

            <TabsContent value="aba2" className="mt-0">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
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
                      onChange={(e) =>
                        setFormData({ ...formData, classe_material: e.target.value })
                      }
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
                    <Label>Comprimento da Rosca (PT)</Label>
                    <Input
                      value={formData.comprimento_rosca || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, comprimento_rosca: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Comprimento da Rosca (EN)</Label>
                    <Input
                      value={formData.comprimento_rosca_en || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, comprimento_rosca_en: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tamanho</Label>
                    <Input
                      value={formData.tamanho || ''}
                      onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Acabamento</Label>
                    <Select
                      value={formData.acabamento_id || ''}
                      onValueChange={(v) => setFormData({ ...formData, acabamento_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {acabamentos.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full border border-black/10"
                                style={{ backgroundColor: a.cor_hex || '#fff' }}
                              />
                              {a.nome_pt}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="aba3" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Informação Extra (PT)</Label>
                <Textarea
                  value={formData.informacao_extra || ''}
                  onChange={(e) => setFormData({ ...formData, informacao_extra: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Informação Extra (EN)</Label>
                <Textarea
                  value={formData.descricao_extra || ''}
                  onChange={(e) => setFormData({ ...formData, descricao_extra: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                  <Label>NCM</Label>
                  <Select value={formData.ncm_id || ''} onValueChange={handleNcmChange}>
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
                  <Label>Observações do NCM</Label>
                  <Textarea
                    readOnly
                    value={selectedNcm?.observacoes || 'Sem observações cadastradas no NCM.'}
                    className="bg-muted min-h-[80px]"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="aba4" className="mt-0">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Preço Compra (USD)</Label>
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
                  <Label>Preço Venda (USD)</Label>
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
                  <div className="flex gap-2">
                    <Select
                      value={formData.unidade_id || ''}
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
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 text-green-600"
                      onClick={() => setUnidModalOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ID Zoho Books</Label>
                  <Input
                    readOnly
                    value={formData.item_id_books || 'Não sincronizado'}
                    className="bg-muted"
                  />
                </div>
                <div className="col-span-2 flex items-center justify-between p-4 border rounded-xl bg-muted/20">
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
                        Sincronizado Zoho
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
            </TabsContent>

            <TabsContent value="aba5" className="space-y-6 mt-0">
              <div className="space-y-2">
                <Label>Último Fornecedor Atualizado</Label>
                <Input
                  value={formData.fornecedor_ultima_atualizacao || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, fornecedor_ultima_atualizacao: e.target.value })
                  }
                />
              </div>
              {item?.id && (
                <div className="space-y-2">
                  <Label>Última Atualização (Sistema)</Label>
                  <Input
                    disabled
                    value={new Date(item.updated).toLocaleString('pt-BR')}
                    className="bg-muted text-muted-foreground"
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="aba6" className="mt-0">
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 hover:bg-muted/30 transition-colors bg-card mb-6">
                {formData.foto_arquivo ? (
                  <div className="relative group">
                    <img
                      src={pb.files.getURL(item!, formData.foto_arquivo)}
                      alt="Preview"
                      className="max-h-[200px] object-contain rounded-lg shadow-sm"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-3 -right-3 h-8 w-8 hidden group-hover:flex"
                      onClick={handleRemoveImage}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : formData.foto_url ? (
                  <div className="relative group">
                    <img
                      src={formData.foto_url}
                      alt="Preview"
                      className="max-h-[200px] object-contain rounded-lg shadow-sm"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-3 -right-3 h-8 w-8 hidden group-hover:flex"
                      onClick={handleRemoveImage}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center">
                    <Upload className="w-10 h-10 mb-3 opacity-40" />
                    <span className="text-sm font-medium">Nenhuma imagem vinculada</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
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
                <div className="relative flex items-center py-2">
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
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <UnidadeMedidaModal
        open={unidModalOpen}
        onOpenChange={setUnidModalOpen}
        onSaved={(u) => setFormData({ ...formData, unidade_id: u.id })}
      />
    </div>
  )
}
