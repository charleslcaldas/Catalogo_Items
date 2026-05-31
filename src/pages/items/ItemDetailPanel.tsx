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
    <div className={cn('flex flex-col gap-1', className)}>
      <Label
        className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate"
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

  const handleSave = async () => {
    if (!formData.sku || !formData.linha_id)
      return toast.error('Preencha os campos obrigatórios (SKU, Linha)')

    const toastId = toast.loading('Salvando item...')

    try {
      const dataToSave = { ...formData }
      let translationsDone = false

      const translateText = async (text: string, fieldLabel: string) => {
        const textToTranslate = text
          .replace(/Rosca Total/gi, 'Full Thread')
          .replace(/Rosca Parcial/gi, 'Partial Thread')

        try {
          const res = await pb.send('/backend/v1/translate', {
            method: 'POST',
            body: JSON.stringify({
              text: textToTranslate,
              source: 'pt',
              target: 'en',
            }),
          })
          if (res.text && res.text.toLowerCase() !== text.toLowerCase()) {
            return res.text
          }
          throw new Error('Identical or empty translation')
        } catch (err) {
          toast.warning(
            `Aviso: Falha ao traduzir "${fieldLabel}". O campo em inglês não foi atualizado.`,
            { duration: 5000 },
          )
          return null
        }
      }

      const fieldsToTranslate = [
        { pt: 'comprimento_rosca', en: 'comprimento_rosca_en', label: 'Comp. Rosca' },
        { pt: 'informacao_extra', en: 'informacao_extra_en', label: 'Info Extra' },
        { pt: 'descricao_extra', en: 'descricao_extra_en', label: 'Desc. Extra' },
      ] as const

      for (const field of fieldsToTranslate) {
        const ptVal = formData[field.pt] as string
        const ptOrig = item?.[field.pt] as string

        if (ptVal && ptVal !== ptOrig) {
          toast.loading(`Traduzindo ${field.label}...`, { id: toastId })
          const translated = await translateText(ptVal, field.label)
          if (translated) {
            dataToSave[field.en as any] = translated as any
            translationsDone = true
          }
        }

        const finalEn = dataToSave[field.en] as string
        const finalPt = dataToSave[field.pt] as string
        if (finalEn && finalPt && finalEn.trim().toLowerCase() === finalPt.trim().toLowerCase()) {
          dataToSave[field.en as any] = '' as any
          toast.warning(`Aviso: O campo "${field.label} (EN)" era idêntico ao PT e foi limpo.`, {
            duration: 5000,
          })
        }
      }

      const descBasePt =
        descricoesBase.find((d) => d.id === dataToSave.descricao_base_id)?.nome_pt ||
        dataToSave.descricao_base_pt ||
        ''
      const descricao_curta = [
        descBasePt,
        dataToSave.classe_material,
        dataToSave.norma,
        dataToSave.tipo_rosca,
        dataToSave.comprimento_rosca,
        dataToSave.informacao_extra,
      ]
        .filter(Boolean)
        .join(' ')

      const descBaseEn =
        descricoesBase.find((d) => d.id === dataToSave.descricao_base_id)?.nome_en ||
        dataToSave.descricao_base_en ||
        ''
      const descricao_curta_en = [
        descBaseEn,
        dataToSave.classe_material,
        dataToSave.norma,
        dataToSave.tipo_rosca,
        dataToSave.comprimento_rosca_en,
        dataToSave.informacao_extra_en,
      ]
        .filter(Boolean)
        .join(' ')

      await saveItem({
        ...dataToSave,
        descricao_curta: dataToSave.descricao_curta || descricao_curta,
        descricao_curta_en: dataToSave.descricao_curta_en || descricao_curta_en,
        descr_pt: dataToSave.descr_pt || descricao_curta || 'Sem descrição',
        descr_en: dataToSave.descr_en || descricao_curta_en || '',
        data_atualizacao: new Date().toISOString(),
      } as Item)

      toast.success(
        translationsDone ? 'Item salvo e traduzido com sucesso!' : 'Item salvo com sucesso!',
        { id: toastId },
      )
      setFormData((prev) => ({ ...prev, ...dataToSave }))

      if (!item) onClose()
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message, { id: toastId })
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
    formData.comprimento_rosca_en,
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

  return (
    <div className="flex flex-col bg-background relative h-full rounded-xl">
      <div className="flex items-start justify-between p-3 border-b bg-card z-10 shrink-0 sticky top-0 rounded-t-xl">
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
          <div
            className="w-10 h-10 shrink-0 rounded-md border bg-muted/30 cursor-pointer hover:opacity-80 relative group flex items-center justify-center overflow-hidden shadow-sm"
            onClick={() => setGalleryOpen(true)}
          >
            <img
              src={imageUrl}
              alt="Item"
              className="max-w-full max-h-full object-contain p-0.5 mix-blend-multiply"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ImageIcon className="text-white w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <h2 className="font-bold text-sm text-foreground break-words whitespace-normal leading-tight">
              {fullDescPt || 'Nova Descrição Completa'}
            </h2>
            <h3 className="text-[10px] text-muted-foreground break-words whitespace-normal leading-snug mt-0.5">
              {fullDescEn || 'New Full Description'}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 bg-muted/30">
                {formData.sku || 'SKU Pendente'}
              </Badge>
              {formData.ativo ? (
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 shadow-none text-[10px] px-1.5 py-0">
                  Ativo
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Inativo
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item && formData.id && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full h-8 text-xs"
              onClick={() => {
                const c = { ...formData }
                delete c.id
                c.sku += '-COPY'
                setFormData(c)
                toast.success('Duplicado na tela')
              }}
            >
              <Copy className="h-3 w-3 mr-1.5" /> Duplicar
            </Button>
          )}
          <Button onClick={handleSave} size="sm" className="rounded-full h-8 px-4 text-xs">
            Salvar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="bg-muted/50 hover:bg-muted ml-1 rounded-full h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pt" className="flex flex-col flex-1 bg-muted/10">
        <div className="px-4 pt-3 shrink-0 z-10 flex flex-col gap-3">
          <TabsList className="flex w-full bg-muted border-border p-1 h-auto rounded-full justify-start overflow-x-auto gap-1">
            <TabsTrigger
              value="pt"
              className="rounded-full px-4 py-1 text-xs transition-all font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              Português
            </TabsTrigger>
            <TabsTrigger
              value="en"
              className="rounded-full px-4 py-1 text-xs transition-all font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              Inglês
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="rounded-full px-4 py-1 text-xs transition-all font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              Transações
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-full px-4 py-1 text-xs transition-all font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              Histórico
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-4 flex-1">
          <TabsContent value="pt" className="m-0 space-y-4 animate-fade-in-up">
            <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col gap-3">
              <h4 className="font-semibold text-xs border-b pb-1 mb-1">Geral & Atributos</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="SKU">
                  <Input
                    className="h-8 text-xs"
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
                <Field label="Status">
                  <div className="flex items-center gap-2 h-8">
                    <Switch
                      checked={formData.ativo}
                      onCheckedChange={(c) => setFormData({ ...formData, ativo: c })}
                    />
                    <span className="text-xs font-medium">
                      {formData.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </Field>
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
                <Field label="NCM">
                  <SearchableSelect
                    options={ncmOptions}
                    value={formData.ncm_id}
                    onChange={(v) => setFormData((f) => ({ ...f, ncm_id: v }))}
                  />
                </Field>
                <Field label="Acabamento">
                  <SearchableSelect
                    options={acabamentoOptions}
                    value={formData.acabamento_id}
                    onChange={(v) => setFormData((f) => ({ ...f, acabamento_id: v }))}
                  />
                </Field>
                <Field label="Tamanho">
                  <Input
                    className="h-8 text-xs"
                    value={formData.tamanho || ''}
                    onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                  />
                </Field>
                <Field label="Grau/Material">
                  <Input
                    className="h-8 text-xs"
                    value={formData.classe_material || ''}
                    onChange={(e) => setFormData({ ...formData, classe_material: e.target.value })}
                  />
                </Field>
                <Field label="Norma">
                  <Input
                    className="h-8 text-xs"
                    value={formData.norma || ''}
                    onChange={(e) => setFormData({ ...formData, norma: e.target.value })}
                  />
                </Field>
                <Field label="Tipo Rosca">
                  <Input
                    className="h-8 text-xs"
                    value={formData.tipo_rosca || ''}
                    onChange={(e) => setFormData({ ...formData, tipo_rosca: e.target.value })}
                  />
                </Field>
                <Field label="Comp. Rosca">
                  <Input
                    className="h-8 text-xs"
                    value={formData.comprimento_rosca || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, comprimento_rosca: e.target.value })
                    }
                  />
                </Field>
                <Field label="Unid. Medida">
                  <Select
                    value={formData.unidade_id || ''}
                    onValueChange={(v) => setFormData((f) => ({ ...f, unidade_id: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unidadesMedida.map((u) => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          {u.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col gap-3">
              <h4 className="font-semibold text-xs border-b pb-1 mb-1">Textos e Descrições (PT)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Descrição Base (Auto/Manual)">
                  <div className="flex gap-2">
                    <SearchableSelect
                      options={descBaseOptions}
                      value={formData.descricao_base_id}
                      onChange={(v) => {
                        const desc = descricoesBase.find((d) => d.id === v)
                        if (desc) {
                          setFormData((f) => ({
                            ...f,
                            descricao_base_id: v,
                            descricao_base_pt: desc.nome_pt,
                            descricao_base_en: desc.nome_en,
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
                    />
                    <Input
                      className="h-8 text-xs flex-1"
                      placeholder="Sobrescrever texto..."
                      value={formData.descricao_base_pt || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, descricao_base_pt: e.target.value })
                      }
                    />
                  </div>
                </Field>
                <Field label="Descrição Curta (PT)">
                  <Input
                    className="h-8 text-xs"
                    value={formData.descricao_curta || ''}
                    onChange={(e) => setFormData({ ...formData, descricao_curta: e.target.value })}
                  />
                </Field>
                <Field label="Descrição Completa (PT)">
                  <Textarea
                    className="min-h-[50px] resize-y text-xs"
                    value={formData.descr_pt || ''}
                    onChange={(e) => setFormData({ ...formData, descr_pt: e.target.value })}
                  />
                </Field>
                <Field label="Catálogo PT">
                  <Textarea
                    className="min-h-[50px] resize-y text-xs"
                    value={formData.descricao_catalogo_pt || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao_catalogo_pt: e.target.value })
                    }
                  />
                </Field>
                <Field label="Informação Extra (PT)">
                  <Textarea
                    className="min-h-[50px] resize-y text-xs"
                    value={formData.informacao_extra || ''}
                    onChange={(e) => setFormData({ ...formData, informacao_extra: e.target.value })}
                  />
                </Field>
                <Field label="Descrição Extra (PT)">
                  <Textarea
                    className="min-h-[50px] resize-none text-xs"
                    value={formData.descricao_extra || ''}
                    onChange={(e) => setFormData({ ...formData, descricao_extra: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="en" className="m-0 space-y-4 animate-fade-in-up">
            <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col gap-3">
              <h4 className="font-semibold text-xs border-b pb-1 mb-1">Textos e Descrições (EN)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Descrição Base (EN)">
                  <Input
                    className="h-8 text-xs"
                    value={formData.descricao_base_en || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao_base_en: e.target.value })
                    }
                  />
                </Field>
                <Field label="Descrição Curta (EN)">
                  <Input
                    className="h-8 text-xs"
                    value={formData.descricao_curta_en || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao_curta_en: e.target.value })
                    }
                  />
                </Field>
                <Field label="Descrição Completa (EN)">
                  <Textarea
                    className="min-h-[50px] resize-y text-xs"
                    value={formData.descr_en || ''}
                    onChange={(e) => setFormData({ ...formData, descr_en: e.target.value })}
                  />
                </Field>
                <Field label="Catálogo EN">
                  <Textarea
                    className="min-h-[50px] resize-y text-xs"
                    value={formData.descricao_catalogo_en || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao_catalogo_en: e.target.value })
                    }
                  />
                </Field>
                <Field label="Informação Extra (EN)">
                  <Textarea
                    className="min-h-[50px] resize-y text-xs"
                    value={formData.informacao_extra_en || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, informacao_extra_en: e.target.value })
                    }
                  />
                </Field>
                <Field label="Descrição Extra (EN)">
                  <Textarea
                    className="min-h-[50px] resize-none text-xs"
                    value={formData.descricao_extra_en || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao_extra_en: e.target.value })
                    }
                  />
                </Field>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col gap-3">
              <h4 className="font-semibold text-xs border-b pb-1 mb-1">Technical Attributes</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Thread Length (EN)">
                  <Input
                    className="h-8 text-xs"
                    value={formData.comprimento_rosca_en || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, comprimento_rosca_en: e.target.value })
                    }
                  />
                </Field>
                <Field label="Category (EN)">
                  <div className="h-8 px-3 flex items-center bg-muted/30 rounded-md border text-xs text-muted-foreground truncate">
                    {categorias.find((c) => c.id === selectedCategoryId)?.nome_en ||
                      categorias.find((c) => c.id === selectedCategoryId)?.nome_pt ||
                      '-'}
                  </div>
                </Field>
                <Field label="Line (EN)">
                  <div className="h-8 px-3 flex items-center bg-muted/30 rounded-md border text-xs text-muted-foreground truncate">
                    {linhas.find((l) => l.id === formData.linha_id)?.nome_en ||
                      linhas.find((l) => l.id === formData.linha_id)?.nome_pt ||
                      '-'}
                  </div>
                </Field>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="m-0 animate-fade-in-up">
            <div className="bg-card border rounded-lg shadow-sm divide-y">
              <div className="p-3 bg-muted/30 flex items-center gap-3">
                <Activity className="w-4 h-4 text-primary" />
                <div>
                  <h3 className="font-semibold text-xs">Transações</h3>
                  <p className="text-[10px] text-muted-foreground">Onde este item foi cotado</p>
                </div>
              </div>
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  Nenhuma transação encontrada.
                </div>
              ) : (
                transactions.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 flex items-center justify-between hover:bg-muted/10 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-medium">
                        Potencial {t.expand?.potencial_id?.numero_potencial}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {t.expand?.potencial_id?.cliente}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-[10px]">
                        {t.quantidade} un
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(t.created).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="m-0 animate-fade-in-up">
            <div className="bg-card border rounded-lg shadow-sm">
              <div className="p-3 bg-muted/30 flex items-center gap-3 border-b">
                <HistoryIcon className="w-4 h-4 text-primary" />
                <div>
                  <h3 className="font-semibold text-xs">Histórico</h3>
                  <p className="text-[10px] text-muted-foreground">Últimas atualizações</p>
                </div>
              </div>
              <div className="p-4 text-xs text-muted-foreground space-y-3">
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
