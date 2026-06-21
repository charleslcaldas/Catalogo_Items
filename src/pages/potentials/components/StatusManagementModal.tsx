import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Trash2, Edit2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import pb from '@/lib/pocketbase/client'
import type { StatusPotencial } from '@/types'

export function StatusManagementModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [statuses, setStatuses] = useState<StatusPotencial[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ nome: '', cor_hex: '#10b981' })

  const loadStatuses = async () => {
    setLoading(true)
    try {
      const res = await pb
        .collection('status_potencial')
        .getFullList<StatusPotencial>({ sort: 'created' })
      setStatuses(res)
    } catch (err) {
      toast.error('Erro ao carregar estágios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) loadStatuses()
  }, [open])

  const handleSave = async () => {
    if (!formData.nome.trim()) return toast.error('Nome é obrigatório')
    try {
      if (editingId) {
        await pb.collection('status_potencial').update(editingId, formData)
        toast.success('Estágio atualizado')
      } else {
        await pb.collection('status_potencial').create(formData)
        toast.success('Estágio criado')
      }
      setEditingId(null)
      setFormData({ nome: '', cor_hex: '#10b981' })
      loadStatuses()
      onSaved()
    } catch (err) {
      toast.error('Erro ao salvar estágio')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este estágio?')) return
    try {
      await pb.collection('status_potencial').delete(id)
      toast.success('Estágio excluído')
      loadStatuses()
      onSaved()
    } catch (err) {
      toast.error('Erro ao excluir estágio')
    }
  }

  const handleEdit = (status: StatusPotencial) => {
    setEditingId(status.id)
    setFormData({ nome: status.nome, cor_hex: status.cor_hex || '#10b981' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Estágios</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-end mb-4 bg-slate-50 p-3 rounded-lg border">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Nome do Estágio</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="h-8 text-xs bg-white"
              placeholder="Ex: Em Análise"
            />
          </div>
          <div className="w-24 space-y-1">
            <Label className="text-xs">Cor</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={formData.cor_hex}
                onChange={(e) => setFormData({ ...formData, cor_hex: e.target.value })}
                className="h-8 w-8 p-1 cursor-pointer bg-white"
              />
            </div>
          </div>
          <Button size="sm" onClick={handleSave} className="h-8 text-xs px-4">
            {editingId ? 'Atualizar' : 'Adicionar'}
          </Button>
          {editingId && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingId(null)
                setFormData({ nome: '', cor_hex: '#10b981' })
              }}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
          )}
        </div>

        <div className="max-h-[300px] overflow-auto border rounded-md">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0">
              <TableRow className="h-8">
                <TableHead className="py-1 text-xs">Nome do Estágio</TableHead>
                <TableHead className="py-1 w-24 text-xs">Cor</TableHead>
                <TableHead className="py-1 w-20 text-right text-xs">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : statuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-xs text-muted-foreground">
                    Nenhum estágio configurado
                  </TableCell>
                </TableRow>
              ) : (
                statuses.map((s) => (
                  <TableRow key={s.id} className="h-8">
                    <TableCell className="py-1 text-xs font-medium">{s.nome}</TableCell>
                    <TableCell className="py-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full border shadow-sm"
                          style={{ backgroundColor: s.cor_hex }}
                        ></div>
                      </div>
                    </TableCell>
                    <TableCell className="py-1 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleEdit(s)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(s.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
