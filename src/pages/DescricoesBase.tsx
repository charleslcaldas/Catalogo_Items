import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useData, DescricaoBase } from '@/contexts/data-context'
import { Plus, Copy, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'

export default function DescricoesBasePage() {
  const { descricoesBase, categorias, linhas, ncms, reloadMetadata } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<DescricaoBase> | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<'nome_pt' | 'nome_en' | 'categoria' | 'linha' | null>(
    null,
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)

  const filteredDesc = descricoesBase.filter((d) => {
    const term = searchTerm.toLowerCase()
    return (
      d.nome_pt.toLowerCase().includes(term) ||
      (d.nome_en && d.nome_en.toLowerCase().includes(term))
    )
  })

  const handleOpenNew = () => {
    setEditingItem({ ativo: true })
    setModalOpen(true)
  }

  const handleEdit = (item: DescricaoBase) => {
    setEditingItem(item)
    setModalOpen(true)
  }

  const handleDuplicate = (item: DescricaoBase) => {
    setEditingItem({ ...item, id: undefined, codigo: `${item.codigo}-COPY` })
    setModalOpen(true)
  }

  const handleSort = (field: 'nome_pt' | 'nome_en' | 'categoria' | 'linha') => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc')
      else if (sortOrder === 'desc') {
        setSortField(null)
        setSortOrder(null)
      }
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ field }: { field: 'nome_pt' | 'nome_en' | 'categoria' | 'linha' }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50 inline-block" />
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4 inline-block" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4 inline-block" />
    )
  }

  let sortedDesc = [...filteredDesc]
  if (sortField && sortOrder) {
    sortedDesc.sort((a, b) => {
      let valA = ''
      let valB = ''

      if (sortField === 'nome_pt') {
        valA = a.nome_pt
        valB = b.nome_pt
      } else if (sortField === 'nome_en') {
        valA = a.nome_en || ''
        valB = b.nome_en || ''
      } else if (sortField === 'categoria') {
        valA = categorias.find((c) => c.id === a.categoria_id)?.nome_pt || ''
        valB = categorias.find((c) => c.id === b.categoria_id)?.nome_pt || ''
      } else if (sortField === 'linha') {
        valA = linhas.find((l) => l.id === a.linha_id)?.nome_pt || ''
        valB = linhas.find((l) => l.id === b.linha_id)?.nome_pt || ''
      }

      valA = valA.toLowerCase()
      valB = valB.toLowerCase()

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem?.nome_pt || !editingItem?.categoria_id || !editingItem?.linha_id) {
      return toast.error('Preencha os campos obrigatórios')
    }
    setSaving(true)
    try {
      if (!editingItem.id && !editingItem.codigo) {
        editingItem.codigo = `DESC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      }
      if (editingItem.id) {
        await pb.collection('descricoes_base').update(editingItem.id, editingItem)
        toast.success('Descrição Base atualizada')
      } else {
        await pb.collection('descricoes_base').create(editingItem)
        toast.success('Nova Descrição Base criada')
      }
      await reloadMetadata()
      setModalOpen(false)
    } catch (err: any) {
      const fieldErrors = extractFieldErrors(err)
      if (fieldErrors.nome_pt) {
        toast.error('Esta descrição já está cadastrada.')
      } else {
        toast.error('Erro ao salvar: ' + getErrorMessage(err))
      }
    } finally {
      setSaving(false)
    }
  }

  const filteredLinhas = linhas.filter(
    (l) => !editingItem?.categoria_id || l.categoria_id === editingItem.categoria_id,
  )

  const handleLinhaChange = (linhaId: string) => {
    const linha = linhas.find((l) => l.id === linhaId)
    setEditingItem((prev) => ({
      ...prev,
      linha_id: linhaId,
      ncm_id: linha?.ncm_id || prev?.ncm_id,
    }))
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Descrições Base</h1>
            <p className="text-muted-foreground">
              Gerencie os templates padronizados para criação de itens.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar descrições..."
              className="pl-9 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="mr-2 h-4 w-4" /> Nova Descrição Base
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Descrições Base</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('nome_pt')}
                >
                  Descrição (PT) <SortIcon field="nome_pt" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('nome_en')}
                >
                  Descrição (EN) <SortIcon field="nome_en" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('categoria')}
                >
                  Categoria <SortIcon field="categoria" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('linha')}
                >
                  Linha <SortIcon field="linha" />
                </TableHead>
                <TableHead>Impostos NCM</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDesc.map((d) => (
                <TableRow key={d.id}>
                  <TableCell
                    className="font-medium cursor-pointer hover:text-primary hover:underline transition-colors"
                    onClick={() => handleEdit(d)}
                  >
                    {d.nome_pt}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer hover:text-primary hover:underline transition-colors"
                    onClick={() => handleEdit(d)}
                  >
                    {d.nome_en || '-'}
                  </TableCell>
                  <TableCell>
                    {categorias.find((c) => c.id === d.categoria_id)?.nome_pt || '-'}
                  </TableCell>
                  <TableCell>{linhas.find((l) => l.id === d.linha_id)?.nome_pt || '-'}</TableCell>
                  <TableCell>
                    {(() => {
                      const n = ncms.find((x) => x.id === d.ncm_id)
                      if (!n) return '-'
                      return (
                        <div className="text-xs">
                          <span className="text-muted-foreground">
                            II: {n.ii}% | IPI: {n.ipi}% | PIS: {n.pis}% | COF: {n.cofins}%
                          </span>
                        </div>
                      )
                    })()}
                  </TableCell>
                  <TableCell>
                    {d.ativo ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200"
                      >
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        Inativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicate(d)}
                      title="Duplicar"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sortedDesc.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma descrição base encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingItem?.id ? 'Editar' : 'Nova'} Descrição Base</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>
                  Descrição Base (PT) <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  value={editingItem?.nome_pt || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, nome_pt: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Descrição Base (EN)</Label>
                <Input
                  value={editingItem?.nome_en || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, nome_en: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Categoria <span className="text-destructive">*</span>
                </Label>
                <Select
                  required
                  value={editingItem?.categoria_id || ''}
                  onValueChange={(v) =>
                    setEditingItem({ ...editingItem, categoria_id: v, linha_id: undefined })
                  }
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
              </div>
              <div className="space-y-2">
                <Label>
                  Linha <span className="text-destructive">*</span>
                </Label>
                <Select
                  required
                  disabled={!editingItem?.categoria_id}
                  value={editingItem?.linha_id || ''}
                  onValueChange={handleLinhaChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredLinhas.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome_pt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>NCM</Label>
                <Select
                  value={editingItem?.ncm_id || ''}
                  onValueChange={(v) => setEditingItem({ ...editingItem, ncm_id: v })}
                >
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
              </div>
              <div className="space-y-2 flex flex-col justify-center">
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="ativo"
                    checked={editingItem?.ativo ?? true}
                    onCheckedChange={(c) => setEditingItem({ ...editingItem, ativo: c })}
                  />
                  <Label htmlFor="ativo">Ativo</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
