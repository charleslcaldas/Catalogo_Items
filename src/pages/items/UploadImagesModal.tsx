import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Upload,
  FileImage,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FolderUp,
  X,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'

interface ReportDetail {
  sku: string
  item_id_books: string
  nome_arquivo_imagem: string
  status: string
  message?: string
}

interface UploadReport {
  atualizados: number
  nao_encontrados: number
  erros_upload: number
  duplicados: number
  detalhes: ReportDetail[]
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'atualizado':
      return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
    case 'nao_encontrado':
      return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
    case 'erro':
      return <XCircle className="w-4 h-4 text-red-500 shrink-0" />
    case 'duplicado':
      return <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
    default:
      return null
  }
}

const STATUS_LABELS: Record<string, string> = {
  atualizado: 'Atualizado',
  nao_encontrado: 'Não Encontrado',
  erro: 'Erro',
  duplicado: 'Duplicado',
}

export function UploadImagesModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const [images, setImages] = useState<File[]>([])
  const [csvText, setCsvText] = useState('')
  const [csvName, setCsvName] = useState('')
  const [overwrite, setOverwrite] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [report, setReport] = useState<UploadReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setImages([])
    setCsvText('')
    setCsvName('')
    setOverwrite(false)
    setProgress(0)
    setReport(null)
    setError(null)
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      (f) =>
        f.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff?)$/i.test(f.name),
    )
    setImages((prev) => [...prev, ...files])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (folderInputRef.current) folderInputRef.current.value = ''
  }

  const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvName(file.name)
    const text = await file.text()
    setCsvText(text)
    setError(null)
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = () => {
    if (images.length === 0) {
      setError('Selecione pelo menos uma imagem.')
      return
    }
    if (!csvText) {
      setError('Selecione o arquivo CSV manifest.')
      return
    }

    const lines = csvText.trim().split('\n')
    if (lines.length < 2) {
      setError('O CSV deve conter pelo menos um cabeçalho e uma linha de dados.')
      return
    }
    const headers = lines[0]
      .toLowerCase()
      .split(',')
      .map((h) => h.trim())
    const required = ['sku', 'item_id_books', 'nome_arquivo_imagem']
    const missing = required.filter((r) => !headers.includes(r))
    if (missing.length > 0) {
      setError(`Colunas obrigatórias ausentes no CSV: ${missing.join(', ')}`)
      return
    }

    setUploading(true)
    setProgress(0)
    setError(null)
    setReport(null)

    const formData = new FormData()
    formData.append('manifest_csv', csvText)
    formData.append('overwrite', overwrite ? 'true' : 'false')
    for (const file of images) {
      formData.append('images', file, file.name)
    }

    // Pre-flight check: verify files are present in FormData before sending
    let preflightFileCount = 0
    const preflightFileNames: string[] = []
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        preflightFileCount++
        preflightFileNames.push(value.name)
        console.log(
          `[UploadImages] FormData file part: field="${key}", name="${value.name}", size=${value.size}, type="${value.type}"`,
        )
      } else {
        console.log(
          `[UploadImages] FormData text part: field="${key}", value="${String(value).substring(0, 100)}..."`,
        )
      }
    }
    console.log(
      `[UploadImages] Pre-flight: ${preflightFileCount} file(s) attached under field "images":`,
      preflightFileNames,
    )

    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.onload = () => {
      setUploading(false)
      try {
        const res = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) {
          setReport(res)
          if (res.atualizados > 0) {
            toast.success(`${res.atualizados} itens atualizados!`)
            onSuccess?.()
          }
        } else {
          let errorMsg = res.error || res.message || `Erro ${xhr.status}`
          if (res.files_received !== undefined) {
            errorMsg += ` (arquivos recebidos: ${res.files_received}`
            if (res.received_basenames && res.received_basenames.length > 0) {
              errorMsg += `: ${res.received_basenames.join(', ')}`
            }
            errorMsg += ')'
          }
          if (res.multipart_file_fields) {
            errorMsg += ` — campos multipart: ${res.multipart_file_fields.join(', ') || '(nenhum)'}`
          }
          if (res.file_read_error) {
            errorMsg += ` — erro de leitura: ${res.file_read_error}`
          }
          setError(errorMsg)
        }
      } catch {
        setError('Erro ao processar resposta do servidor.')
      }
    }

    xhr.onerror = () => {
      setUploading(false)
      setError('Erro de rede ao fazer upload.')
    }

    const url = `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/upload-item-images`
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', pb.authStore.token || '')
    xhr.send(formData)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose()
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload de Imagens</DialogTitle>
          <DialogDescription>
            Faça upload em massa de imagens e associe-as aos itens via CSV manifest.
          </DialogDescription>
        </DialogHeader>

        {report ? (
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Atualizados', value: report.atualizados, color: 'emerald' },
                { label: 'Duplicados', value: report.duplicados, color: 'blue' },
                { label: 'Não Encontrados', value: report.nao_encontrados, color: 'amber' },
                { label: 'Erros', value: report.erros_upload, color: 'red' },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`border rounded-lg p-3 text-center bg-${s.color}-50 border-${s.color}-200`}
                >
                  <p className={`text-2xl font-bold text-${s.color}-700`}>{s.value}</p>
                  <p className={`text-xs text-${s.color}-600`}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="text-left p-2 font-medium">SKU</th>
                      <th className="text-left p-2 font-medium">Item ID Books</th>
                      <th className="text-left p-2 font-medium">Imagem</th>
                      <th className="text-left p-2 font-medium">Mensagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.detalhes.map((d, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon status={d.status} />
                            <span className="text-xs">{STATUS_LABELS[d.status] || d.status}</span>
                          </div>
                        </td>
                        <td className="p-2 text-xs font-mono">{d.sku || '-'}</td>
                        <td className="p-2 text-xs font-mono">{d.item_id_books || '-'}</td>
                        <td className="p-2 text-xs truncate max-w-[120px]">
                          {d.nome_arquivo_imagem || '-'}
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">{d.message || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Imagens dos Produtos</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <FileImage className="w-4 h-4 mr-2" /> Selecionar Arquivos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => folderInputRef.current?.click()}
                  disabled={uploading}
                >
                  <FolderUp className="w-4 h-4 mr-2" /> Selecionar Pasta
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImagesChange}
              />
              <input
                ref={folderInputRef}
                type="file"
                {...({ webkitdirectory: '' } as any)}
                multiple
                className="hidden"
                onChange={handleImagesChange}
              />
              {images.length > 0 && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{images.length} imagem(ns) selecionada(s)</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setImages([])}
                      disabled={uploading}
                    >
                      Limpar
                    </Button>
                  </div>
                  <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {images.slice(0, 20).map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="truncate flex-1">{f.name}</span>
                        <button
                          onClick={() => removeImage(i)}
                          className="text-muted-foreground hover:text-destructive ml-2 shrink-0"
                          disabled={uploading}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {images.length > 20 && (
                      <p className="text-xs text-muted-foreground">
                        ... e mais {images.length - 20} arquivo(s)
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>CSV Manifest</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => csvInputRef.current?.click()}
                disabled={uploading}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {csvName || 'Selecionar CSV'}
              </Button>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCsvChange}
              />
              <p className="text-xs text-muted-foreground">
                Colunas obrigatórias: <code>sku</code>, <code>item_id_books</code>,{' '}
                <code>nome_arquivo_imagem</code>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="overwrite"
                checked={overwrite}
                onCheckedChange={(c) => setOverwrite(c === true)}
                disabled={uploading}
              />
              <Label htmlFor="overwrite" className="text-sm cursor-pointer">
                Sobrescrever imagens existentes
              </Label>
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Enviando...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={uploading || images.length === 0 || !csvText}
              className="w-full"
            >
              {uploading ? (
                'Enviando...'
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" /> Iniciar Upload
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
