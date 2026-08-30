import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useData } from '@/contexts/data-context'

export default function Unidades() {
  const navigate = useNavigate()
  const { itens, reloadMetadata } = useData()
  const [unidades, setUnidades] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUnidade, setEditingUnidade] = useState<any>(null)
  const [nome, setNome] = useState('')

  const fetchUnidades = async () => {
    try {
      const res = await pb.collection('unidades_medida').getFullList({ sort: 'nome' })
      setUnidades(res)
    } catch (e) {
      toast.error('Erro ao buscar unidades')
    }
  }

  useEffect(() => {
    fetchUnidades()
  }, [])

  useRealtime('unidades_medida', () => {
    fetchUnidades()
    reloadMetadata()
  })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast.error('O nome da unidade é obrigatório.')
      return
    }
    try {
      if (editingUnidade) {
        await pb.collection('unidades_medida').update(editingUnidade.id, { nome })
        toast.success('Unidade atualizada com sucesso')
      } else {
        await pb.collection('unidades_medida').create({ nome })
        toast.success('Unidade criada com sucesso')
      }
      setIsModalOpen(false)
      reloadMetadata()
    } catch (e) {
      toast.error('Erro ao salvar unidade')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const linked = await pb.collection('itens').getList(1, 1, { filter: `unidade_id = "${id}"` })
      if (linked.totalItems > 0) {
        toast.error('Não é possível excluir: existem itens vinculados a esta unidade.')
        return
      }
      await pb.collection('unidades_medida').delete(id)
      toast.success('Unidade excluída com sucesso')
      reloadMetadata()
    } catch (e) {
      toast.error('Erro ao excluir unidade')
    }
  }

  const openEdit = (u: any) => {
    setEditingUnidade(u)
    setNome(u.nome)
    setIsModalOpen(true)
  }

  const openNew = () => {
    setEditingUnidade(null)
    setNome('')
    setIsModalOpen(true)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unidades de Medida</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie as unidades utilizadas nos itens do catálogo.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Nova Unidade
        </Button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Unidade</TableHead>
              <TableHead className="text-center">Total de Itens</TableHead>
              <TableHead className="w-[180px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unidades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Nenhuma unidade cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              unidades.map((u) => {
                const itensCount = itens.filter((i) => i.unidade_id === u.id).length

                return (
                  <TableRow
                    key={u.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/itens?unidade_id=${u.id}`)}
                  >
                    <TableCell className="font-medium">
                      <span className="font-semibold text-sm hover:underline">{u.nome}</span>
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Badge
                        variant="secondary"
                        className="font-medium cursor-pointer hover:bg-secondary/80 transition-colors"
                        onClick={() => navigate(`/itens?unidade_id=${u.id}`)}
                        title={`Ver ${itensCount} item(ns) desta unidade`}
                      >
                        {itensCount} {itensCount === 1 ? 'item' : 'itens'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEdit(u)
                          }}
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/itens?unidade_id=${u.id}`)
                          }}
                        >
                          Itens <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(u.id)
                          }}
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnidade ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Unidade</label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Ex: kg, m, pct"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
