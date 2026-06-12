import { useEffect, useState, useRef } from 'react'
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
import { X, Copy, ImageIcon, History as HistoryIcon, Activity, Edit2 } from 'lucide-react'
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
import { useAtributosLinha } from '@/hooks/use-atributos-linha'

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
  const realTimeAtributos = useAtributosLinha()

  const [formData, setFormData] = useState<Partial<Item>>({})
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)

  const [catModalOpen, setCatModalOpen] = useState(false)
  const [lineModalOpen, setLineModalOpen] = useState(false)
  const [newDescBaseModalOpen, setNewDescBaseModalOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')

  const lastTranslatedInfoExtra = useRef<string | undefined>()
  const lastTranslatedDescExtra = useRef<string | undefined>()

  useEffect(() => {
    if (!isEditing) return

    const translate = async (
      text: string,
      targetField: keyof Item,
      ref: React.MutableRefObject<string | undefined>,
    ) => {
      if (!text) {
        setFormData((prev) => ({ ...prev, [targetField]: '' }))
        ref.current = text
        return
      }
      try {
        const textToTranslate = text
          .replace(/Rosca Total/gi, 'Full Thread')
          .replace(/Rosca Parcial/gi, 'Partial Thread')

        const res = await pb.send('/backend/v1/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: textToTranslate,
            source: 'pt',
            target: 'en',
          }),
        })
        if (res.text) {
          setFormData((prev) => ({ ...prev, [targetField]: res.text }))
          ref.current = text
        }
      } catch (err) {
        console.error('Translation failed', err)
      }
    }

    const timer = setTimeout(() => {
      if (
        formData.informacao_extra !== lastTranslatedInfoExtra.current &&
        formData.informacao_extra !== undefined
      ) {
        translate(formData.informacao_extra, 'informacao_extra_en', lastTranslatedInfoExtra)
      }
      if (
        formData.descricao_extra !== lastTranslatedDescExtra.current &&
        formData.descricao_extra !== undefined
      ) {
        translate(formData.descricao_extra, 'descricao_extra_en', lastTranslatedDescExtra)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [formData.informacao_extra, formData.descricao_extra, isEditing])

  useEffect(() => {
    if (item) {
      setFormData(item)
      lastTranslatedInfoExtra.current = item.informacao_extra
      lastTranslatedDescExtra.current = item.descricao_extra
      const linha = linhas.find((l) => l.id === item.linha_id)
      if (linha) setSelectedCategoryId(linha.categoria_id)
      setIsEditing(false)

      pb.collection('potencial_itens')
        .getList(1, 20, { filter: `item_id="${item.id}"`, expand: 'potencial_id' })
        .then((res) => setTransactions(res.items))
        .catch(() => {})
    } else {
      setFormData({ ativo: true, sincronizado_com_zoho: false })
      setSelectedCategoryId('')
      setTransactions([])
      setIsEditing(true)
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
      const descBaseEn =
        descricoesBase.find((d) => d.id === dataToSave.descricao_base_id)?.nome_en ||
        dataToSave.descricao_base_en ||
        ''
      const selAcabamento = acabamentos.find((a) => a.id === dataToSave.acabamento_id)

      const previewCurtaPt = [
        descBasePt,
        dataToSave.material,
        dataToSave.norma,
        dataToSave.tipo_rosca,
        dataToSave.comprimento_rosca,
        dataToSave.informacao_extra,
      ]
        .filter(Boolean)
        .join(' ')

      const previewCurtaEn = [
        descBaseEn,
        dataToSave.material,
        dataToSave.norma,
        dataToSave.tipo_rosca,
        dataToSave.comprimento_rosca_en,
        dataToSave.informacao_extra_en,
      ]
        .filter(Boolean)
        .join(' ')

      const descCurtaSavePt = dataToSave.descricao_curta || previewCurtaPt
      const autoDescCompletaPt = `${descCurtaSavePt}${dataToSave.tamanho ? ` - ${dataToSave.tamanho}` : ''}${selAcabamento?.nome_pt ? ` /${selAcabamento.nome_pt}` : ''}`

      const descCurtaSaveEn = dataToSave.descricao_curta_en || previewCurtaEn
      const autoDescCompletaEn = `${descCurtaSaveEn}${dataToSave.tamanho ? ` - ${dataToSave.tamanho}` : ''}${selAcabamento?.nome_en || selAcabamento?.nome_pt ? ` /${selAcabamento.nome_en || selAcabamento.nome_pt}` : ''}`

      await saveItem({
        ...dataToSave,
        descr_pt: autoDescCompletaPt || 'Sem descrição',
        descr_en: autoDescCompletaEn || '',
        descricao_catalogo_pt: autoDescCompletaPt || 'Sem descrição',
        descricao_catalogo_en: autoDescCompletaEn || '',
        data_atualizacao: new Date().toISOString(),
      } as Item)

      let finalItem = { ...dataToSave }
      try {
        const queryId = item?.id || dataToSave.id
        if (queryId) {
          const freshRecord = await pb
            .collection('itens')
            .getOne(queryId, { expand: 'acabamento_id' })
          finalItem = freshRecord as unknown as Partial<Item>
        }
      } catch (err) {
        console.error('Failed to fetch fresh record', err)
      }

      toast.success(
        translationsDone ? 'Item salvo e traduzido com sucesso!' : 'Item salvo com sucesso!',
        { id: toastId },
      )
      setFormData((prev) => ({ ...prev, ...finalItem }))
      setIsEditing(false)

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

  const autoDescCurtaPt = [
    descBasePt,
    formData.material,
    formData.norma,
    formData.tipo_rosca,
    formData.comprimento_rosca,
    formData.informacao_extra,
  ]
    .filter(Boolean)
    .join(' ')

  const autoDescCurtaEn = [
    descBaseEn,
    formData.material,
    formData.norma,
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

  const ncmObj = ncms.find((n) => n.id === formData.ncm_id)

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
    return {
      isVisible,
      labelPt: customName || defaultLabelPt,
      labelEn: customName || defaultLabelEn,
    }
  }

  const confTamanho = getFieldConfig('tamanho', 'Tamanho', 'Size')
  const confTipoRosca = getFieldConfig('tipo_rosca', 'Tipo Rosca', 'Thread Type')
  const confCompRosca = getFieldConfig('comprimento_rosca', 'Comp. Rosca', 'Thread Length')
  const confClasse = getFieldConfig('classe_material', 'Grau/Material', 'Grade/Material')
  const confNorma = getFieldConfig('norma', 'Norma', 'Standard')

  return (
    <div className="flex flex-col bg-background relative h-full rounded-xl">
      <div className="flex items-start justify-between p-3 border-b bg-card z-10 shrink-0 sticky top-0 rounded-t-xl">
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
          <div
            className="w-10 h-10 shrink-0 rounded-md border bg-muted/30 cursor-pointer hover:opacity-80 relative group flex items-center justify-center overflow-hidden shadow-sm"
            onClick={() => isEditing && setGalleryOpen(true)}
          >
            <img
              src={imageUrl}
              alt="Item"
              className="max-w-full max-h-full object-contain p-0.5 mix-blend-multiply"
            />
            {isEditing && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ImageIcon className="text-white w-4 h-4" />
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <h2 className="font-bold text-sm text-foreground break-words whitespace-normal leading-tight">
              {autoDescCompletaPt || 'Nova Descrição Completa'}
            </h2>
            <h3 className="text-[10px] text-muted-foreground break-words whitespace-normal leading-snug mt-0.5">
              {descCurtaToUseEn || 'New Short Description'}
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
              {formData.sincronizado_com_zoho ? (
                <Badge
                  variant="outline"
                  className="border-blue-200 bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0 shadow-none"
                  title="Sincronizado com Zoho Books"
                >
                  Zoho Sync
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-orange-200 bg-orange-50 text-orange-700 text-[10px] px-1.5 py-0 shadow-none"
                  title="Pendente sincronização"
                >
                  Zoho Pendente
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
              disabled={isEditing}
              onClick={() => {
                const c = { ...formData }
                delete c.id
                c.sku += '-COPY'
                setFormData(c)
                setIsEditing(true)
                toast.success('Duplicado na tela')
              }}
            >
              <Copy className="h-3 w-3 mr-1.5" /> Duplicar
            </Button>
          )}
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              size="sm"
              className="rounded-full h-8 px-4 text-xs"
            >
              <Edit2 className="h-3 w-3 mr-1.5" /> Editar
            </Button>
          ) : (
            <>
              {item && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFormData(item)
                    setIsEditing(false)
                  }}
                  size="sm"
                  className="rounded-full h-8 px-4 text-xs"
                >
                  Cancelar
                </Button>
              )}
              <Button onClick={handleSave} size="sm" className="rounded-full h-8 px-4 text-xs">
                Salvar
              </Button>
            </>
          )}
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

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <Field label="Descrição Base (Auto/Manual)" className="md:col-span-9">
                  <div className="flex gap-2">
                    <div className={cn('flex-1', !isEditing && 'pointer-events-none opacity-80')}>
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
                    </div>
                    <Input
                      className="h-8 text-xs w-[140px] shrink-0"
                      placeholder="Sobrescrever..."
                      disabled={!isEditing}
                      value={formData.descricao_base_pt || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, descricao_base_pt: e.target.value })
                      }
                    />
                  </div>
                </Field>
                {confTamanho.isVisible && (
                  <Field label={confTamanho.labelPt} className="md:col-span-3">
                    <Input
                      className="h-8 text-xs"
                      disabled={!isEditing}
                      value={formData.tamanho || ''}
                      onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                    />
                  </Field>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <Field label="Acabamento" className="md:col-span-3">
                  <div className={cn(!isEditing && 'pointer-events-none opacity-80')}>
                    <SearchableSelect
                      options={acabamentoOptions}
                      value={formData.acabamento_id}
                      onChange={(v) => setFormData((f) => ({ ...f, acabamento_id: v }))}
                    />
                  </div>
                </Field>
                <Field label="SKU" className="md:col-span-3">
                  <Input
                    className="h-8 text-xs"
                    disabled={!isEditing}
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </Field>
                {confClasse.isVisible && (
                  <Field label={confClasse.labelPt} className="md:col-span-3">
                    <Input
                      className="h-8 text-xs"
                      disabled={!isEditing}
                      value={formData.classe_material || formData.material || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          classe_material: e.target.value,
                          material: e.target.value,
                        })
                      }
                    />
                  </Field>
                )}
                {confNorma.isVisible && (
                  <Field label={confNorma.labelPt} className="md:col-span-3">
                    <Input
                      className="h-8 text-xs"
                      disabled={!isEditing}
                      value={formData.norma || ''}
                      onChange={(e) => setFormData({ ...formData, norma: e.target.value })}
                    />
                  </Field>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {confTipoRosca.isVisible && (
                  <Field label={confTipoRosca.labelPt} className="md:col-span-2">
                    <Input
                      className="h-8 text-xs"
                      disabled={!isEditing}
                      value={formData.tipo_rosca || ''}
                      onChange={(e) => setFormData({ ...formData, tipo_rosca: e.target.value })}
                    />
                  </Field>
                )}
                {confCompRosca.isVisible && (
                  <Field label={confCompRosca.labelPt} className="md:col-span-2">
                    <Input
                      className="h-8 text-xs"
                      disabled={!isEditing}
                      value={formData.comprimento_rosca || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, comprimento_rosca: e.target.value })
                      }
                    />
                  </Field>
                )}
                <Field label="Categoria" className="md:col-span-3">
                  <div className={cn(!isEditing && 'pointer-events-none opacity-80')}>
                    <SearchableSelect
                      options={categoryOptions}
                      value={selectedCategoryId}
                      onChange={(v) => {
                        setSelectedCategoryId(v)
                        setFormData((f) => ({ ...f, linha_id: '' }))
                      }}
                      onAddNew={() => setCatModalOpen(true)}
                    />
                  </div>
                </Field>
                <Field label="Linha" className="md:col-span-3">
                  <div className={cn(!isEditing && 'pointer-events-none opacity-80')}>
                    <SearchableSelect
                      options={lineOptions}
                      value={formData.linha_id}
                      onChange={(v) => setFormData((f) => ({ ...f, linha_id: v }))}
                      onAddNew={() => setLineModalOpen(true)}
                    />
                  </div>
                </Field>
                <Field label="Status" className="md:col-span-2">
                  <div className="flex items-center gap-2 h-8">
                    <Switch
                      checked={formData.ativo ?? true}
                      disabled={!isEditing}
                      onCheckedChange={(c) => setFormData({ ...formData, ativo: c })}
                    />
                    <span className="text-xs font-medium">
                      {formData.ativo !== false ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <Field label="Unid. Medida" className="md:col-span-3">
                  <Select
                    value={formData.unidade_id || ''}
                    disabled={!isEditing}
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
                <Field label="NCM (Seletor)" className="md:col-span-9">
                  <div className={cn(!isEditing && 'pointer-events-none opacity-80')}>
                    <SearchableSelect
                      options={ncmOptions}
                      value={formData.ncm_id}
                      onChange={(v) => setFormData((f) => ({ ...f, ncm_id: v }))}
                    />
                  </div>
                </Field>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col gap-3">
              <h4 className="font-semibold text-xs border-b pb-1 mb-1">Preço e Texto</h4>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <Field label="Preço Compra" className="md:col-span-3">
                  <PriceInput
                    disabled={!isEditing}
                    value={formData.preco_compra}
                    onChange={(val) => setFormData({ ...formData, preco_compra: val })}
                  />
                </Field>
                <Field label="Preço Venda" className="md:col-span-3">
                  <PriceInput
                    disabled={!isEditing}
                    value={formData.preco_venda}
                    onChange={(val) => setFormData({ ...formData, preco_venda: val })}
                  />
                </Field>
                <Field label="Descrição Curta (PT) (Auto)" className="md:col-span-6">
                  <Input
                    className="h-8 text-xs bg-muted/50 font-medium text-muted-foreground"
                    disabled
                    placeholder="Gerado automaticamente..."
                    value={formData.descricao_curta || ''}
                    title="Esta descrição é gerada automaticamente ao salvar."
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <Field label="Informação Extra (PT)" className="md:col-span-6">
                  <Textarea
                    className="min-h-[50px] resize-y text-xs"
                    disabled={!isEditing}
                    value={formData.informacao_extra || ''}
                    onChange={(e) => setFormData({ ...formData, informacao_extra: e.target.value })}
                  />
                </Field>
                <Field label="Descrição Extra (PT)" className="md:col-span-6">
                  <Textarea
                    className="min-h-[50px] resize-y text-xs"
                    disabled={!isEditing}
                    value={formData.descricao_extra || ''}
                    onChange={(e) => setFormData({ ...formData, descricao_extra: e.target.value })}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 opacity-80 pointer-events-none select-none">
                <Field label="NCM" className="md:col-span-2">
                  <Input className="h-8 text-xs bg-muted" disabled value={ncmObj?.codigo || ''} />
                </Field>
                <Field label="II" className="md:col-span-2">
                  <Input className="h-8 text-xs bg-muted" disabled value={ncmObj?.ii ?? ''} />
                </Field>
                <Field label="IPI" className="md:col-span-2">
                  <Input className="h-8 text-xs bg-muted" disabled value={ncmObj?.ipi ?? ''} />
                </Field>
                <Field label="PIS" className="md:col-span-2">
                  <Input className="h-8 text-xs bg-muted" disabled value={ncmObj?.pis ?? ''} />
                </Field>
                <Field label="COFINS" className="md:col-span-2">
                  <Input className="h-8 text-xs bg-muted" disabled value={ncmObj?.cofins ?? ''} />
                </Field>
                <Field label="Observações" className="md:col-span-2">
                  <Input
                    className="h-8 text-xs bg-muted"
                    disabled
                    value={ncmObj?.observacoes || ''}
                    title={ncmObj?.observacoes || ''}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <Field label="Descrição Completa (PT) (Auto)" className="md:col-span-12">
                  <Textarea
                    className="min-h-[50px] resize-none text-xs bg-muted/50 font-medium text-muted-foreground"
                    disabled
                    value={autoDescCompletaPt}
                    title="Esta descrição é gerada automaticamente baseada nos atributos selecionados."
                  />
                </Field>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="en" className="m-0 space-y-4 animate-fade-in-up">
            <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col gap-3">
              <h4 className="font-semibold text-xs border-b pb-1 mb-1">Geral & Atributos (EN)</h4>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <Field label="Base Description (EN)" className="md:col-span-9">
                  <div className="flex gap-2">
                    <div className={cn('flex-1', !isEditing && 'pointer-events-none opacity-80')}>
                      <SearchableSelect
                        options={descBaseOptions.map((o) => {
                          const desc = descricoesBase.find((d) => d.id === o.value)
                          return { ...o, label: desc?.nome_en || desc?.nome_pt || '' }
                        })}
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
                    </div>
                    <Input
                      className="h-8 text-xs w-[140px] shrink-0"
                      placeholder="Override text..."
                      disabled={!isEditing}
                      value={formData.descricao_base_en || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, descricao_base_en: e.target.value })
                      }
                    />
                  </div>
                </Field>
                {confTamanho.isVisible && (
                  <Field label={confTamanho.labelEn} className="md:col-span-3">
                    <Input
                      className="h-8 text-xs"
                      disabled={!isEditing}
                      value={formData.tamanho || ''}
                      onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                    />
                  </Field>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <Field label="Finish (EN)" className="md:col-span-3">
                  <div className={cn(!isEditing && 'pointer-events-none opacity-80')}>
                    <SearchableSelect
                      options={acabamentoOptions.map((o) => {
                        const ac = acabamentos.find((a) => a.id === o.value)
                        return { ...o, label: ac?.nome_en || ac?.nome_pt || '' }
                      })}
                      value={formData.acabamento_id}
                      onChange={(v) => setFormData((f) => ({ ...f, acabamento_id: v }))}
                    />
                  </div>
                </Field>
                <Field label="SKU" className="md:col-span-3">
                  <Input
                    className="h-8 text-xs"
                    disabled={!isEditing}
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </Field>
                {confClasse.isVisible && (
                  <Field label={confClasse.labelEn} className="md:col-span-3">
                    <Input
                      className="h-8 text-xs"
                      disabled={!isEditing}
                      value={formData.classe_material || formData.material || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          classe_material: e.target.value,
                          material: e.target.value,
                        })
                      }
                    />
                  </Field>
                )}
                {confNorma.isVisible && (
                  <Field label={confNorma.labelEn} className="md:col-span-3">
                    <Input
                      className="h-8 text-xs"
                      disabled={!isEditing}
                      value={formData.norma || ''}
                      onChange={(e) => setFormData({ ...formData, norma: e.target.value })}
                    />
                  </Field>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {confTipoRosca.isVisible && (
                  <Field label={confTipoRosca.labelEn} className="md:col-span-2">
                    <Input
                      className="h-8 text-xs"
                      disabled={!isEditing}
                      value={formData.tipo_rosca || ''}
                      onChange={(e) => setFormData({ ...formData, tipo_rosca: e.target.value })}
                    />
                  </Field>
                )}
                {confCompRosca.isVisible && (
                  <Field label={confCompRosca.labelEn} className="md:col-span-2">
                    <Input
                      className="h-8 text-xs"
                      disabled={!isEditing}
                      value={formData.comprimento_rosca_en || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, comprimento_rosca_en: e.target.value })
                      }
                    />
                  </Field>
                )}
                <Field label="Category (EN)" className="md:col-span-3">
                  <div className={cn(!isEditing && 'pointer-events-none opacity-80')}>
                    <SearchableSelect
                      options={categoryOptions.map((o) => {
                        const cat = categorias.find((c) => c.id === o.value)
                        return { ...o, label: cat?.nome_en || cat?.nome_pt || '' }
                      })}
                      value={selectedCategoryId}
                      onChange={(v) => {
                        setSelectedCategoryId(v)
                        setFormData((f) => ({ ...f, linha_id: '' }))
                      }}
                      onAddNew={() => setCatModalOpen(true)}
                    />
                  </div>
                </Field>
                <Field label="Line (EN)" className="md:col-span-3">
                  <div className={cn(!isEditing && 'pointer-events-none opacity-80')}>
                    <SearchableSelect
                      options={lineOptions.map((o) => {
                        const l = linhas.find((line) => line.id === o.value)
                        return { ...o, label: l?.nome_en || l?.nome_pt || '' }
                      })}
                      value={formData.linha_id}
                      onChange={(v) => setFormData((f) => ({ ...f, linha_id: v }))}
                      onAddNew={() => setLineModalOpen(true)}
                    />
                  </div>
                </Field>
                <Field label="Status" className="md:col-span-2">
                  <div className="flex items-center gap-2 h-8">
                    <Switch
                      checked={formData.ativo ?? true}
                      disabled={!isEditing}
                      onCheckedChange={(c) => setFormData({ ...formData, ativo: c })}
                    />
                    <span className="text-xs font-medium">
                      {formData.ativo !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <Field label="Unit of Measure" className="md:col-span-3">
                  <Select
                    value={formData.unidade_id || ''}
                    disabled={!isEditing}
                    onValueChange={(v) => setFormData((f) => ({ ...f, unidade_id: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select..." />
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
                <Field label="NCM (Selector)" className="md:col-span-9">
                  <div className={cn(!isEditing && 'pointer-events-none opacity-80')}>
                    <SearchableSelect
                      options={ncmOptions}
                      value={formData.ncm_id}
                      onChange={(v) => setFormData((f) => ({ ...f, ncm_id: v }))}
                    />
                  </div>
                </Field>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col gap-3">
              <h4 className="font-semibold text-xs border-b pb-1 mb-1">Preço e Texto (EN)</h4>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <Field label="Purchase Price" className="md:col-span-3">
                  <PriceInput
                    disabled={!isEditing}
                    value={formData.preco_compra}
                    onChange={(val) => setFormData({ ...formData, preco_compra: val })}
                  />
                </Field>
                <Field label="Sale Price" className="md:col-span-3">
                  <PriceInput
                    disabled={!isEditing}
                    value={formData.preco_venda}
                    onChange={(val) => setFormData({ ...formData, preco_venda: val })}
                  />
                </Field>
                <Field label="Short Description (EN) (Auto)" className="md:col-span-6">
                  <Input
                    className="h-8 text-xs bg-muted/50 font-medium text-muted-foreground"
                    disabled
                    placeholder="Auto-generated..."
                    value={formData.descricao_curta_en || ''}
                    title="This description is auto-generated and translated on save."
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <Field label="Extra Information (EN)" className="md:col-span-6">
                  <Textarea
                    className="min-h-[50px] resize-y text-xs"
                    disabled={!isEditing}
                    value={formData.informacao_extra_en || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, informacao_extra_en: e.target.value })
                    }
                  />
                </Field>
                <Field label="Extra Description (EN)" className="md:col-span-6">
                  <Textarea
                    className="min-h-[50px] resize-y text-xs"
                    disabled={!isEditing}
                    value={formData.descricao_extra_en || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao_extra_en: e.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 opacity-80 pointer-events-none select-none">
                <Field label="NCM" className="md:col-span-2">
                  <Input className="h-8 text-xs bg-muted" disabled value={ncmObj?.codigo || ''} />
                </Field>
                <Field label="II" className="md:col-span-2">
                  <Input className="h-8 text-xs bg-muted" disabled value={ncmObj?.ii ?? ''} />
                </Field>
                <Field label="IPI" className="md:col-span-2">
                  <Input className="h-8 text-xs bg-muted" disabled value={ncmObj?.ipi ?? ''} />
                </Field>
                <Field label="PIS" className="md:col-span-2">
                  <Input className="h-8 text-xs bg-muted" disabled value={ncmObj?.pis ?? ''} />
                </Field>
                <Field label="COFINS" className="md:col-span-2">
                  <Input className="h-8 text-xs bg-muted" disabled value={ncmObj?.cofins ?? ''} />
                </Field>
                <Field label="Observations" className="md:col-span-2">
                  <Input
                    className="h-8 text-xs bg-muted"
                    disabled
                    value={ncmObj?.observacoes || ''}
                    title={ncmObj?.observacoes || ''}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <Field label="Full Description (EN) (Auto)" className="md:col-span-12">
                  <Textarea
                    className="min-h-[50px] resize-none text-xs bg-muted/50 font-medium text-muted-foreground"
                    disabled
                    value={autoDescCompletaEn}
                    title="This description is auto-generated based on selected attributes."
                  />
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
