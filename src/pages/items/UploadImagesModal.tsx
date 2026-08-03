import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Upload, Loader2, CheckCircle2, XCircle, AlertTriangle, Copy } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ManifestRow {
  sku: string
  item_id_books: string
  imagem: string
}

interface ReportDetail {
  status: string
  sku: string
  item_id_books: string
  imagem: string
  mensagem: string
}

interface Report {
  atualizados: number
  duplicados: number
  naoEncontrados: number
  erros: number
  total: number
  detalhes: ReportDetail[]
}

function parseCSV(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQ = false
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]
    if (inQ) {
      if (c === '"' && clean[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQ = false
      } else {
        field += c
      }
    } else if (c === '"') {
      inQ = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') {
      field += c
    }
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function extractManifest(text: string): ManifestRow[] {
  const rows = parseCSV(text)
  if (rows.length < 2) return []
  const h = rows[0].map((x) => x.trim().toLowerCase())
  let sIdx = h.findIndex((x) => x === 'sku')
  let bIdx = h.findIndex((x) => x.includes('item') && x.includes('books'))
  let iIdx = h.findIndex((x) => x === 'imagem' || x === 'image' || x === 'foto')
  if (sIdx === -1) sIdx = 0
  if (bIdx === -1) bIdx = 1
  if (iIdx === -1) iIdx = 2
  return rows
    .slice(1)
    .filter((r) => r.length >= 3 && (r[sIdx]?.trim() || r[bIdx]?.trim()))
    .map((r) => ({
      sku: (r[sIdx] || '').trim(),
      item_id_books: (r[bIdx] || '').trim(),
      imagem: (r[iIdx] || '').trim(),
    }))
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  Atualizado: { icon: CheckCircle2, color: 'text-emerald-600' },
  Duplicado: { icon: Copy, color: 'text-blue-500' },
  'Não Encontrado': { icon: AlertTriangle, color: 'text-orange-500' },
  Erro: { icon: XCircle, color: 'text-red-500' },
}

export function UploadImagesModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [manifest, setManifest] = useState<ManifestRow[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [report, setReport] = useState<Report | null>(null)

  const reset = () => {
    setCsvFile(null)
    setImageFiles([])
    setManifest([])
    setReport(null)
    setProgress('')
  }

  const handleCsv = async (file: File) => {
    setCsvFile(file)
    setReport(null)
    const m = extractManifest(await file.text())
    setManifest(m)
    if (m.length === 0) toast.warning('Nenhum item encontrado no CSV')
    else toast.success(`${m.length} itens encontrados no CSV`)
  }

  const handleImages = (files: FileList | null) => {
    const arr = files ? Array.from(files) : []
    setImageFiles(arr)
    setReport(null)
    console.log(
      `[UploadImagesModal] ${arr.length} arquivos selecionados:`,
      arr.map((f) => f.name),
    )
    if (arr.length > 0) toast.success(`${arr.length} imagens selecionadas`)
  }

  const handleProcess = async () => {
    if (manifest.length === 0) return toast.error('Carregue um CSV válido')
    setProcessing(true)
    try {
      const uniqueNames = [...new Set(manifest.map((r) => r.imagem).filter(Boolean))]
      let uploaded = 0
      for (const name of uniqueNames) {
        setProgress(`Enviando imagens... (${uploaded + 1}/${uniqueNames.length})`)
        try {
          const escaped = name.replace(/"/g, '\\"')
          await pb.collection('foto_catalogo').getFirstListItem(`descricao = "${escaped}"`)
          uploaded++
          continue
        } catch {
          /* intentionally ignored */
        }
        const file = imageFiles.find((f) => f.name === name)
        if (!file) continue
        const fd = new FormData()
        fd.append('descricao', name)
        fd.append('arquivo', file)
        await pb.collection('foto_catalogo').create(fd)
        uploaded++
      }
      setProgress('Associando imagens aos itens...')
      const result = await pb.send('/backend/v1/upload-item-images', {
        method: 'POST',
        body: JSON.stringify({ rows: manifest }),
        headers: { 'Content-Type': 'application/json' },
      })
      setReport(result as Report)
      toast.success('Processamento concluído!')
      onSuccess()
    } catch (err: any) {
      toast.error('Erro: ' + (err.message || ''))
    } finally {
      setProcessing(false)
      setProgress('')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload de Imagens em Lote</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4">
          {!report && (
            <>
              <div className="space-y-2">
                <Label>1. Arquivo CSV (manifesto)</Label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleCsv(e.target.files[0])}
                />
                {csvFile && <p className="text-xs text-muted-foreground">{csvFile.name}</p>}
              </div>
              <div className="space-y-2">
                <Label>2. Arquivos de Imagem</Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImages(e.target.files)}
                />
                {imageFiles.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {imageFiles.length} imagens selecionadas
                  </p>
                )}
              </div>
              {manifest.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {manifest.length} itens no manifesto •{' '}
                  {new Set(manifest.map((r) => r.imagem).filter(Boolean)).size} imagens únicas
                </div>
              )}
              {progress && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> {progress}
                </div>
              )}
            </>
          )}
          {report && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Atualizados',
                    value: report.atualizados,
                    color: 'text-emerald-600 bg-emerald-50',
                  },
                  {
                    label: 'Duplicados',
                    value: report.duplicados,
                    color: 'text-blue-600 bg-blue-50',
                  },
                  {
                    label: 'Não Encontrados',
                    value: report.naoEncontrados,
                    color: 'text-orange-600 bg-orange-50',
                  },
                  { label: 'Erros', value: report.erros, color: 'text-red-600 bg-red-50' },
                ].map((s) => (
                  <div key={s.label} className={cn('rounded-lg p-3 text-center', s.color)}>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Status</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Item ID Books</TableHead>
                      <TableHead>Imagem</TableHead>
                      <TableHead>Mensagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.detalhes.map((d, i) => {
                      const cfg = statusConfig[d.status] || statusConfig['Erro']
                      const Icon = cfg.icon
                      return (
                        <TableRow key={i}>
                          <TableCell>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 text-xs font-medium',
                                cfg.color,
                              )}
                            >
                              <Icon className="w-3.5 h-3.5" /> {d.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{d.sku || '-'}</TableCell>
                          <TableCell className="text-xs font-mono">
                            {d.item_id_books || '-'}
                          </TableCell>
                          <TableCell className="text-xs">{d.imagem || '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {d.mensagem}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          {report ? (
            <Button
              onClick={() => {
                reset()
                onOpenChange(false)
              }}
            >
              Fechar
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  reset()
                  onOpenChange(false)
                }}
                disabled={processing}
              >
                Cancelar
              </Button>
              <Button onClick={handleProcess} disabled={processing || manifest.length === 0}>
                {processing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {processing ? 'Processando...' : 'Processar'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
