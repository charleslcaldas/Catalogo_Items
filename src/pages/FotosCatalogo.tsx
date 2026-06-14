import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Image as ImageIcon } from 'lucide-react'
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
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useData } from '@/contexts/data-context'

export default function FotosCatalogo() {
  const [fotos, setFotos] = useState<any[]>([])
  const { acabamentos } = useData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFoto, setEditingFoto] = useState<any>(null)

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
    return acabamentos.find((a) => a.id === id)?.nome_pt || '-'
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {fotos.length === 0 ? (
          <div className="col-span-full py-12 text-center border rounded-xl bg-card border-dashed">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-3" />
            <p className="text-muted-foreground">Nenhuma foto encontrada no catálogo.</p>
          </div>
        ) : (
          fotos.map((f) => (
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
          ))
        )}
      </div>

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
