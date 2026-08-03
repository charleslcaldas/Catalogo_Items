import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Image as ImageIcon, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { PhotoPickerModal } from '@/components/PhotoPickerModal'
import { getItemImageUrl } from '@/lib/item-image'
import { extractFieldErrors, getErrorMessage, type FieldErrors } from '@/lib/pocketbase/errors'

export default function FotoCatalogoDetail() {
  const { fotoId } = useParams<{ fotoId: string }>()
  const navigate = useNavigate()

  const [foto, setFoto] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const fetchData = useCallback(async () => {
    if (!fotoId) return
    try {
      const fotoRecord = await pb.collection('foto_catalogo').getOne(fotoId)
      setFoto(fotoRecord)
    } catch {
      toast.error('Foto não encontrada')
      navigate('/fotos-catalogo')
      return
    }
    try {
      const linkedItems = await pb.collection('itens').getFullList({
        filter: `foto_catalogo_id = "${fotoId}"`,
        expand: 'linha_id,acabamento_id,foto_catalogo_id',
      })
      setItems(linkedItems)
      setSelectedIds(new Set())
    } catch {
      toast.error('Erro ao buscar itens')
    } finally {
      setLoading(false)
    }
  }, [fotoId, navigate])

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  useRealtime('itens', () => {
    fetchData()
  })

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === items.length ? new Set() : new Set(items.map((i) => i.id)))
  }

  const handleBulkUpdate = async (newFotoId: string) => {
    setUpdating(true)
    setFieldErrors({})
    try {
      const res = await pb.send('/backend/v1/foto-catalogo/bulk-update', {
        method: 'POST',
        body: JSON.stringify({
          itemIds: Array.from(selectedIds),
          fotoCatalogoId: newFotoId,
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      const count = res.updated || 0
      toast.success(`${count} ${count === 1 ? 'item atualizado' : 'itens atualizados'} com sucesso`)
      setPickerOpen(false)
      await fetchData()
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
      toast.error(getErrorMessage(err))
    } finally {
      setUpdating(false)
    }
  }

  const fotoUrl = foto?.arquivo
    ? pb.files.getURL(foto, foto.arquivo)
    : foto?.url_foto || 'https://img.usecurling.com/p/400/400?q=photo'

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/fotos-catalogo')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-lg overflow-hidden border bg-muted shrink-0">
            <img src={fotoUrl} alt={foto?.descricao || ''} className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {foto?.descricao || 'Foto sem descrição'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {[
                foto?.tipo && `Tipo: ${foto.tipo}`,
                foto?.subtipo && `Subtipo: ${foto.subtipo}`,
                foto?.tamanho && `Tamanho: ${foto.tamanho}`,
              ]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? 'item vinculado' : 'itens vinculados'}
        </p>
        {selectedIds.size > 0 && (
          <Button onClick={() => setPickerOpen(true)} disabled={updating}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Trocar foto ({selectedIds.size})
          </Button>
        )}
      </div>

      {fieldErrors.foto_catalogo_id && (
        <p className="text-sm text-destructive">{fieldErrors.foto_catalogo_id}</p>
      )}

      {items.length === 0 ? (
        <div className="py-12 text-center border rounded-xl bg-card border-dashed">
          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-3" />
          <p className="text-muted-foreground">Nenhum item vinculado a esta foto</p>
        </div>
      ) : (
        <div className="border rounded-xl bg-card overflow-x-auto shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === items.length && items.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Item ID Books</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-20">Imagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.sku}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.item_id_books || '-'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={item.descr_pt}>
                    {item.descr_pt || item.descricao_curta || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="w-12 h-12 rounded bg-muted overflow-hidden border">
                      <img
                        src={getItemImageUrl(item, 100)}
                        alt={item.sku}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PhotoPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleBulkUpdate}
        excludeId={fotoId}
      />
    </div>
  )
}
