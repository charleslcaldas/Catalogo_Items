import { useState } from 'react'
import { Factory, Plus, Edit2, Trash2, Search, Users, ArrowRight, UserPlus } from 'lucide-react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { useData } from '@/contexts/data-context'
import { ContatoModal } from '@/components/MetadataModals'
import pb from '@/lib/pocketbase/client'

export default function Fornecedores() {
  const { fornecedores, contatosFornecedor, reloadFornecedoresEContatos } = useData()
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [quickContactFabId, setQuickContactFabId] = useState<string | null>(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const data = {
      nome: fd.get('nome'),
      contato: fd.get('contato'),
      email: fd.get('email'),
      ativo: fd.get('ativo') === 'on',
      incoterm: fd.get('incoterm'),
      tempo_fabricacao: fd.get('tempo_fabricacao'),
      condicao_pagamento: fd.get('condicao_pagamento'),
    }

    try {
      if (editing) await pb.collection('fornecedores').update(editing.id, data)
      else await pb.collection('fornecedores').create(data)
      await reloadFornecedoresEContatos()
      setIsOpen(false)
      setEditing(null)
      toast({ title: 'Sucesso', description: 'Fabricante salvo com sucesso.' })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fabricante e seus contatos vinculados?'))
      return
    try {
      await pb.collection('fornecedores').delete(id)
      await reloadFornecedoresEContatos()
      toast({ title: 'Fabricante excluído' })
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    }
  }

  const filtered = fornecedores.filter(
    (f) =>
      f.nome.toLowerCase().includes(search.toLowerCase()) ||
      (f.email && f.email.toLowerCase().includes(search.toLowerCase())) ||
      (f.contato && f.contato.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Factory className="w-8 h-8 text-primary" /> Fabricantes
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie fabricantes e seus contatos associados (diretores, gerentes, analistas, etc).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/contatos')}>
            <Users className="w-4 h-4 mr-2" /> Todos os Contatos
          </Button>

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
                    <Label>Contato Principal (Opcional)</Label>
                    <Input
                      name="contato"
                      defaultValue={editing?.contato}
                      placeholder="Nome do representante"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail Geral (Opcional)</Label>
                    <Input
                      type="email"
                      name="email"
                      defaultValue={editing?.email}
                      placeholder="vendas@exemplo.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Incoterm (Opcional)</Label>
                    <Input
                      name="incoterm"
                      defaultValue={editing?.incoterm}
                      placeholder="Ex.: FOB, EXW, CIF"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tempo de Fabricação (Opcional)</Label>
                    <Input
                      name="tempo_fabricacao"
                      defaultValue={editing?.tempo_fabricacao}
                      placeholder="Ex.: 30 dias"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Condição de Pagamento (Opcional)</Label>
                  <Input
                    name="condicao_pagamento"
                    defaultValue={editing?.condicao_pagamento}
                    placeholder="Ex.: 30% adiantado, 70% contra BL"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Switch name="ativo" defaultChecked={editing ? editing.ativo : true} />
                  <Label>Fabricante Ativo</Label>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit">Salvar Fabricante</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por fabricante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="py-4 px-6 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Lista de Fabricantes ({filtered.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Fabricante</TableHead>
                  <TableHead className="text-center">Contatos Vinculados</TableHead>
                  <TableHead>E-mail Geral</TableHead>
                  <TableHead>Incoterm</TableHead>
                  <TableHead>Tempo Fabr.</TableHead>
                  <TableHead>Cond. Pagamento</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[180px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      Nenhum fabricante encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((f) => {
                    const contatosDoFab = contatosFornecedor.filter((c) => c.fabricante_id === f.id)
                    const count = contatosDoFab.length

                    return (
                      <TableRow
                        key={f.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/contatos?fabricante_id=${f.id}`)}
                      >
                        <TableCell className="font-semibold text-foreground">
                          <div className="flex flex-col">
                            <span>{f.nome}</span>
                            {f.contato && (
                              <span className="text-xs text-muted-foreground font-normal">
                                Rep: {f.contato}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <Badge
                              variant={count > 0 ? 'secondary' : 'outline'}
                              className="font-medium cursor-pointer hover:bg-secondary/80 transition-colors gap-1"
                              onClick={() => navigate(`/contatos?fabricante_id=${f.id}`)}
                              title={`Ver ${count} contato(s) deste fabricante`}
                            >
                              <Users className="w-3 h-3 text-muted-foreground" />
                              {count} {count === 1 ? 'contato' : 'contatos'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => setQuickContactFabId(f.id)}
                              title="Adicionar contato para este fabricante"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{f.email || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{f.incoterm || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {f.tempo_fabricacao || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {f.condicao_pagamento || '-'}
                        </TableCell>
                        <TableCell>
                          {f.ativo ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1"
                              onClick={() => navigate(`/contatos?fabricante_id=${f.id}`)}
                            >
                              Contatos <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditing(f)
                                setIsOpen(true)
                              }}
                              title="Editar Fabricante"
                            >
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(f.id)}
                              title="Excluir Fabricante"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </CardContent>
      </Card>

      <ContatoModal
        open={!!quickContactFabId}
        onOpenChange={(v) => {
          if (!v) setQuickContactFabId(null)
        }}
        defaultFabricanteId={quickContactFabId || undefined}
      />
    </div>
  )
}
