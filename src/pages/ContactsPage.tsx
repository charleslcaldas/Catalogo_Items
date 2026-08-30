import { useState } from 'react'
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Search,
  FilterX,
  Phone,
  Mail,
  MessageSquare,
  Building2,
  ExternalLink,
} from 'lucide-react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useData } from '@/contexts/data-context'
import { ContatoFornecedor } from '@/types'
import { ContatoModal } from '@/components/MetadataModals'
import pb from '@/lib/pocketbase/client'

export default function ContactsPage() {
  const { fornecedores, contatosFornecedor, reloadFornecedoresEContatos } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingContato, setEditingContato] = useState<ContatoFornecedor | null>(null)
  const [deletingContato, setDeletingContato] = useState<ContatoFornecedor | null>(null)

  const filterFabricanteId = searchParams.get('fabricante_id') || 'ALL'
  const filterCargo = searchParams.get('cargo') || 'ALL'

  const currentFabricante = fornecedores.find((f) => f.id === filterFabricanteId)

  // Extrair todos os cargos distintos para o filtro
  const availableCargos = Array.from(
    new Set(contatosFornecedor.map((c) => c.cargo).filter(Boolean) as string[]),
  )

  const filteredContatos = contatosFornecedor.filter((c) => {
    // Filtro por Fabricante
    if (filterFabricanteId !== 'ALL' && c.fabricante_id !== filterFabricanteId) {
      return false
    }
    // Filtro por Cargo
    if (filterCargo !== 'ALL' && c.cargo !== filterCargo) {
      return false
    }
    // Busca textual
    if (!search.trim()) return true
    const term = search.toLowerCase()
    const fullName = `${c.nome || ''} ${c.sobrenome || ''}`.toLowerCase()
    const email = (c.email || '').toLowerCase()
    const phone = (c.telefone || '').toLowerCase()
    const whats = (c.whatsapp || '').toLowerCase()
    const wechat = (c.wechat || '').toLowerCase()
    const cargo = (c.cargo || '').toLowerCase()
    const fabName = (
      c.expand?.fabricante_id?.nome ||
      fornecedores.find((f) => f.id === c.fabricante_id)?.nome ||
      ''
    ).toLowerCase()

    return (
      fullName.includes(term) ||
      email.includes(term) ||
      phone.includes(term) ||
      whats.includes(term) ||
      wechat.includes(term) ||
      cargo.includes(term) ||
      fabName.includes(term)
    )
  })

  const handleDelete = async () => {
    if (!deletingContato) return
    try {
      await pb.collection('contatos_fornecedor').delete(deletingContato.id)
      toast.success('Contato excluído com sucesso')
      await reloadFornecedoresEContatos()
      setDeletingContato(null)
    } catch (err: any) {
      toast.error('Erro ao excluir contato', { description: err.message })
    }
  }

  const getFabricanteName = (c: ContatoFornecedor) => {
    return (
      c.expand?.fabricante_id?.nome ||
      fornecedores.find((f) => f.id === c.fabricante_id)?.nome ||
      'Fabricante desconhecido'
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="w-8 h-8 text-primary" /> Contatos de Fabricantes
            </h1>
            {(filterFabricanteId !== 'ALL' || filterCargo !== 'ALL') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSearchParams({})}
                className="h-8"
              >
                <FilterX className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {filterFabricanteId !== 'ALL' && currentFabricante
              ? `Gerenciando contatos vinculados a: ${currentFabricante.nome}`
              : 'Gerencie diretores, gerentes, analistas e outros contatos de cada fabricante.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {filterFabricanteId !== 'ALL' && (
            <Button variant="outline" onClick={() => navigate('/fornecedores')}>
              <Building2 className="w-4 h-4 mr-2" /> Ver Todos Fabricantes
            </Button>
          )}
          <Button
            onClick={() => {
              setEditingContato(null)
              setModalOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Contato
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cargo, telefone, e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="w-full sm:w-60">
          <Select
            value={filterFabricanteId}
            onValueChange={(val) => {
              const p = new URLSearchParams(searchParams)
              if (val === 'ALL') p.delete('fabricante_id')
              else p.set('fabricante_id', val)
              setSearchParams(p)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por Fabricante" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Fabricantes</SelectItem>
              {fornecedores.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {availableCargos.length > 0 && (
          <div className="w-full sm:w-48">
            <Select
              value={filterCargo}
              onValueChange={(val) => {
                const p = new URLSearchParams(searchParams)
                if (val === 'ALL') p.delete('cargo')
                else p.set('cargo', val)
                setSearchParams(p)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Cargos</SelectItem>
                {availableCargos.map((cargo) => (
                  <SelectItem key={cargo} value={cargo}>
                    {cargo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="py-4 px-6 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Lista de Contatos ({filteredContatos.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[200px]">Nome Completo</TableHead>
                  <TableHead className="w-[180px]">Fabricante</TableHead>
                  <TableHead className="w-[130px]">Cargo</TableHead>
                  <TableHead className="w-[180px]">E-mail</TableHead>
                  <TableHead className="w-[140px]">Telefone</TableHead>
                  <TableHead className="w-[140px]">WhatsApp</TableHead>
                  <TableHead className="w-[120px]">WeChat</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContatos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      Nenhum contato encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContatos.map((c) => {
                    const fullName = [c.nome, c.sobrenome].filter(Boolean).join(' ')
                    const fabName = getFabricanteName(c)

                    return (
                      <TableRow key={c.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {fullName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-normal cursor-pointer hover:bg-muted transition-colors flex items-center gap-1 w-fit"
                            onClick={() => {
                              const p = new URLSearchParams(searchParams)
                              p.set('fabricante_id', c.fabricante_id)
                              setSearchParams(p)
                            }}
                            title={`Filtrar apenas por ${fabName}`}
                          >
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            {fabName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {c.cargo ? (
                            <Badge
                              variant={
                                c.cargo === 'Diretor'
                                  ? 'default'
                                  : c.cargo === 'Gerente'
                                    ? 'secondary'
                                    : 'outline'
                              }
                            >
                              {c.cargo}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.email ? (
                            <a
                              href={`mailto:${c.email}`}
                              className="text-primary hover:underline flex items-center gap-1 text-sm"
                            >
                              <Mail className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate max-w-[160px]">{c.email}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.telefone ? (
                            <div className="flex items-center gap-1 text-sm text-foreground">
                              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span>{c.telefone}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.whatsapp ? (
                            <a
                              href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 text-sm font-medium"
                            >
                              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                              <span>{c.whatsapp}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.wechat ? (
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">
                              {c.wechat}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell
                          className="text-muted-foreground text-xs max-w-[200px] truncate"
                          title={c.observacoes || ''}
                        >
                          {c.observacoes || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingContato(c)
                                setModalOpen(true)
                              }}
                              title="Editar Contato"
                            >
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingContato(c)}
                              title="Excluir Contato"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
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
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v)
          if (!v) setEditingContato(null)
        }}
        initialData={editingContato}
        defaultFabricanteId={filterFabricanteId !== 'ALL' ? filterFabricanteId : undefined}
      />

      <AlertDialog
        open={!!deletingContato}
        onOpenChange={(open) => {
          if (!open) setDeletingContato(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contato?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente remover o contato{' '}
              <strong>
                {[deletingContato?.nome, deletingContato?.sobrenome].filter(Boolean).join(' ')}
              </strong>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
