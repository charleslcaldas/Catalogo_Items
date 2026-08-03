import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, Image as ImageIcon } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'

export function PhotoPickerModal({
  open,
  onOpenChange,
  onSelect,
  excludeId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSelect: (fotoId: string) => void
  excludeId?: string
}) {
  const [fotos, setFotos] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open) {
      pb.collection('foto_catalogo')
        .getFullList({ sort: '-created' })
        .then((res: any) => setFotos(res))
        .catch(() => toast.error('Erro ao carregar fotos'))
    }
  }, [open])

  const filtered = fotos
    .filter((f) => f.id !== excludeId)
    .filter((f) => {
      const text = `${f.descricao || ''} ${f.tipo || ''} ${f.subtipo || ''}`.toLowerCase()
      return text.includes(search.toLowerCase())
    })

  const getThumb = (f: any) => {
    if (f.arquivo) return pb.files.getURL(f, f.arquivo, { thumb: '200x200' })
    if (f.url_foto) return f.url_foto
    return ''
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar Nova Foto</DialogTitle>
        </DialogHeader>
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
          {filtered.length === 0 ? (
            <div className="col-span-full py-8 text-center text-muted-foreground">
              Nenhuma foto disponível.
            </div>
          ) : (
            filtered.map((f) => {
              const thumb = getThumb(f)
              return (
                <div
                  key={f.id}
                  className="border bg-card rounded-xl p-3 cursor-pointer hover:border-primary hover:shadow-md transition-all group flex flex-col"
                  onClick={() => {
                    onSelect(f.id)
                    onOpenChange(false)
                  }}
                >
                  <div className="aspect-square bg-muted/30 rounded-lg mb-3 overflow-hidden flex items-center justify-center p-2">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground opacity-30" />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-center truncate">
                    {f.descricao || f.tipo || 'Sem descrição'}
                  </p>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
