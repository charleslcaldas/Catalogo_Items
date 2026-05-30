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
import { useData } from '@/contexts/data-context'
import type { Item, FotoCatalogo } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UnidadeMedidaModal } from '@/components/MetadataModals'
import {
  X,
  Upload,
  Link as LinkIcon,
  Plus,
  Trash2,
  Copy,
  ImageIcon,
  Languages,
  History as HistoryIcon,
  Activity,
} from 'lucide-react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { Badge } from '@/components/ui/badge'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-2.5 border-b last:border-0 border-border/40 gap-4 group hover:bg-muted/10 px-2 -mx-2 rounded-lg transition-colors">
      <Label className="w-[160px] shrink-0 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </Label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function GalleryModal({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSelect: (url: string) => void
}) {
  const [fotos, setFotos] = useState<FotoCatalogo[]>([])

  useEffect(() => {
    if (open) {
      pb.collection('foto_catalogo')
        .getFullList()
        .then(setFotos as any)
        .catch(console.error)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Galeria de Imagens do Catálogo</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 p-2">
          {fotos.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              Nenhuma imagem no catálogo.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {fotos.map((f) => (
                <div
                  key={f.id}
                  className="border bg-card rounded-xl p-3 cursor-pointer hover:border-primary hover:shadow-md transition-all group flex flex-col"
                  onClick={() => {
                    onSelect(f.url_foto)
                    onOpenChange(false)
                  }}
                >
                  <div className="aspect-square bg-muted/30 rounded-lg mb-3 overflow-hidden flex items-center justify-center p-2">
                    <img
                      src={f.url_foto}
                      alt={f.tipo}
                      className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p className="text-xs font-semibold text-center truncate">{f.tipo}</p>
                  <p className="text-[10px] text-muted-foreground text-center mt-1 truncate">
                    {f.tamanho || 'Sem tamanho'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ItemDetailPanel({ item, onClose }: { item?: Item; onClose: () => void }) {
  const { linhas, categorias, acabamentos, ncms, unidadesMedida, saveItem } = useData()
  const [formData, setFormData] = useState<Partial<Item>>({})
  const [uploading, setUploading] = useState(false)
  const [unidModalOpen, setUnidModalOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (item) {
      setFormData(item)
      pb.collection('potencial_itens')
        .getList(1, 20, { filter: `item_id="${item.id}"`, expand: 'potencial_id' })
        .then((res) => setTransactions(res.items))
        .catch(() => {})

      setHistory([
        { id: '1', date: item.updated, action: 'Última atualização do sistema', user: 'Admin' },
        { id: '2', date: item.created, action: 'Criação do Item', user: 'Admin' },
      ])
    } else {
      setFormData({
        ativo: true,
        sincronizado_com_zoho: false,
      })
      setTransactions([])
      setHistory([])
    }
  }, [item])

  useRealtime('itens', (e) => {
    if (e.action === 'update' && e.record.id === item?.id) {
      setHistory((prev) => [
        {
          id: Date.now().toString(),
          date: e.record.updated,
          action: 'Atualização remota (Background)',
          user: 'Sistema',
        },
        ...prev,
      ])
      setFormData((prev) => ({ ...prev, data_atualizacao: e.record.updated }))
    }
  })

  const handleSave = async () => {
    if (!formData.sku || !formData.linha_id) {
      return toast.error('Preencha os campos obrigatórios (SKU, Linha)')
    }
    try {
      const dataToSave = { ...formData, data_atualizacao: new Date().toISOString() }
      await saveItem(dataToSave as Item)
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
        setFormData((prev) => ({ ...prev, foto_arquivo: record.foto_arquivo, foto_url: '' }))
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
        setFormData((prev) => ({ ...prev, foto_arquivo: '', foto_url: '' }))
        toast.success('Imagem removida')
      } catch (e) {
        toast.error('Erro ao remover')
      }
    } else {
      setFormData((prev) => ({ ...prev, foto_arquivo: '', foto_url: '' }))
    }
  }

  const handleExtraBlur = async (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    if (!text) return
    toast.promise(
      pb
        .send('/backend/v1/translate', {
          method: 'POST',
          body: JSON.stringify({ text }),
        })
        .then((res) => {
          if (res.text) {
            setFormData((prev) => ({ ...prev, descricao_extra: res.text }))
          }
        }),
      {
        loading: 'Traduzindo com IA...',
        success: 'Tradução concluída',
        error: 'Erro na tradução',
      },
    )
  }

  const selectedAcabamento = acabamentos.find((a) => a.id === formData.acabamento_id)
  const selectedLinha = linhas.find((l) => l.id === formData.linha_id)
  const selectedCategoria = categorias.find((c) => c.id === selectedLinha?.categoria_id)

  const titlePt =
    [formData.descr_pt, formData.tamanho, selectedAcabamento?.nome_pt]
      .filter(Boolean)
      .join(' / ') || 'Novo Item'
  const titleEn =
    [formData.descr_en, formData.tamanho, selectedAcabamento?.nome_en]
      .filter(Boolean)
      .join(' / ') || 'New Item'

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="flex items-center justify-between p-5 border-b shrink-0 bg-card z-10 shadow-sm">
        <div className="flex flex-col gap-1 pr-4">
          <h2 className="font-bold text-xl text-foreground leading-tight">{titlePt}</h2>
          <h3 className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            <Languages className="w-3.5 h-3.5" /> {titleEn}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item && formData.id && (
            <Button variant="outline" size="sm" onClick={handleDuplicate} title="Duplicar">
              <Copy className="h-4 w-4 mr-2" /> Duplicar
            </Button>
          )}
          <Button onClick={handleSave} size="sm" className="h-9 px-6 shadow-sm">
            Salvar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 bg-muted/50 hover:bg-muted ml-1 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-5 bg-muted/10">
        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4 mb-6 shrink-0 bg-card border shadow-sm p-1 rounded-xl">
            <TabsTrigger
              value="overview"
              className="rounded-lg data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
            >
              Visão Geral
            </TabsTrigger>
            <TabsTrigger
              value="description"
              className="rounded-lg data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
            >
              Descrição (PT/EN)
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="rounded-lg data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
            >
              Transações
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-lg data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
            >
              Histórico
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-1 pb-10">
            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="mt-0 space-y-6 animate-fade-in-up">
              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Identificação e Classificação
                </h3>
                <div className="flex flex-col">
                  <Field label="SKU">
                    <Input
                      readOnly={!!(item && formData.id)}
                      value={formData.sku || ''}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className={cn(
                        'max-w-md',
                        item && formData.id ? 'bg-muted font-mono' : 'font-mono',
                      )}
                    />
                  </Field>
                  <Field label="Categoria">
                    <div className="h-9 flex items-center px-3 bg-muted/50 rounded-md max-w-md text-sm font-medium border border-border/50 text-muted-foreground">
                      {selectedCategoria?.nome_pt || 'Selecione uma Linha'}
                    </div>
                  </Field>
                  <Field label="Linha">
                    <Select
                      value={formData.linha_id || ''}
                      onValueChange={(v) => setFormData({ ...formData, linha_id: v })}
                    >
                      <SelectTrigger className="max-w-md">
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
                  </Field>
                  <Field label="Acabamento">
                    <Select
                      value={formData.acabamento_id || ''}
                      onValueChange={(v) => setFormData({ ...formData, acabamento_id: v })}
                    >
                      <SelectTrigger className="max-w-md">
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
                  </Field>
                  <Field label="NCM">
                    <Select
                      value={formData.ncm_id || ''}
                      onValueChange={(v) => setFormData({ ...formData, ncm_id: v })}
                    >
                      <SelectTrigger className="max-w-md">
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
                  </Field>
                  <Field label="Tamanho">
                    <Input
                      value={formData.tamanho || ''}
                      onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                      className="max-w-md"
                    />
                  </Field>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-card border rounded-2xl p-6 shadow-sm">
                  <h3 className="font-semibold text-base mb-4">Especificações Técnicas</h3>
                  <div className="flex flex-col">
                    <Field label="Norma">
                      <Input
                        value={formData.norma || ''}
                        onChange={(e) => setFormData({ ...formData, norma: e.target.value })}
                      />
                    </Field>
                    <Field label="Grau/Material">
                      <Input
                        value={formData.classe_material || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, classe_material: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Tipo Rosca">
                      <Input
                        value={formData.tipo_rosca || ''}
                        onChange={(e) => setFormData({ ...formData, tipo_rosca: e.target.value })}
                      />
                    </Field>
                    <Field label="Comp. Rosca">
                      <Input
                        value={formData.comprimento_rosca || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, comprimento_rosca: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Unidade">
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
                          onClick={() => setUnidModalOpen(true)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </Field>
                  </div>
                </div>

                <div className="bg-card border rounded-2xl p-6 shadow-sm">
                  <h3 className="font-semibold text-base mb-4">Comercial e Status</h3>
                  <div className="flex flex-col">
                    <Field label="Preço Compra ($)">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.preco_compra || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, preco_compra: parseFloat(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="Preço Venda ($)">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.preco_venda || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, preco_venda: parseFloat(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="Validade Preço">
                      <Input
                        type="date"
                        value={formData.validade_preco ? formData.validade_preco.split('T')[0] : ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            validade_preco: new Date(e.target.value).toISOString(),
                          })
                        }
                      />
                    </Field>
                    <Field label="Status">
                      <div className="flex items-center space-x-2 py-1.5">
                        <Switch
                          id="ativo"
                          checked={formData.ativo}
                          onCheckedChange={(c) => setFormData({ ...formData, ativo: c })}
                        />
                        <Label htmlFor="ativo" className="cursor-pointer">
                          {formData.ativo ? 'Ativo no Catálogo' : 'Inativo'}
                        </Label>
                      </div>
                    </Field>
                    <Field label="Integração Zoho">
                      <Badge
                        variant="outline"
                        className={
                          formData.sincronizado_com_zoho
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }
                      >
                        {formData.sincronizado_com_zoho ? 'Sincronizado' : 'Pendente'}
                      </Badge>
                    </Field>
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-base mb-4">Imagem do Produto</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="w-40 h-40 shrink-0 border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/30 relative group overflow-hidden">
                    {formData.foto_arquivo || formData.foto_url ? (
                      <>
                        <img
                          src={
                            formData.foto_arquivo && item
                              ? pb.files.getURL(item, formData.foto_arquivo)
                              : formData.foto_url
                          }
                          alt="Preview"
                          className="max-w-full max-h-full object-contain p-2"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="destructive" size="sm" onClick={handleRemoveImage}>
                            <Trash2 className="w-4 h-4 mr-2" /> Remover
                          </Button>
                        </div>
                      </>
                    ) : (
                      <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Associe uma imagem da galeria central ou faça o upload de um arquivo
                      específico para este item.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => setGalleryOpen(true)}
                      >
                        <ImageIcon className="w-4 h-4 mr-2" /> Escolher da Galeria
                      </Button>
                      <div className="relative w-full sm:w-auto">
                        <Input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          disabled={uploading}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full"
                          disabled={uploading}
                        >
                          <Upload className="w-4 h-4 mr-2" />{' '}
                          {uploading ? 'Enviando...' : 'Upload Local'}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 max-w-md">
                      <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Input
                        placeholder="Ou cole uma URL..."
                        value={formData.foto_url || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, foto_url: e.target.value, foto_arquivo: '' })
                        }
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* DESCRIPTION TAB */}
            <TabsContent value="description" className="mt-0 h-full animate-fade-in-up">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                {/* PT Col */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      PT
                    </div>
                    <h3 className="font-semibold">Português</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Descrição Completa (Interna)</Label>
                      <Textarea
                        value={formData.descr_pt || ''}
                        onChange={(e) => setFormData({ ...formData, descr_pt: e.target.value })}
                        className="resize-none h-24"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição Catálogo (Curta)</Label>
                      <Textarea
                        value={formData.descricao_catalogo_pt || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, descricao_catalogo_pt: e.target.value })
                        }
                        className="resize-none h-20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Informação Extra (Aciona Tradutor IA)</Label>
                      <Textarea
                        value={formData.informacao_extra || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, informacao_extra: e.target.value })
                        }
                        onBlur={handleExtraBlur}
                        className="resize-none h-32 bg-blue-50/30 focus-visible:ring-blue-200"
                        placeholder="Digite aqui e clique fora para traduzir..."
                      />
                    </div>
                  </div>
                </div>

                {/* EN Col */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="w-6 h-6 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                      EN
                    </div>
                    <h3 className="font-semibold">Inglês</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Description (Internal)</Label>
                      <Textarea
                        value={formData.descr_en || ''}
                        onChange={(e) => setFormData({ ...formData, descr_en: e.target.value })}
                        className="resize-none h-24"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Catalog Description (Short)</Label>
                      <Textarea
                        value={formData.descricao_catalogo_en || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, descricao_catalogo_en: e.target.value })
                        }
                        className="resize-none h-20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Extra Information</Label>
                      <Textarea
                        value={formData.descricao_extra || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, descricao_extra: e.target.value })
                        }
                        className="resize-none h-32"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TRANSACTIONS TAB */}
            <TabsContent value="transactions" className="mt-0 animate-fade-in-up">
              <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 bg-muted/30 border-b flex items-center gap-3">
                  <Activity className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold text-sm">Cotações e Transações Relacionadas</h3>
                    <p className="text-xs text-muted-foreground">
                      Itens de potenciais onde este produto foi incluído.
                    </p>
                  </div>
                </div>
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {transactions.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground text-sm flex flex-col items-center">
                      <Activity className="w-8 h-8 opacity-20 mb-3" />
                      Nenhuma transação encontrada para este item.
                    </div>
                  ) : (
                    transactions.map((t) => (
                      <div
                        key={t.id}
                        className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-primary">
                            Potencial {t.expand?.potencial_id?.numero_potencial}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t.expand?.potencial_id?.cliente}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="mb-1">
                            {t.quantidade} {t.unidade_medida || 'un'}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {new Date(t.created).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            {/* HISTORY TAB */}
            <TabsContent value="history" className="mt-0 animate-fade-in-up">
              <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 bg-muted/30 border-b flex items-center gap-3">
                  <HistoryIcon className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold text-sm">Registro de Auditoria</h3>
                    <p className="text-xs text-muted-foreground">
                      Últimas modificações no registro do item.
                    </p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="relative border-l-2 border-muted ml-3 space-y-8">
                    {history.map((h, i) => (
                      <div key={h.id} className="relative pl-6">
                        <div
                          className={cn(
                            'absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-background',
                            i === 0 ? 'bg-primary' : 'bg-muted-foreground',
                          )}
                        />
                        <p className="text-sm font-medium">{h.action}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {h.user}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(h.date).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    ))}
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
      <GalleryModal
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        onSelect={(url) => setFormData({ ...formData, foto_url: url, foto_arquivo: '' })}
      />
    </div>
  )
}
