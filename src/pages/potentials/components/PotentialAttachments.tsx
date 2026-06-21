import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Paperclip, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import type { Potencial } from '@/types'

export function PotentialAttachments({
  potencial,
  onUpdate,
}: {
  potencial: Potencial | null
  onUpdate: (p: Potencial) => void
}) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !potencial) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => {
        formData.append('anexos+', file)
      })

      const updated = await pb.collection('potenciais').update(potencial.id, formData)
      onUpdate(updated as Potencial)
      toast.success('Arquivo(s) anexado(s) com sucesso.')
    } catch (err) {
      console.error('Failed to upload', err)
      toast.error('Erro ao anexar arquivo(s).')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = async (filename: string) => {
    if (!potencial) return
    try {
      const updated = await pb.collection('potenciais').update(potencial.id, {
        'anexos-': filename,
      })
      onUpdate(updated as Potencial)
      toast.success('Anexo removido com sucesso.')
    } catch (err) {
      console.error('Failed to remove attachment', err)
      toast.error('Erro ao remover anexo.')
    }
  }

  if (!potencial) {
    return (
      <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Anexos</h3>
        <p className="text-xs text-muted-foreground">
          Salve a cotação primeiro para adicionar anexos.
        </p>
      </div>
    )
  }

  const anexos = (potencial.anexos as string[]) || []

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Anexos</h3>
        <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleUpload} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" /> Anexar Arquivo
        </Button>
      </div>

      {anexos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {anexos.map((anexo) => (
            <div
              key={anexo}
              className="flex items-center justify-between bg-slate-50 p-2 rounded-md border text-xs group hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a
                  href={pb.files.getURL(potencial, anexo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline truncate"
                  title={anexo}
                >
                  {anexo}
                </a>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleRemove(anexo)}
                title="Remover anexo"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4 bg-slate-50 rounded-md border border-dashed">
          Nenhum arquivo anexado.
        </p>
      )}
    </div>
  )
}
