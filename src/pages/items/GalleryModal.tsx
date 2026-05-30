import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Search, Upload } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import type { FotoCatalogo } from '@/types'
import { toast } from 'sonner'

export function GalleryModal({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSelect: (url: string) => void
}) {
  const [fotos, setFotos] = useState<FotoCatalogo[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('search')
  const [uploading, setUploading] = useState(false)
  const [desc, setDesc] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [urlFoto, setUrlFoto] = useState('')

  useEffect(() => {
    if (open)
      pb.collection('foto_catalogo')
        .getFullList({ sort: '-created' })
        .then(setFotos as any)
        .catch(console.error)
  }, [open])

  const filtered = fotos.filter(
    (f) =>
      (f.descricao || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.tipo || '').toLowerCase().includes(search.toLowerCase()),
  )

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file && !urlFoto) return toast.error('Selecione um arquivo ou URL')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('descricao', desc)
      if (file) fd.append('arquivo', file)
      if (urlFoto) fd.append('url_foto', urlFoto)
      const res = await pb.collection('foto_catalogo').create(fd)
      toast.success('Foto adicionada')
      setFile(null)
      setUrlFoto('')
      setDesc('')
      setTab('search')
      setFotos([res as any, ...fotos])
    } catch (err) {
      toast.error('Erro ao enviar')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Galeria de Imagens</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0 mt-2">
          <TabsList>
            <TabsTrigger value="search">Buscar</TabsTrigger>
            <TabsTrigger value="upload">Novo Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="search" className="flex-1 flex flex-col min-h-0 mt-2">
            <div className="relative mb-4 shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-1">
              {filtered.map((f) => (
                <div
                  key={f.id}
                  className="border bg-card rounded-xl p-3 cursor-pointer hover:border-primary hover:shadow-md transition-all group flex flex-col"
                  onClick={() => {
                    onSelect(f.arquivo ? pb.files.getURL(f, f.arquivo) : f.url_foto)
                    onOpenChange(false)
                  }}
                >
                  <div className="aspect-square bg-muted/30 rounded-lg mb-3 overflow-hidden flex items-center justify-center p-2">
                    <img
                      src={f.arquivo ? pb.files.getURL(f, f.arquivo) : f.url_foto}
                      alt=""
                      className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <p className="text-xs font-semibold text-center truncate">
                    {f.descricao || f.tipo || 'Sem descrição'}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="upload" className="mt-2 overflow-y-auto">
            <form onSubmit={handleUpload} className="space-y-4 max-w-md mx-auto pt-4">
              <div>
                <Label>Descrição</Label>
                <Input required value={desc} onChange={(e) => setDesc(e.target.value)} />
              </div>
              <div>
                <Label>Arquivo Local</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <Label>Ou URL da Imagem</Label>
                <Input
                  value={urlFoto}
                  onChange={(e) => setUrlFoto(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <Button type="submit" disabled={uploading} className="w-full">
                <Upload className="w-4 h-4 mr-2" />{' '}
                {uploading ? 'Enviando...' : 'Adicionar à Galeria'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
