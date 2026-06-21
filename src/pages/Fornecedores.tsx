import { useState, useEffect } from 'react'
import { Factory, Plus, Edit2, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const { toast } = useToast()

  const load = async () => {
    try {
      const data = await pb.collection('fornecedores').getFullList({ sort: 'nome' })
      setFornecedores(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    load()
  }, [])
  useRealtime('fornecedores', load)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const data = {
      nome: fd.get('nome'),
      contato: fd.get('contato'),
      email: fd.get('email'),
      ativo: fd.get('ativo') === 'on',
    }

    try {
      if (editing) await pb.collection('fornecedores').update(editing.id, data)
      else await pb.collection('fornecedores').create(data)
      setIsOpen(false)
      setEditing(null)
      toast({ title: 'Sucesso', description: 'Fabricante salvo.' })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fabricante?')) return
    try {
      await pb.collection('fornecedores').delete(id)
      toast({ title: 'Fabricante excluído' })
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    }
  }

  const filtered = fornecedores.filter((f) => f.nome.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6 space-y-6 flex flex-col h-full bg-background">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Factory className="w-8 h-8 text-primary" /> Fabricantes
        </h1>
        <Dialog
          open={isOpen}
          onOpenChange={(v) => {
            setIsOpen(v)
            if (!v) setEditing(null)
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Novo Fabricante
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Fabricante' : 'Novo Fabricante'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome do Fabricante</Label>
                <Input name="nome" defaultValue={editing?.nome} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contato (Opcional)</Label>
                  <Input
                    name="contato"
                    defaultValue={editing?.contato}
                    placeholder="Nome do representante"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail (Opcional)</Label>
                  <Input
                    type="email"
                    name="email"
                    defaultValue={editing?.email}
                    placeholder="vendas@exemplo.com"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Switch name="ativo" defaultChecked={editing ? editing.ativo : true} />
                <Label>Ativo</Label>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit">Salvar Fabricante</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto border rounded-xl shadow-sm bg-card">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Nenhum fabricante encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-semibold text-foreground">{f.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{f.contato || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{f.email || '-'}</TableCell>
                  <TableCell>
                    {f.ativo ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(f)
                          setIsOpen(true)
                        }}
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
