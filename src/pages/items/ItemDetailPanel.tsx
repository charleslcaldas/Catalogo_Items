import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { Item } from '@/types'
import { X, Copy, ImageIcon, History as HistoryIcon, Activity } from 'lucide-react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { GalleryModal } from './GalleryModal'
import { CategoryModal, LineModal } from '@/components/MetadataModals'
import { cn } from '@/lib/utils'
import { SearchableSelect } from '@/components/SearchableSelect'
import { NewDescBaseModal } from '@/components/NewDescBaseModal'
import { PriceInput } from '@/components/PriceInput'

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label
        className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate"
        title={label}
      >
        {label}
      </Label>
      {children}
    </div>
  )
}

export function ItemDetailPanel({ item, onClose }: { item?: Item; onClose: () => void }) {
  const { linhas, categorias, acabamentos, ncms, unidadesMedida, descricoesBase, saveItem } =
    useData()

  const [formData, setFormData] = useState<Partial<Item>>({})
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])

  const [catModalOpen, setCatModalOpen] = useState(false)
  const [lineModalOpen, setLineModalOpen] = useState(false)
  const [newDescBaseModalOpen, setNewDescBaseModalOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')

  useEffect(() => {
    if (item) {
      setFormData(item)
      const linha = linhas.find((l) => l.id === item.linha_id)
      if (linha) setSelectedCategoryId(linha.categoria_id)

      pb.collection('potencial_itens')
        .getList(1, 20, { filter: `item_id="${item.id}"`, expand: 'potencial_id' })
        .then((res) => setTransactions(res.items))
        .catch(() => {})
    } else {
      setFormData({ ativo: true, sincronizado_com_zoho: false })
      setSelectedCategoryId('')
      setTransactions([])
    }
  }, [item, linhas])

  const handleTranslate = async (
    field: 'informacao_extra' | 'descricao_extra',
    text: string,
    from: 'pt' | 'en',
  ) => {
    const targetField = from === 'pt' ? `${field}_en` : field
    if (!text) {
      setFormData((p) => ({ ...p, [targetField]: '' }))
      return
    }

    let textToTranslate = text
    if (from === 'pt') {
      textToTranslate = textToTranslate
        .replace(/Rosca Total/gi, 'Full Thread')
        .replace(/Rosca Parcial/gi, 'Partial Thread')
    } else {
      textToTranslate = textToTranslate
        .replace(/Full Thread/gi, 'Rosca Total')
        .replace(/Partial Thread/gi, 'Rosca Parcial')
    }

    toast.promise(
      pb.send('/backend/v1/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: textToTranslate,
          source: from,
          target: from === 'pt' ? 'en' : 'pt',
        }),
      }),
      {
        loading: 'Traduzindo...',
        success: (res) => {
          if (res.text) setFormData((p) => ({ ...p, [targetField]: res.text }))
          return 'Tradução concluída'
        },
        error: 'Erro na tradução',
      },
    )
  }

  const handleSave = async () => {
    if (!formData.sku || !formData.linha_id)
      return toast.error('Preencha os campos obrigatórios (SKU, Linha)')
    try {
      const descBasePt =
        descricoesBase.find((d) => d.id === formData.descricao_base_id)?.nome_pt ||
        formData.descricao_base_pt ||
        ''
      const descricao_curta = [
        descBasePt,
        formData.classe_material,
        formData.norma,
        formData.tipo_rosca,
        formData.comprimento_rosca,
        formData.informacao_extra,
      ]
        .filter(Boolean)
        .join(' ')

      const descBaseEn =
        descricoesBase.find((d) => d.id === formData.descricao_base_id)?.nome_en ||
        formData.descricao_base_en ||
        ''
      const descricao_curta_en = [
        descBaseEn,
        formData.classe_material,
        formData.norma,
        formData.tipo_rosca,
        formData.comprimento_rosca_en || formData.comprimento_rosca,
        formData.informacao_extra_en,
      ]
        .filter(Boolean)
        .join(' ')

      await saveItem({
        ...formData,
        descricao_curta,
        descricao_curta_en,
        descr_pt: descricao_curta || formData.descr_pt || 'Sem descrição',
        descr_en: descricao_curta_en || formData.descr_en || '',
        data_atualizacao: new Date().toISOString(),
      } as Item)

      toast.success('Item salvo')
      if (!item) onClose()
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message)
    }
  }

  const selAcabamento = acabamentos.find((a) => a.id === formData.acabamento_id)
  const descBasePt =
    descricoesBase.find((d) => d.id === formData.descricao_base_id)?.nome_pt ||
    formData.descricao_base_pt ||
    ''
  const descBaseEn =
    descricoesBase.find((d) => d.id === formData.descricao_base_id)?.nome_en ||
    formData.descricao_base_en ||
    ''

  const fullDescPt = [
    descBasePt,
    formData.classe_material,
    formData.norma,
    formData.tipo_rosca,
    formData.comprimento_rosca,
    formData.tamanho,
    selAcabamento?.nome_pt,
  ]
    .filter(Boolean)
    .join(' ')
  const fullDescEn = [
    descBaseEn,
    formData.classe_material,
    formData.norma,
    formData.tipo_rosca,
    formData.comprimento_rosca_en || formData.comprimento_rosca,
    formData.tamanho,
    selAcabamento?.nome_en || selAcabamento?.nome_pt,
  ]
    .filter(Boolean)
    .join(' ')

  const imageUrl =
    formData.foto_arquivo && item?.id
      ? pb.files.getURL(item, formData.foto_arquivo)
      : formData.foto_url || 'https://img.usecurling.com/p/200/200?q=tools&color=gray'

  const categoryOptions = categorias.map((c) => ({ value: c.id, label: c.nome_pt, color: c.color }))
  const filteredLinhas = linhas.filter(
    (l) => !selectedCategoryId || l.categoria_id === selectedCategoryId,
  )
  const lineOptions = filteredLinhas.map((l) => ({ value: l.id, label: l.nome_pt, color: l.color }))
  const descBaseOptions = descricoesBase.map((d) => ({ value: d.id, label: d.nome_pt }))
  const acabamentoOptions = acabamentos.map((a) => ({
    value: a.id,
    label: a.nome_pt,
    color: a.cor_hex,
  }))
  const ncmOptions = ncms.map((n) => ({ value: n.id, label: n.codigo }))

  const descBaseOptionsEn = descricoesBase.map((d) => ({
    value: d.id,
    label: d.nome_en || d.nome_pt,
  }))
  const acabamentoOptionsEn = acabamentos.map((a) => ({
    value: a.id,
    label: a.nome_en || a.nome_pt,
    color: a.cor_hex,
  }))

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="flex items-start justify-between p-4 border-b bg-card z-10 shadow-sm shrink-0">
        <div className="flex items-start gap-4 flex-1 min-w-0 pr-4">
          <div
            className="w-24 h-24 shrink-0 rounded-lg border bg-muted/30 cursor-pointer hover:opacity-80 relative group flex items-center justify-center overflow-hidden"
            onClick={() => setGalleryOpen(true)}
          >
            <img
              src={imageUrl}
              alt="Item"
              className="max-w-full max-h-full object-contain p-1 mix-blend-multiply"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ImageIcon className="text-white w-6 h-6" />
            </div>
          </div>
          <div className="flex flex-col min-w-0 py-1">
            <h2 className="font-bold text-lg text-foreground whitespace-pre-wrap leading-tight">
              {fullDescPt || 'Nova Descrição Completa'}
            </h2>
            <h3 className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap leading-snug">
              {fullDescEn || 'New Full Description'}
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs bg-muted/30">
                {formData.sku || 'SKU Pendente'}
              </Badge>
              {formData.ativo ? (
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 shadow-none">
                  Ativo
                </Badge>
              ) : (
                <Badge variant="secondary">Inativo</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item && formData.id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const c = { ...formData }
                delete c.id
                c.sku += '-COPY'
                setFormData(c)
                toast.success('Duplicado na tela')
              }}
            >
              <Copy className="h-4 w-4 mr-2" /> Duplicar
            </Button>
          )}
          <Button onClick={handleSave} size="sm">
            Salvar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="bg-muted/50 hover:bg-muted ml-1 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pt" className="flex-1 flex flex-col min-h-0 overflow-hidden bg-muted/10">
        <div className="px-4 pt-4 shrink-0 bg-card z-10 flex flex-col gap-4">
          <Field label="Descrição Base (Auto-preenchimento)">
            <SearchableSelect
              options={descBaseOptions}
              value={formData.descricao_base_id}
              onChange={(v) => {
                const desc = descricoesBase.find((d) => d.id === v)
                if (desc) {
                  setFormData((f) => ({
                    ...f,
                    descricao_base_id: v,
                    ...(desc.linha_id ? { linha_id: desc.linha_id } : {}),
                    ...(desc.ncm_id ? { ncm_id: desc.ncm_id } : {}),
                  }))
                  if (desc.linha_id) {
                    const linha = linhas.find((l) => l.id === desc.linha_id)
                    if (linha) setSelectedCategoryId(linha.categoria_id)
                  } else if (desc.categoria_id) {
                    setSelectedCategoryId(desc.categoria_id)
                  }
                }
              }}
              onAddNew={() => setNewDescBaseModalOpen(true)}
              placeholder="Buscar ou criar descrição base..."
            />
          </Field>

          <TabsList className="flex w-full bg-transparent border-b border-border p-0 h-auto rounded-none justify-start overflow-x-auto">
            <TabsTrigger
              value="pt"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:font-bold px-4 py-3 text-sm transition-all"
            >
              Descrição PT
            </TabsTrigger>
            <TabsTrigger
              value="en"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:font-bold px-4 py-3 text-sm transition-all"
            >
              Descrição EN
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:font-bold px-4 py-3 text-sm transition-all"
            >
              Transações
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:font-bold px-4 py-3 text-sm transition-all"
            >
              Histórico
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <TabsContent value="pt" className="m-0 space-y-4 animate-fade-in-up pb-6">
            <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="SKU">
                  <Input
                    className="h-8"
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </Field>
                <Field label="Categoria">
                  <SearchableSelect
                    options={categoryOptions}
                    value={selectedCategoryId}
                    onChange={(v) => {
                      setSelectedCategoryId(v)
                      setFormData((f) => ({ ...f, linha_id: '' }))
                    }}
                    onAddNew={() => setCatModalOpen(true)}
                  />
                </Field>
                <Field label="Linha">
                  <SearchableSelect
                    options={lineOptions}
                    value={formData.linha_id}
                    onChange={(v) => setFormData((f) => ({ ...f, linha_id: v }))}
                    onAddNew={() => setLineModalOpen(true)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 border-t pt-4">
                <Field label="Preço Compra">
                  <PriceInput
                    value={formData.preco_compra}
                    onChange={(val) => setFormData({ ...formData, preco_compra: val })}
                  />
                </Field>
                <Field label="Preço Venda">
                  <PriceInput
                    value={formData.preco_venda}
                    onChange={(val) => setFormData({ ...formData, preco_venda: val })}
                  />
                </Field>
                <Field label="Status">
                  <div className="flex items-center gap-2 h-8">
                    <Switch
                      checked={formData.ativo}
                      onCheckedChange={(c) => setFormData({ ...formData, ativo: c })}
                    />
                    <span className="text-sm font-medium">
                      {formData.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </Field>
                <Field label="Integração Zoho">
                  <Badge
                    variant="outline"
                    className={cn(
                      'mt-1 w-fit',
                      formData.sincronizado_com_zoho
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200',
                    )}
                  >
                    {formData.sincronizado_com_zoho ? 'Sincronizado' : 'Pendente'}
                  </Badge>
                </Field>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col gap-4">
              <h4 className="font-semibold text-sm">Atributos Técnicos</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Acabamento">
                  <SearchableSelect
                    options={acabamentoOptions}
                    value={formData.acabamento_id}
                    onChange={(v) => setFormData((f) => ({ ...f, acabamento_id: v }))}
                  />
                </Field>
                <Field label="NCM">
                  <SearchableSelect
                    options={ncmOptions}
                    value={formData.ncm_id}
                    onChange={(v) => setFormData((f) => ({ ...f, ncm_id: v }))}
                  />
                </Field>
                <Field label="Grau/Material">
                  <Input
                    className="h-8"
                    value={formData.classe_material || ''}
                    onChange={(e) => setFormData({ ...formData, classe_material: e.target.value })}
                  />
                </Field>
                <Field label="Norma">
                  <Input
                    className="h-8"
                    value={formData.norma || ''}
                    onChange={(e) => setFormData({ ...formData, norma: e.target.value })}
                  />
                </Field>
                <Field label="Tipo Rosca">
                  <Input
                    className="h-8"
                    value={formData.tipo_rosca || ''}
                    onChange={(e) => setFormData({ ...formData, tipo_rosca: e.target.value })}
                  />
                </Field>
                <Field label="Comp. Rosca">
                  <Input
                    className="h-8"
                    value={formData.comprimento_rosca || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, comprimento_rosca: e.target.value })
                    }
                  />
                </Field>
                <Field label="Tamanho">
                  <Input
                    className="h-8"
                    value={formData.tamanho || ''}
                    onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                  />
                </Field>
                <Field label="Unid. Medida">
                  <Select
                    value={formData.unidade_id || ''}
                    onValueChange={(v) => setFormData((f) => ({ ...f, unidade_id: v }))}
                  >
                    <SelectTrigger className="h-8">
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
                </Field>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col gap-4">
              <h4 className="font-semibold text-sm">Informações Adicionais</h4>
              <div className="grid grid-cols-1 gap-4">
                <Field label="Info Extra">
                  <Input
                    className="h-8"
                    value={formData.informacao_extra || ''}
                    onChange={(e) => setFormData({ ...formData, informacao_extra: e.target.value })}
                    onBlur={(e) => handleTranslate('informacao_extra', e.target.value, 'pt')}
                  />
                </Field>
                <Field label="Desc. Extra">
                  <Textarea
                    className="min-h-[60px] resize-none text-sm"
                    value={formData.descricao_extra || ''}
                    onChange={(e) => setFormData({ ...formData, descricao_extra: e.target.value })}
                    onBlur={(e) => handleTranslate('descricao_extra', e.target.value, 'pt')}
                  />
                </Field>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="en" className="m-0 space-y-4 animate-fade-in-up pb-6">
            <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="SKU">
                  <div className="h-8 px-3 flex items-center bg-muted/30 rounded-md border text-sm font-medium">
                    {formData.sku || '-'}
                  </div>
                </Field>
                <Field label="Category">
                  <div className="h-8 px-3 flex items-center bg-muted/30 rounded-md border text-sm text-muted-foreground truncate">
                    {categorias.find((c) => c.id === selectedCategoryId)?.nome_en ||
                      categorias.find((c) => c.id === selectedCategoryId)?.nome_pt ||
                      '-'}
                  </div>
                </Field>
                <Field label="Line">
                  <div className="h-8 px-3 flex items-center bg-muted/30 rounded-md border text-sm text-muted-foreground truncate">
                    {linhas.find((l) => l.id === formData.linha_id)?.nome_en ||
                      linhas.find((l) => l.id === formData.linha_id)?.nome_pt ||
                      '-'}
                  </div>
                </Field>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col gap-4">
              <h4 className="font-semibold text-sm">Technical Attributes</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Finish">
                  <SearchableSelect
                    options={acabamentoOptionsEn}
                    value={formData.acabamento_id}
                    onChange={(v) => setFormData((f) => ({ ...f, acabamento_id: v }))}
                  />
                </Field>
                <Field label="NCM">
                  <div className="h-8 px-3 flex items-center bg-muted/30 rounded-md border text-sm text-muted-foreground truncate">
                    {ncms.find((n) => n.id === formData.ncm_id)?.codigo || '-'}
                  </div>
                </Field>
                <Field label="Grade/Material">
                  <Input
                    className="h-8"
                    value={formData.classe_material || ''}
                    onChange={(e) => setFormData({ ...formData, classe_material: e.target.value })}
                  />
                </Field>
                <Field label="Norm">
                  <Input
                    className="h-8"
                    value={formData.norma || ''}
                    onChange={(e) => setFormData({ ...formData, norma: e.target.value })}
                  />
                </Field>
                <Field label="Thread Type">
                  <Input
                    className="h-8"
                    value={formData.tipo_rosca || ''}
                    onChange={(e) => setFormData({ ...formData, tipo_rosca: e.target.value })}
                  />
                </Field>
                <Field label="Thread Length (EN)">
                  <Input
                    className="h-8"
                    value={formData.comprimento_rosca_en || formData.comprimento_rosca || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, comprimento_rosca_en: e.target.value })
                    }
                  />
                </Field>
                <Field label="Size">
                  <Input
                    className="h-8"
                    value={formData.tamanho || ''}
                    onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                  />
                </Field>
                <Field label="Unit">
                  <div className="h-8 px-3 flex items-center bg-muted/30 rounded-md border text-sm text-muted-foreground truncate">
                    {unidadesMedida.find((u) => u.id === formData.unidade_id)?.nome || '-'}
                  </div>
                </Field>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col gap-4">
              <h4 className="font-semibold text-sm">Additional Information</h4>
              <div className="grid grid-cols-1 gap-4">
                <Field label="Extra Info (EN)">
                  <Input
                    className="h-8"
                    value={formData.informacao_extra_en || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, informacao_extra_en: e.target.value })
                    }
                    onBlur={(e) => handleTranslate('informacao_extra', e.target.value, 'en')}
                  />
                </Field>
                <Field label="Extra Desc. (EN)">
                  <Textarea
                    className="min-h-[60px] resize-none text-sm"
                    value={formData.descricao_extra_en || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao_extra_en: e.target.value })
                    }
                    onBlur={(e) => handleTranslate('descricao_extra', e.target.value, 'en')}
                  />
                </Field>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="m-0 animate-fade-in-up pb-6">
            <div className="bg-card border rounded-lg shadow-sm divide-y">
              <div className="p-4 bg-muted/30 flex items-center gap-3">
                <Activity className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm">Transações</h3>
                  <p className="text-xs text-muted-foreground">Onde este item foi cotado</p>
                </div>
              </div>
              {transactions.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">
                  Nenhuma transação encontrada.
                </div>
              ) : (
                transactions.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        Potencial {t.expand?.potencial_id?.numero_potencial}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.expand?.potencial_id?.cliente}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{t.quantidade} un</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(t.created).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="m-0 animate-fade-in-up pb-6">
            <div className="bg-card border rounded-lg shadow-sm">
              <div className="p-4 bg-muted/30 flex items-center gap-3 border-b">
                <HistoryIcon className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm">Histórico</h3>
                  <p className="text-xs text-muted-foreground">Últimas atualizações</p>
                </div>
              </div>
              <div className="p-6 text-sm text-muted-foreground space-y-4">
                {formData.data_atualizacao && (
                  <p>
                    Última atualização:{' '}
                    <span className="font-medium text-foreground">
                      {new Date(formData.data_atualizacao).toLocaleString()}
                    </span>
                  </p>
                )}
                {formData.created && (
                  <p>
                    Criado em:{' '}
                    <span className="font-medium text-foreground">
                      {new Date(formData.created).toLocaleString()}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <GalleryModal
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        onSelect={(url) => setFormData({ ...formData, foto_url: url, foto_arquivo: '' })}
      />
      <CategoryModal
        open={catModalOpen}
        onOpenChange={setCatModalOpen}
        onSaved={(cat) => setSelectedCategoryId(cat.id)}
      />
      <LineModal
        open={lineModalOpen}
        onOpenChange={setLineModalOpen}
        onSaved={(line) => {
          setSelectedCategoryId(line.categoria_id)
          setFormData((f) => ({ ...f, linha_id: line.id }))
        }}
      />
      <NewDescBaseModal
        open={newDescBaseModalOpen}
        onOpenChange={setNewDescBaseModalOpen}
        onSaved={(id) => setFormData((f) => ({ ...f, descricao_base_id: id }))}
      />
    </div>
  )
}
