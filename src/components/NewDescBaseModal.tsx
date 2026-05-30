import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useData } from '@/contexts/data-context'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'

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
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      {children}
    </div>
  )
}

export function NewDescBaseModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSaved: (id: string) => void
}) {
  const { categorias, linhas, ncms } = useData()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({
    codigo: '',
    nome_pt: '',
    nome_en: '',
    categoria_id: '',
    linha_id: '',
    ncm_id: '',
  })

  const handleSave = async () => {
    if (!data.codigo || !data.nome_pt || !data.categoria_id || !data.linha_id) {
      return toast.error('Preencha os campos obrigatórios')
    }
    try {
      setLoading(true)
      const record = await pb.collection('descricoes_base').create({ ...data, ativo: true })
      toast.success('Descrição Base criada')
      onSaved(record.id)
      onOpenChange(false)
    } catch (err: any) {
      toast.error('Erro ao salvar Descrição Base: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Descrição Base</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Field label="Código *" className="col-span-2">
            <Input
              value={data.codigo}
              onChange={(e) => setData({ ...data, codigo: e.target.value })}
            />
          </Field>
          <Field label="Nome (PT) *" className="col-span-2">
            <Input
              value={data.nome_pt}
              onChange={(e) => setData({ ...data, nome_pt: e.target.value })}
            />
          </Field>
          <Field label="Nome (EN)" className="col-span-2">
            <Input
              value={data.nome_en}
              onChange={(e) => setData({ ...data, nome_en: e.target.value })}
            />
          </Field>
          <Field label="Categoria *">
            <Select
              value={data.categoria_id}
              onValueChange={(v) => setData({ ...data, categoria_id: v, linha_id: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome_pt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Linha *">
            <Select value={data.linha_id} onValueChange={(v) => setData({ ...data, linha_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {linhas
                  .filter((l) => !data.categoria_id || l.categoria_id === data.categoria_id)
                  .map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nome_pt}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="NCM">
            <Select value={data.ncm_id} onValueChange={(v) => setData({ ...data, ncm_id: v })}>
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
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
