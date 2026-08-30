import { useState } from 'react'
import {
  Factory,
  Plus,
  Trash2,
  Search,
  Users,
  UserPlus,
  MapPin,
  Building2,
  FilterX,
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
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { useData } from '@/contexts/data-context'
import { ContatoModal } from '@/components/MetadataModals'
import { FornecedorFormModal } from '@/components/FornecedorFormModal'
import { FornecedorDetailModal } from '@/components/FornecedorDetailModal'
import { Fornecedor } from '@/types'
import pb from '@/lib/pocketbase/client'

export default function Fornecedores() {
  const { fornecedores, contatosFornecedor, linhas, reloadFornecedoresEContatos } = useData()
  const [search, setSearch] = useState('')
  const [filterLinhaId, setFilterLinhaId] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')

  // Modais de controle
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null)

  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null)

  const [quickContactFabId, setQuickContactFabId] = useState<string | null>(null)
  const [deletingFornecedor, setDeletingFornecedor] = useState<Fornecedor | null>(null)

  const { toast } = useToast()
  const navigate = useNavigate()

  const handleDelete = async () => {
    if (!deletingFornecedor) return
    try {
      await pb.collection('fornecedores').delete(deletingFornecedor.id)
      await reloadFornecedoresEContatos()
      toast({ title: 'Fabricante excluído com sucesso!' })
      setDeletingFornecedor(null)
      if (selectedFornecedor?.id === deletingFornecedor.id) {
        setDetailModalOpen(false)
        setSelectedFornecedor(null)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir fabricante',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Filtragem dos fabricantes
  const filtered = fornecedores.filter((f) => {
    // Filtro por status
    if (filterStatus === 'ATIVO' && !f.ativo) return false
    if (filterStatus === 'INATIVO' && f.ativo) return false

    // Filtro por Linha
    if (filterLinhaId !== 'ALL') {
      const fLinhas = Array.isArray(f.linhas_ids)
        ? f.linhas_ids
        : f.linhas_ids
          ? [f.linhas_ids]
          : []
      if (!fLinhas.includes(filterLinhaId)) return false
    }

    // Busca textual ampla
    if (!search.trim()) return true
    const term = search.toLowerCase()
    const matchNome = (f.nome || '').toLowerCase().includes(term)
    const matchContato = (f.contato || '').toLowerCase().includes(term)
    const matchEmail = (f.email || '').toLowerCase().includes(term)
    const matchCnpj = (f.cnpj || '').toLowerCase().includes(term)
    const matchCidade = (f.cidade || '').toLowerCase().includes(term)
    const matchEstado = (f.estado || '').toLowerCase().includes(term)
    const matchPais = (f.pais || '').toLowerCase().includes(term)
    const matchItens = (f.itens_base_produz || '').toLowerCase().includes(term)
    const matchIncoterm = (f.incoterm || '').toLowerCase().includes(term)

    // Match de contatos vinculados
    const contatosFab = contatosFornecedor.filter((c) => c.fabricante_id === f.id)
    const matchContatos = contatosFab.some((c) =>
      `${c.nome || ''} ${c.sobrenome || ''} ${c.email || ''} ${c.telefone || ''} ${c.whatsapp || ''}`
        .toLowerCase()
        .includes(term),
    )

    return (
      matchNome ||
      matchContato ||
      matchEmail ||
      matchCnpj ||
      matchCidade ||
      matchEstado ||
      matchPais ||
      matchItens ||
      matchIncoterm ||
      matchContatos
    )
  })

  // Sincronizar selectedFornecedor caso seja atualizado
  const currentDetailFornecedor = selectedFornecedor
    ? fornecedores.find((f) => f.id === selectedFornecedor.id) || selectedFornecedor
    : null

  const handleSavedFornecedor = (saved: Fornecedor) => {
    setSelectedFornecedor(saved)
    // Se o modal de ficha estiver aberto ou for reaberto, ele mostrará o fabricante atualizado
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Factory className="w-8 h-8 text-primary" /> Fabricantes
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie o cadastro detalhado dos fabricantes, linhas e itens base produzidos,
            localização e equipe de contatos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/contatos')}>
            <Users className="w-4 h-4 mr-2" /> Todos os Contatos
          </Button>

          <Button
            onClick={() => {
              setEditingFornecedor(null)
              setIsFormOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Fabricante
          </Button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CNPJ, cidade, contato, linha..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="w-full sm:w-60">
          <Select value={filterLinhaId} onValueChange={setFilterLinhaId}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por Linha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as Linhas</SelectItem>
              {linhas.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.nome_pt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-40">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Status</SelectItem>
              <SelectItem value="ATIVO">Apenas Ativos</SelectItem>
              <SelectItem value="INATIVO">Apenas Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(search || filterLinhaId !== 'ALL' || filterStatus !== 'ALL') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('')
              setFilterLinhaId('ALL')
              setFilterStatus('ALL')
            }}
            className="h-10 text-muted-foreground"
          >
            <FilterX className="h-4 w-4 mr-2" /> Limpar
          </Button>
        )}
      </div>

      {/* Tabela de Fabricantes */}
      <Card>
        <CardHeader className="py-4 px-6 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Lista de Fabricantes ({filtered.length})
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Clique em uma linha para ver a ficha completa e contatos
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[240px]">Fabricante</TableHead>
                  <TableHead className="w-[180px]">Localização</TableHead>
                  <TableHead className="w-[220px]">Linhas / Itens Produzidos</TableHead>
                  <TableHead className="text-center w-[130px]">Contatos</TableHead>
                  <TableHead className="w-[140px]">Incoterm / Lead</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      Nenhum fabricante encontrado para a pesquisa.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((f) => {
                    const contatosDoFab = contatosFornecedor.filter((c) => c.fabricante_id === f.id)
                    const count = contatosDoFab.length

                    const fLinhasIds = Array.isArray(f.linhas_ids)
                      ? f.linhas_ids
                      : f.linhas_ids
                        ? [f.linhas_ids]
                        : []
                    const resolvedLinhas = linhas.filter((l) => fLinhasIds.includes(l.id))

                    const localidade = [f.cidade, f.estado, f.pais].filter(Boolean).join(', ')

                    return (
                      <TableRow
                        key={f.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors group"
                        onClick={() => {
                          setSelectedFornecedor(f)
                          setDetailModalOpen(true)
                        }}
                      >
                        {/* Nome & CNPJ / Contato Geral */}
                        <TableCell className="font-semibold text-foreground">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-primary shrink-0 opacity-70 group-hover:opacity-100" />
                              <span className="text-sm font-semibold">{f.nome}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-normal mt-0.5">
                              {f.cnpj && <span className="font-mono text-[11px]">{f.cnpj}</span>}
                              {f.contato && <span>• Rep: {f.contato}</span>}
                              {f.email && !f.contato && (
                                <span className="truncate max-w-[150px]">{f.email}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Localização */}
                        <TableCell className="text-xs text-muted-foreground">
                          {localidade ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[160px]" title={localidade}>
                                {localidade}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">-</span>
                          )}
                        </TableCell>

                        {/* Linhas / Itens Produzidos */}
                        <TableCell className="text-xs">
                          <div className="flex flex-col gap-1 max-w-[220px]">
                            {resolvedLinhas.length > 0 ? (
                              <div className="flex flex-wrap gap-1 items-center">
                                {resolvedLinhas.slice(0, 2).map((l) => (
                                  <Badge
                                    key={l.id}
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0 h-5 font-normal truncate"
                                  >
                                    {l.nome_pt}
                                  </Badge>
                                ))}
                                {resolvedLinhas.length > 2 && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1 py-0 h-5 font-normal text-muted-foreground"
                                  >
                                    +{resolvedLinhas.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : f.itens_base_produz ? (
                              <span
                                className="truncate text-muted-foreground text-[11px]"
                                title={f.itens_base_produz}
                              >
                                {f.itens_base_produz}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">-</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Contatos Vinculados */}
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <Badge
                              variant={count > 0 ? 'secondary' : 'outline'}
                              className="font-medium cursor-pointer hover:bg-secondary/80 transition-colors gap-1 text-xs"
                              onClick={() => {
                                setSelectedFornecedor(f)
                                setDetailModalOpen(true)
                              }}
                              title={`Ver os ${count} contatos de ${f.nome}`}
                            >
                              <Users className="w-3 h-3 text-muted-foreground" />
                              {count}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => setQuickContactFabId(f.id)}
                              title="Adicionar novo contato para este fabricante"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>

                        {/* Condições Comerciais */}
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="flex flex-col">
                            {f.incoterm && (
                              <span className="font-medium text-foreground">{f.incoterm}</span>
                            )}
                            {f.tempo_fabricacao && (
                              <span className="text-[11px]">{f.tempo_fabricacao}</span>
                            )}
                            {!f.incoterm && !f.tempo_fabricacao && '-'}
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {f.ativo ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[11px] py-0">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[11px] py-0">
                              Inativo
                            </Badge>
                          )}
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingFornecedor(f)}
                              title="Excluir Fabricante"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal de Formulário Completo de Fabricante */}
      <FornecedorFormModal
        open={isFormOpen}
        onOpenChange={(v) => {
          setIsFormOpen(v)
          if (!v) setEditingFornecedor(null)
        }}
        initialData={editingFornecedor}
        onSaved={handleSavedFornecedor}
      />

      {/* Modal/Ficha de Detalhe Completo do Fabricante + Contatos */}
      <FornecedorDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        fornecedor={currentDetailFornecedor}
        onEditFornecedor={(f) => {
          setEditingFornecedor(f)
          setIsFormOpen(true)
        }}
      />

      {/* Modal Rápido de Adição de Contato */}
      <ContatoModal
        open={!!quickContactFabId}
        onOpenChange={(v) => {
          if (!v) setQuickContactFabId(null)
        }}
        defaultFabricanteId={quickContactFabId || undefined}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog
        open={!!deletingFornecedor}
        onOpenChange={(open) => {
          if (!open) setDeletingFornecedor(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fabricante?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o fabricante{' '}
              <strong>{deletingFornecedor?.nome}</strong> e todos os contatos vinculados a ele? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Excluir Fabricante
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
