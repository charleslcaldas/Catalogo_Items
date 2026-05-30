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
import { X, Copy, ImageIcon, Languages, History as HistoryIcon, Activity } from 'lucide-react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { Badge } from '@/components/ui/badge'
import { GalleryModal } from './GalleryModal'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center text-sm py-1 border-b border-border/40 min-h-[36px]">
      <div
        className="w-[120px] shrink-0 font-medium text-muted-foreground truncate pr-2"
        title={label}
      >
        {label}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

export function ItemDetailPanel({ item, onClose }: { item?: Item; onClose: () => void }) {
  const { linhas, categorias, acabamentos, ncms, unidadesMedida, descricoesBase, saveItem } =
    useData()
  const [formData, setFormData] = useState<Partial<Item>>({})
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    if (item) {
      setFormData(item)
      pb.collection('potencial_itens')
        .getList(1, 20, { filter: `item_id="${item.id}"`, expand: 'potencial_id' })
        .then((res) => setTransactions(res.items))
        .catch(() => {})
    } else {
      setFormData({ ativo: true, sincronizado_com_zoho: false })
      setTransactions([])
    }
  }, [item])

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
        data_atualizacao: new Date().toISOString(),
      } as Item)
      toast.success('Item salvo')
      if (!item) onClose()
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message)
    }
  }

  const handleExtraBlur = async (field: 'informacao_extra' | 'descricao_extra') => {
    const text = formData[field]
    if (!text) return
    const enField = (field + '_en') as keyof Item
    if (formData[enField]) return
    toast.promise(
      pb
        .send('/backend/v1/translate', { method: 'POST', body: JSON.stringify({ text }) })
        .then((res) => res.text && setFormData((p) => ({ ...p, [enField]: res.text }))),
      { loading: 'Traduzindo...', success: 'Tradução concluída', error: 'Erro' },
    )
  }

  const selAcabamento = acabamentos.find((a) => a.id === formData.acabamento_id)
  const selCategoria = categorias.find(
    (c) => c.id === linhas.find((l) => l.id === formData.linha_id)?.categoria_id,
  )
  const descBasePt =
    descricoesBase.find((d) => d.id === formData.descricao_base_id)?.nome_pt ||
    formData.descricao_base_pt ||
    ''
  const titlePt =
    [
      descBasePt,
      formData.classe_material,
      formData.norma,
      formData.tipo_rosca,
      formData.comprimento_rosca,
      formData.informacao_extra,
      formData.tamanho,
    ]
      .filter(Boolean)
      .join(' ') + (selAcabamento ? ' / ' + selAcabamento.nome_pt : '') || 'Novo Item'
  const descBaseEn =
    descricoesBase.find((d) => d.id === formData.descricao_base_id)?.nome_en ||
    formData.descricao_base_en ||
    ''
  const titleEn =
    [
      descBaseEn,
      formData.classe_material,
      formData.norma,
      formData.tipo_rosca,
      formData.comprimento_rosca_en || formData.comprimento_rosca,
      formData.informacao_extra_en,
      formData.tamanho,
    ]
      .filter(Boolean)
      .join(' ') +
      (selAcabamento ? ' / ' + (selAcabamento.nome_en || selAcabamento.nome_pt) : '') || 'New Item'
  const imageUrl =
    formData.foto_arquivo && item?.id
      ? pb.files.getURL(item, formData.foto_arquivo)
      : formData.foto_url || 'https://img.usecurling.com/p/200/200?q=tools&color=gray'

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="flex items-center justify-between p-4 border-b bg-card z-10 shadow-sm">
        <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
          <div
            className="w-14 h-14 shrink-0 rounded-lg border bg-muted/30 cursor-pointer hover:opacity-80 relative group flex items-center justify-center overflow-hidden"
            onClick={() => setGalleryOpen(true)}
          >
            <img
              src={imageUrl}
              alt="Item"
              className="max-w-full max-h-full object-contain p-1 mix-blend-multiply"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ImageIcon className="text-white w-5 h-5" />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="font-bold text-lg text-foreground truncate">{titlePt}</h2>
            <h3 className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 truncate">
              <Languages className="w-3 h-3 shrink-0" /> {titleEn}
            </h3>
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

      <Tabs
        defaultValue="pt"
        className="flex-1 flex flex-col min-h-0 overflow-hidden bg-muted/10 p-4"
      >
        <TabsList className="grid w-full grid-cols-4 mb-4 shrink-0 bg-card border shadow-sm p-1 rounded-xl">
          <TabsTrigger value="pt" className="rounded-lg">
            Descrição PT
          </TabsTrigger>
          <TabsTrigger value="en" className="rounded-lg">
            Descrição EN
          </TabsTrigger>
          <TabsTrigger value="transactions" className="rounded-lg">
            Transactions
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg">
            History
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto pb-6">
          <TabsContent value="pt" className="m-0 space-y-4 animate-fade-in-up">
            <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col gap-1">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Field label="SKU">
                    <Input
                      className="h-8"
                      value={formData.sku || ''}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Categoria">
                    <div className="h-8 px-2 flex items-center border rounded-md bg-muted/50 text-sm text-muted-foreground">
                      {selCategoria?.nome_pt || '-'}
                    </div>
                  </Field>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Field label="Linha">
                    <Select
                      value={formData.linha_id || ''}
                      onValueChange={(v) => setFormData({ ...formData, linha_id: v })}
                    >
                      <SelectTrigger className="h-8">
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
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Field label="Descrição Base">
                    <Select
                      value={formData.descricao_base_id || ''}
                      onValueChange={(v) => setFormData({ ...formData, descricao_base_id: v })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {descricoesBase.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.nome_pt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Field label="Grau/Material">
                    <Input
                      className="h-8"
                      value={formData.classe_material || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, classe_material: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Norma">
                    <Input
                      className="h-8"
                      value={formData.norma || ''}
                      onChange={(e) => setFormData({ ...formData, norma: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Field label="Tipo Rosca">
                    <Input
                      className="h-8"
                      value={formData.tipo_rosca || ''}
                      onChange={(e) => setFormData({ ...formData, tipo_rosca: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Comp. Rosca">
                    <Input
                      className="h-8"
                      value={formData.comprimento_rosca || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, comprimento_rosca: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Field label="Tamanho">
                    <Input
                      className="h-8"
                      value={formData.tamanho || ''}
                      onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Acabamento">
                    <Select
                      value={formData.acabamento_id || ''}
                      onValueChange={(v) => setFormData({ ...formData, acabamento_id: v })}
                    >
                      <SelectTrigger className="h-8">
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
                  </Field>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Field label="Info Extra">
                    <Input
                      className="h-8"
                      value={formData.informacao_extra || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, informacao_extra: e.target.value })
                      }
                      onBlur={() => handleExtraBlur('informacao_extra')}
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="NCM">
                    <Select
                      value={formData.ncm_id || ''}
                      onValueChange={(v) => setFormData({ ...formData, ncm_id: v })}
                    >
                      <SelectTrigger className="h-8">
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
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Field label="Descrição Extra">
                    <Textarea
                      className="h-16 resize-none text-sm"
                      value={formData.descricao_extra || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, descricao_extra: e.target.value })
                      }
                      onBlur={() => handleExtraBlur('descricao_extra')}
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t flex flex-col gap-1">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Field label="Preço Venda">
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8"
                        value={formData.preco_venda || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, preco_venda: parseFloat(e.target.value) })
                        }
                      />
                    </Field>
                  </div>
                  <div className="flex-1">
                    <Field label="Preço Compra">
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8"
                        value={formData.preco_compra || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, preco_compra: parseFloat(e.target.value) })
                        }
                      />
                    </Field>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Field label="Unid. Medida">
                      <Select
                        value={formData.unidade_id || ''}
                        onValueChange={(v) => setFormData({ ...formData, unidade_id: v })}
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
                  <div className="flex-1">
                    <Field label="Validade Preço">
                      <Input
                        type="date"
                        className="h-8"
                        value={formData.validade_preco ? formData.validade_preco.split('T')[0] : ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            validade_preco: new Date(e.target.value).toISOString(),
                          })
                        }
                      />
                    </Field>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Field label="Status">
                      <div className="flex items-center gap-2 h-8">
                        <Switch
                          checked={formData.ativo}
                          onCheckedChange={(c) => setFormData({ ...formData, ativo: c })}
                        />
                        <span className="text-sm">{formData.ativo ? 'Ativo' : 'Inativo'}</span>
                      </div>
                    </Field>
                  </div>
                  <div className="flex-1">
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
            </div>
          </TabsContent>

          <TabsContent value="en" className="m-0 space-y-4 animate-fade-in-up">
            <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col gap-1">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Field label="SKU">
                    <div className="h-8 px-2 flex items-center text-sm font-medium">
                      {formData.sku || '-'}
                    </div>
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Category">
                    <div className="h-8 px-2 flex items-center border rounded-md bg-muted/50 text-sm text-muted-foreground">
                      {selCategoria?.nome_en || selCategoria?.nome_pt || '-'}
                    </div>
                  </Field>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Field label="Line">
                    <Select
                      value={formData.linha_id || ''}
                      onValueChange={(v) => setFormData({ ...formData, linha_id: v })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {linhas.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.nome_en || l.nome_pt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Field label="Base Description">
                    <Select
                      value={formData.descricao_base_id || ''}
                      onValueChange={(v) => setFormData({ ...formData, descricao_base_id: v })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {descricoesBase.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.nome_en || d.nome_pt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Field label="Grade/Material">
                    <Input
                      className="h-8"
                      value={formData.classe_material || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, classe_material: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Norm">
                    <Input
                      className="h-8"
                      value={formData.norma || ''}
                      onChange={(e) => setFormData({ ...formData, norma: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Field label="Thread Type">
                    <Input
                      className="h-8"
                      value={formData.tipo_rosca || ''}
                      onChange={(e) => setFormData({ ...formData, tipo_rosca: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Thread Length">
                    <Input
                      className="h-8"
                      value={formData.comprimento_rosca_en || formData.comprimento_rosca || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, comprimento_rosca_en: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Field label="Size">
                    <Input
                      className="h-8"
                      value={formData.tamanho || ''}
                      onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Finish">
                    <Select
                      value={formData.acabamento_id || ''}
                      onValueChange={(v) => setFormData({ ...formData, acabamento_id: v })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {acabamentos.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.nome_en || a.nome_pt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Field label="Extra Info">
                    <Input
                      className="h-8"
                      value={formData.informacao_extra_en || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, informacao_extra_en: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="NCM">
                    <div className="h-8 px-2 flex items-center text-sm">
                      {ncms.find((n) => n.id === formData.ncm_id)?.codigo || '-'}
                    </div>
                  </Field>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Field label="Extra Description">
                    <Textarea
                      className="h-16 resize-none text-sm"
                      value={formData.descricao_extra_en || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, descricao_extra_en: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t flex flex-col gap-1">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Field label="Sell Price">
                      <div className="h-8 flex items-center px-2 text-sm">
                        ${formData.preco_venda || '0.00'}
                      </div>
                    </Field>
                  </div>
                  <div className="flex-1">
                    <Field label="Buy Price">
                      <div className="h-8 flex items-center px-2 text-sm">
                        ${formData.preco_compra || '0.00'}
                      </div>
                    </Field>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Field label="Unit">
                      <div className="h-8 flex items-center px-2 text-sm">
                        {unidadesMedida.find((u) => u.id === formData.unidade_id)?.nome || '-'}
                      </div>
                    </Field>
                  </div>
                  <div className="flex-1">
                    <Field label="Price Validity">
                      <div className="h-8 flex items-center px-2 text-sm">
                        {formData.validade_preco
                          ? new Date(formData.validade_preco).toLocaleDateString()
                          : '-'}
                      </div>
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="m-0 animate-fade-in-up">
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
                    className="p-4 flex items-center justify-between hover:bg-muted/10"
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

          <TabsContent value="history" className="m-0 animate-fade-in-up">
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
                  <p>Última atualização: {new Date(formData.data_atualizacao).toLocaleString()}</p>
                )}
                {formData.created && (
                  <p>Criado em: {new Date(formData.created).toLocaleString()}</p>
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
    </div>
  )
}
