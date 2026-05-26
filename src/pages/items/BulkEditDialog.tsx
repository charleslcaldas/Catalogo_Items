import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useData } from '@/contexts/data-context'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function BulkEditDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: string[]
  onSuccess: () => void
}) {
  const { linhas, acabamentos, ncms } = useData()
  const [loading, setLoading] = useState(false)

  const [updates, setUpdates] = useState<{
    ativo?: boolean
    sincronizado_com_zoho?: boolean
    linha_id?: string
    acabamento_id?: string
    ncm_id?: string
  }>({})

  const [toggles, setToggles] = useState({
    ativo: false,
    sincronizado_com_zoho: false,
    linha_id: false,
    acabamento_id: false,
    ncm_id: false,
  })

  const handleApply = async () => {
    const payload: any = {}
    if (toggles.ativo) payload.ativo = updates.ativo ?? false
    if (toggles.sincronizado_com_zoho)
      payload.sincronizado_com_zoho = updates.sincronizado_com_zoho ?? false
    if (toggles.linha_id && updates.linha_id) payload.linha_id = updates.linha_id
    if (toggles.acabamento_id && updates.acabamento_id)
      payload.acabamento_id = updates.acabamento_id
    if (toggles.ncm_id && updates.ncm_id) payload.ncm_id = updates.ncm_id

    if (Object.keys(payload).length === 0) {
      return toast.warning('Nenhuma alteração selecionada.')
    }

    setLoading(true)
    try {
      await Promise.all(selectedIds.map((id) => pb.collection('itens').update(id, payload)))
      toast.success(`${selectedIds.length} itens atualizados com sucesso.`)
      onSuccess()
    } catch (error: any) {
      toast.error('Erro na atualização em massa: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edição em Massa</DialogTitle>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você está prestes a alterar <strong>{selectedIds.length}</strong> itens simultaneamente.
            Selecione os campos que deseja sobrescrever.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4 border p-3 rounded-xl bg-card">
            <Switch
              checked={toggles.ativo}
              onCheckedChange={(c) => setToggles({ ...toggles, ativo: c })}
            />
            <div className="flex-1">
              <Label>Status do Item</Label>
              {toggles.ativo && (
                <div className="mt-2">
                  <Select onValueChange={(v) => setUpdates({ ...updates, ativo: v === 'true' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Ativo</SelectItem>
                      <SelectItem value="false">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 border p-3 rounded-xl bg-card">
            <Switch
              checked={toggles.sincronizado_com_zoho}
              onCheckedChange={(c) => setToggles({ ...toggles, sincronizado_com_zoho: c })}
            />
            <div className="flex-1">
              <Label>Status de Sincronização</Label>
              {toggles.sincronizado_com_zoho && (
                <div className="mt-2">
                  <Select
                    onValueChange={(v) =>
                      setUpdates({ ...updates, sincronizado_com_zoho: v === 'true' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sincronizado</SelectItem>
                      <SelectItem value="false">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 border p-3 rounded-xl bg-card">
            <Switch
              checked={toggles.linha_id}
              onCheckedChange={(c) => setToggles({ ...toggles, linha_id: c })}
            />
            <div className="flex-1">
              <Label>Alterar Linha / Categoria</Label>
              {toggles.linha_id && (
                <div className="mt-2">
                  <Select onValueChange={(v) => setUpdates({ ...updates, linha_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a linha" />
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
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 border p-3 rounded-xl bg-card">
            <Switch
              checked={toggles.acabamento_id}
              onCheckedChange={(c) => setToggles({ ...toggles, acabamento_id: c })}
            />
            <div className="flex-1">
              <Label>Alterar Acabamento</Label>
              {toggles.acabamento_id && (
                <div className="mt-2">
                  <Select onValueChange={(v) => setUpdates({ ...updates, acabamento_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o acabamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {acabamentos.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome_pt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 border p-3 rounded-xl bg-card">
            <Switch
              checked={toggles.ncm_id}
              onCheckedChange={(c) => setToggles({ ...toggles, ncm_id: c })}
            />
            <div className="flex-1">
              <Label>Alterar NCM</Label>
              {toggles.ncm_id && (
                <div className="mt-2">
                  <Select onValueChange={(v) => setUpdates({ ...updates, ncm_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o NCM" />
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
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={loading}>
            {loading ? 'Aplicando...' : 'Aplicar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
