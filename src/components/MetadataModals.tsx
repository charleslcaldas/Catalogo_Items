import { useState, useEffect } from 'react'
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
import { useData } from '@/contexts/data-context'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { Plus } from 'lucide-react'

export function CategoryModal({
  open,
  onOpenChange,
  onSaved,
  initialData,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSaved?: (cat: any) => void
  initialData?: any
}) {
  const [data, setData] = useState({ nome_pt: '', nome_en: '', color: '#000000' })
  const [saving, setSaving] = useState(false)
  const { reloadMetadata } = useData()

  useEffect(() => {
    if (open) {
      if (initialData) {
        setData({
          nome_pt: initialData.nome_pt || '',
          nome_en: initialData.nome_en || '',
          color: initialData.color || '#000000',
        })
      } else {
        setData({ nome_pt: '', nome_en: '', color: '#000000' })
      }
    }
  }, [open, initialData])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.nome_pt || !data.nome_en) return toast.error('Preencha todos os campos obrigatórios')
    setSaving(true)
    try {
      if (!initialData?.id) {
        const existing = await pb
          .collection('categorias')
          .getList(1, 1, { filter: `nome_pt = "${data.nome_pt}"` })
        if (existing.items.length > 0) {
          setSaving(false)
          return toast.error('Já existe uma categoria com este nome.')
        }
      }

      let saved
      if (initialData?.id) {
        saved = await pb.collection('categorias').update(initialData.id, data)
        toast.success('Categoria atualizada com sucesso')
      } else {
        saved = await pb.collection('categorias').create(data)
        toast.success('Novo registro criado com sucesso')
      }
      await reloadMetadata()
      onSaved?.(saved)
      onOpenChange(false)
    } catch (e) {
      toast.error('Erro ao salvar categoria')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Categoria' : 'Criar Nova Categoria'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>
              Nome (PT) <span className="text-destructive">*</span>
            </Label>
            <Input
              required
              value={data.nome_pt}
              onChange={(e) => setData({ ...data, nome_pt: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>
              Nome (EN) <span className="text-destructive">*</span>
            </Label>
            <Input
              required
              value={data.nome_en}
              onChange={(e) => setData({ ...data, nome_en: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Cor (Opcional)</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="color"
                value={data.color}
                onChange={(e) => setData({ ...data, color: e.target.value })}
                className="h-10 w-16 p-1 cursor-pointer"
              />
              <Input
                value={data.color}
                onChange={(e) => setData({ ...data, color: e.target.value })}
                className="uppercase font-mono"
                placeholder="#000000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {initialData ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function LineModal({
  open,
  onOpenChange,
  onSaved,
  initialData,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSaved?: (lin: any) => void
  initialData?: any
}) {
  const [data, setData] = useState({
    categoria_id: '',
    nome_pt: '',
    nome_en: '',
    superlinha_pt: '',
    superlinha_en: '',
    ncm_id: '',
    color: '#000000',
  })
  const [saving, setSaving] = useState(false)
  const { categorias, ncms, reloadMetadata } = useData()
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [ncmModalOpen, setNcmModalOpen] = useState(false)

  useEffect(() => {
    if (open) {
      if (initialData) {
        setData({
          categoria_id: initialData.categoria_id || '',
          nome_pt: initialData.nome_pt || '',
          nome_en: initialData.nome_en || '',
          superlinha_pt: initialData.superlinha_pt || '',
          superlinha_en: initialData.superlinha_en || '',
          ncm_id: initialData.ncm_id || '',
          color: initialData.color || '#000000',
        })
      } else {
        setData({
          categoria_id: '',
          nome_pt: '',
          nome_en: '',
          superlinha_pt: '',
          superlinha_en: '',
          ncm_id: '',
          color: '#000000',
        })
      }
    }
  }, [open, initialData])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !data.categoria_id ||
      !data.nome_pt ||
      !data.nome_en ||
      !data.superlinha_pt ||
      !data.superlinha_en ||
      !data.ncm_id
    )
      return toast.error('Preencha todos os campos obrigatórios')
    setSaving(true)
    try {
      let saved
      if (initialData?.id) {
        saved = await pb.collection('linhas').update(initialData.id, data)
        toast.success('Linha atualizada com sucesso')
      } else {
        saved = await pb.collection('linhas').create(data)
        toast.success('Novo registro criado com sucesso')
      }
      await reloadMetadata()
      onSaved?.(saved)
      onOpenChange(false)
    } catch (e) {
      toast.error('Erro ao salvar linha')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{initialData ? 'Editar Linha' : 'Criar Nova Linha'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>
                  Categoria <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Select
                    required
                    value={data.categoria_id}
                    onValueChange={(v) => setData({ ...data, categoria_id: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a Categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_pt} / {c.nome_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="text-green-600 shrink-0"
                    onClick={() => setCatModalOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>
                  NCM <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Select
                    required
                    value={data.ncm_id}
                    onValueChange={(v) => setData({ ...data, ncm_id: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o NCM..." />
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
                    className="text-green-600 shrink-0"
                    onClick={() => setNcmModalOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Nome (PT) <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  value={data.nome_pt}
                  onChange={(e) => setData({ ...data, nome_pt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Nome (EN) <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  value={data.nome_en}
                  onChange={(e) => setData({ ...data, nome_en: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Superlinha (PT) <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  value={data.superlinha_pt}
                  onChange={(e) => setData({ ...data, superlinha_pt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Superlinha (EN) <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  value={data.superlinha_en}
                  onChange={(e) => setData({ ...data, superlinha_en: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Cor (Opcional)</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="color"
                    value={data.color}
                    onChange={(e) => setData({ ...data, color: e.target.value })}
                    className="h-10 w-16 p-1 cursor-pointer"
                  />
                  <Input
                    value={data.color}
                    onChange={(e) => setData({ ...data, color: e.target.value })}
                    className="uppercase font-mono"
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {initialData ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <CategoryModal
        open={catModalOpen}
        onOpenChange={setCatModalOpen}
        onSaved={(c) => setData({ ...data, categoria_id: c.id })}
      />
      <NcmModal
        open={ncmModalOpen}
        onOpenChange={setNcmModalOpen}
        onSaved={(n) => setData({ ...data, ncm_id: n.id })}
      />
    </>
  )
}

export function FinishModal({
  open,
  onOpenChange,
  onSaved,
  initialData,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSaved?: (acab: any) => void
  initialData?: any
}) {
  const [data, setData] = useState({ codigo: '', nome_pt: '', nome_en: '', cor_hex: '#000000' })
  const [saving, setSaving] = useState(false)
  const { reloadMetadata } = useData()

  useEffect(() => {
    if (open) {
      if (initialData) {
        setData({
          codigo: initialData.codigo || '',
          nome_pt: initialData.nome_pt || '',
          nome_en: initialData.nome_en || '',
          cor_hex: initialData.cor_hex || '#000000',
        })
      } else {
        setData({ codigo: '', nome_pt: '', nome_en: '', cor_hex: '#000000' })
      }
    }
  }, [open, initialData])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.codigo || !data.nome_pt || !data.nome_en || !data.cor_hex)
      return toast.error('Preencha todos os campos obrigatórios')
    setSaving(true)
    try {
      if (!initialData?.id) {
        const existing = await pb
          .collection('acabamentos')
          .getList(1, 1, { filter: `codigo = "${data.codigo}"` })
        if (existing.items.length > 0) {
          setSaving(false)
          return toast.error('Já existe um acabamento com este código.')
        }
      }

      let saved
      if (initialData?.id) {
        saved = await pb.collection('acabamentos').update(initialData.id, data)
        toast.success('Acabamento atualizado com sucesso')
      } else {
        saved = await pb.collection('acabamentos').create(data)
        toast.success('Novo registro criado com sucesso')
      }
      await reloadMetadata()
      onSaved?.(saved)
      onOpenChange(false)
    } catch (e) {
      toast.error('Erro ao salvar acabamento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Acabamento' : 'Criar Novo Acabamento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Código <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                value={data.codigo}
                onChange={(e) => setData({ ...data, codigo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Cor (Hex) <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  required
                  value={data.cor_hex}
                  onChange={(e) => setData({ ...data, cor_hex: e.target.value })}
                  className="h-10 w-16 p-1 cursor-pointer"
                />
                <Input
                  value={data.cor_hex}
                  onChange={(e) => setData({ ...data, cor_hex: e.target.value })}
                  className="uppercase font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Nome (PT) <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                value={data.nome_pt}
                onChange={(e) => setData({ ...data, nome_pt: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Nome (EN) <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                value={data.nome_en}
                onChange={(e) => setData({ ...data, nome_en: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {initialData ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function NcmModal({
  open,
  onOpenChange,
  onSaved,
  initialData,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSaved?: (n: any) => void
  initialData?: any
}) {
  const [data, setData] = useState({
    codigo: '',
    ii: 0,
    ipi: 0,
    pis: 0,
    cofins: 0,
    observacoes: '',
  })
  const [saving, setSaving] = useState(false)
  const { reloadMetadata } = useData()

  useEffect(() => {
    if (open) {
      if (initialData) {
        setData({
          codigo: initialData.codigo || '',
          ii: initialData.ii || 0,
          ipi: initialData.ipi || 0,
          pis: initialData.pis || 0,
          cofins: initialData.cofins || 0,
          observacoes: initialData.observacoes || '',
        })
      } else {
        setData({ codigo: '', ii: 0, ipi: 0, pis: 0, cofins: 0, observacoes: '' })
      }
    }
  }, [open, initialData])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.codigo) return toast.error('Preencha todos os campos obrigatórios')
    setSaving(true)
    try {
      if (!initialData?.id) {
        const existing = await pb
          .collection('ncm')
          .getList(1, 1, { filter: `codigo = "${data.codigo}"` })
        if (existing.items.length > 0) {
          setSaving(false)
          return toast.error('Já existe um registro com este NCM.')
        }
      }

      let saved
      if (initialData?.id) {
        saved = await pb.collection('ncm').update(initialData.id, data)
        toast.success('NCM atualizado com sucesso')
      } else {
        saved = await pb.collection('ncm').create(data)
        toast.success('Novo registro criado com sucesso')
      }
      await reloadMetadata()
      onSaved?.(saved)
      onOpenChange(false)
    } catch (e) {
      toast.error('Erro ao salvar NCM')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar NCM' : 'Criar Novo NCM'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>
              Código <span className="text-destructive">*</span>
            </Label>
            <Input
              required
              value={data.codigo}
              onChange={(e) => setData({ ...data, codigo: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>II (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.ii}
                onChange={(e) => setData({ ...data, ii: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>IPI (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.ipi}
                onChange={(e) => setData({ ...data, ipi: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>PIS (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.pis}
                onChange={(e) => setData({ ...data, pis: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>COFINS (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.cofins}
                onChange={(e) => setData({ ...data, cofins: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={data.observacoes}
              onChange={(e) => setData({ ...data, observacoes: e.target.value })}
              placeholder="Ex: Dumping, Ex-tarifário..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {initialData ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function UnidadeMedidaModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSaved?: (u: any) => void
}) {
  const [nome, setNome] = useState('')
  const [saving, setSaving] = useState(false)
  const { reloadMetadata } = useData()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome) return toast.error('O nome é obrigatório')
    setSaving(true)
    try {
      const created = await pb.collection('unidades_medida').create({ nome })
      await reloadMetadata()
      toast.success('Unidade de medida criada com sucesso')
      onSaved?.(created)
      onOpenChange(false)
      setNome('')
    } catch (e) {
      toast.error('Erro ao salvar unidade de medida')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Criar Unidade de Medida</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>
              Nome / Símbolo <span className="text-destructive">*</span>
            </Label>
            <Input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="ex: cm, L, kg"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              Criar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
