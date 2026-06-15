import { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  Trash2,
  Edit2,
  Image as ImageIcon,
  LayoutGrid,
  List as ListIcon,
  Search,
  ArrowUpDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useData } from '@/contexts/data-context'

export default function FotosCatalogo() {
  const [fotos, setFotos] = useState<any[]>([])
  const { acabamentos } = useData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFoto, setEditingFoto] = useState<any>(null)

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('created-desc')

  const [formData, setFormData] = useState({
    descricao: '',
    tipo: '',
    subtipo: '',
    tamanho: '',
    acabamento_id: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const fetchFotos = async () => {
    try {
      const res = await pb.collection('foto_catalogo').getFullList({ sort: '-created' })
      setFotos(res)
    } catch (e) {
      toast.error('Erro ao buscar fotos')
    }
  }

  useEffect(() => {
    fetchFotos()
  }, [])

  useRealtime('foto_catalogo', () => {
    fetchFotos()
  })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)
    try {
      const data = new FormData()
      data.append('descricao', formData.descricao)
      data.append('tipo', formData.tipo)
      data.append('subtipo', formData.subtipo)
      data.append('tamanho', formData.tamanho)

      const acabId = formData.acabamento_id === 'none' ? '' : formData.acabamento_id
      data.append('acabamento_id', acabId)

      if (file) {
        data.append('arquivo', file)
      }

      if (editingFoto) {
        await pb.collection('foto_catalogo').update(editingFoto.id, data)
        toast.success('Foto atualizada com sucesso')
      } else {
        if (!file) {
          toast.error('Selecione uma imagem')
          setIsUploading(false)
          return
        }
        await pb.collection('foto_catalogo').create(data)
        toast.success('Foto cadastrada com sucesso')
      }
      setIsModalOpen(false)
    } catch (e: any) {
      toast.error('Erro ao salvar foto: ' + e.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta foto?')) return
    try {
      await pb.collection('foto_catalogo').delete(id)
      toast.success('Foto excluída com sucesso')
    } catch (e) {
      toast.error('Erro ao excluir foto')
    }
  }

  const openEdit = (f: any) => {
    setEditingFoto(f)
    setFormData({
      descricao: f.descricao || '',
      tipo: f.tipo || '',
      subtipo: f.subtipo || '',
      tamanho: f.tamanho || '',
      acabamento_id: f.acabamento_id || 'none',
    })
    setFile(null)
    setIsModalOpen(true)
  }

  const openNew = () => {
    setEditingFoto(null)
    setFormData({ descricao: '', tipo: '', subtipo: '', tamanho: '', acabamento_id: 'none' })
    setFile(null)
    setIsModalOpen(true)
  }

  const getAcabamentoName = (id: string) => {
    return acabamentos.find((a: any) => a.id === id)?.nome_pt || '-'
  }

  const filteredAndSortedFotos = useMemo(() => {
    const terms = searchTerm.split(' ').filter(Boolean)
    const includes = terms.filter((t) => !t.startsWith('-')).map((t) => t.toLowerCase())
    const excludes = terms.filter((t) => t.startsWith('-')).map((t) => t.substring(1).toLowerCase())

    const filtered = fotos.filter((f) => {
      const searchableText = `${f.descricao || ''} ${f.tipo || ''} ${f.subtipo || ''}`.toLowerCase()

      const hasAllIncludes = includes.every((inc) => searchableText.includes(inc))
      const hasNoExcludes =
        excludes.length === 0 || excludes.every((exc) => exc && !searchableText.includes(exc))

      return hasAllIncludes && hasNoExcludes
    })

    filtered.sort((a, b) => {
      const descA = (a.descricao || '').toLowerCase()
      const descB = (b.descricao || '').toLowerCase()
      const tipoA = (a.tipo || '').toLowerCase()
      const tipoB = (b.tipo || '').toLowerCase()

      switch (sortBy) {
        case 'descricao-asc':
          return descA.localeCompare(descB)
        case 'descricao-desc':
          return descB.localeCompare(descA)
        case 'tipo-asc':
          return tipoA.localeCompare(tipoB)
        case 'tipo-desc':
          return tipoB.localeCompare(tipoA)
        case 'created-desc':
        default:
          return new Date(b.created).getTime() - new Date(a.created).getTime()
      }
    })

    return filtered
  }, [fotos, searchTerm, sortBy])

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catálogo de Fotos</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie as imagens do catálogo de produtos.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar Foto
        </Button>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fotos... (use '-' para excluir termos, ex: parafuso -SS304)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created-desc">Mais recentes</SelectItem>
              <SelectItem value="descricao-asc">Descrição (A-Z)</SelectItem>
              <SelectItem value="descricao-desc">Descrição (Z-A)</SelectItem>
              <SelectItem value="tipo-asc">Tipo (A-Z)</SelectItem>
              <SelectItem value="tipo-desc">Tipo (Z-A)</SelectItem>
            </SelectContent>
          </Select>

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as 'grid' | 'list')}
          >
            <ToggleGroupItem value="grid" aria-label="Visualização em Grade">
              <LayoutGrid className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="Visualização em Lista">
              <ListIcon className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {filteredAndSortedFotos.length === 0 ? (
        <div className="py-12 text-center border rounded-xl bg-card border-dashed">
          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-3" />
          <p className="text-muted-foreground">Nenhuma foto encontrada no catálogo.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredAndSortedFotos.map((f) => (
            <div
              key={f.id}
              className="border rounded-xl bg-card overflow-hidden shadow-sm flex flex-col group relative"
            >
              <div className="aspect-square bg-muted relative border-b">
                {f.arquivo ? (
                  <img
                    src={pb.files.getURL(f, f.arquivo, { thumb: '400x400' })}
                    alt={f.descricao}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground opacity-30" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(f)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDelete(f.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3 flex-1 flex flex-col gap-1 text-sm">
                <p className="font-medium line-clamp-2" title={f.descricao}>
                  {f.descricao || 'Sem descrição'}
                </p>
                <div className="text-xs text-muted-foreground mt-auto pt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                  {f.tipo && (
                    <span>
                      <span className="font-semibold">Tipo:</span> {f.tipo}
                    </span>
                  )}
                  {f.subtipo && (
                    <span>
                      <span className="font-semibold">Sub:</span> {f.subtipo}
                    </span>
                  )}
                  {f.tamanho && (
                    <span>
                      <span className="font-semibold">Tam:</span> {f.tamanho}
                    </span>
                  )}
                  {f.acabamento_id && (
                    <span className="col-span-2 truncate">
                      <span className="font-semibold">Acab:</span>{' '}
                      {getAcabamentoName(f.acabamento_id)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Imagem</TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 font-semibold hover:text-foreground"
                    onClick={() =>
                      setSortBy(sortBy === 'descricao-asc' ? 'descricao-desc' : 'descricao-asc')
                    }
                  >
                    Descrição{' '}
                    {sortBy.startsWith('descricao') && <ArrowUpDown className="w-3 h-3" />}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 font-semibold hover:text-foreground"
                    onClick={() => setSortBy(sortBy === 'tipo-asc' ? 'tipo-desc' : 'tipo-asc')}
                  >
                    Tipo {sortBy.startsWith('tipo') && <ArrowUpDown className="w-3 h-3" />}
                  </button>
                </TableHead>
                <TableHead>Subtipo</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Acabamento</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedFotos.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    {f.arquivo ? (
                      <div className="w-12 h-12 rounded bg-muted overflow-hidden border">
                        <img
                          src={pb.files.getURL(f, f.arquivo, { thumb: '100x100' })}
                          alt={f.descricao}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center border">
                        <ImageIcon className="w-5 h-5 text-muted-foreground opacity-30" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{f.descricao || '-'}</TableCell>
                  <TableCell>{f.tipo || '-'}</TableCell>
                  <TableCell>{f.subtipo || '-'}</TableCell>
                  <TableCell>{f.tamanho || '-'}</TableCell>
                  <TableCell>{getAcabamentoName(f.acabamento_id)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(f)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(f.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingFoto ? 'Editar Foto do Catálogo' : 'Adicionar Nova Foto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            {!editingFoto && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Arquivo de Imagem <span className="text-destructive">*</span>
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required={!editingFoto}
                />
              </div>
            )}
            {editingFoto && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Substituir Imagem (opcional)</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva a imagem..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <Input
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Subtipo</label>
                <Input
                  value={formData.subtipo}
                  onChange={(e) => setFormData({ ...formData, subtipo: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tamanho</label>
                <Input
                  value={formData.tamanho}
                  onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Acabamento</label>
                <Select
                  value={formData.acabamento_id}
                  onValueChange={(v) => setFormData({ ...formData, acabamento_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {acabamentos.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome_pt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
