import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import * as XLSX from 'xlsx'
import pb from '@/lib/pocketbase/client'
import { useData } from '@/contexts/data-context'
import { toast } from '@/hooks/use-toast'
import { UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

const parseNumber = (val: any) => {
  if (typeof val === 'number') return val
  if (!val) return 0
  let cleanVal = String(val).trim()
  if (cleanVal.includes('.') && cleanVal.includes(','))
    cleanVal = cleanVal.replace(/\./g, '').replace(',', '.')
  else if (cleanVal.includes(',')) cleanVal = cleanVal.replace(',', '.')
  const parsed = parseFloat(cleanVal)
  return isNaN(parsed) ? 0 : parsed
}

export function NcmImportModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [stats, setStats] = useState({ total: 0, processed: 0, successes: 0, errors: 0 })
  const { reloadMetadata } = useData()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processImport = async () => {
    if (!file) return
    setStatus('loading')
    setStats({ total: 0, processed: 0, successes: 0, errors: 0 })

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet)

      setStats((s) => ({ ...s, total: rows.length }))

      const ncmList = await pb.collection('ncm').getFullList()
      const ncmByCodigo = new Map(ncmList.map((n) => [n.codigo, n.id]))

      let successes = 0,
        errors = 0
      const errorDetails: string[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (i % 10 === 0 || i === rows.length - 1) {
          setStats((s) => ({ ...s, processed: i + 1 }))
        }

        const codigo = String(row['codigo'] || row['NCM'] || row['Codigo'] || '').trim()
        if (!codigo) {
          errors++
          errorDetails.push(`Linha ${i + 2}: Código NCM é obrigatório.`)
          continue
        }

        const itemData = {
          codigo,
          ii: parseNumber(row['ii'] || row['II'] || 0),
          ipi: parseNumber(row['ipi'] || row['IPI'] || 0),
          pis: parseNumber(row['pis'] || row['PIS'] || 0),
          cofins: parseNumber(row['cofins'] || row['COFINS'] || 0),
          observacoes: String(
            row['observacoes'] || row['Observações'] || row['observacao'] || '',
          ).trim(),
        }

        try {
          if (ncmByCodigo.has(codigo)) {
            await pb.collection('ncm').update(ncmByCodigo.get(codigo)!, itemData)
          } else {
            const created = await pb.collection('ncm').create(itemData)
            ncmByCodigo.set(codigo, created.id)
          }
          successes++
        } catch (err: any) {
          errors++
          errorDetails.push(`Linha ${i + 2} (${codigo}): ${err.message}`)
        }
      }

      await pb.collection('logs_importacao').create({
        arquivo_nome: file.name,
        total_processado: rows.length,
        sucessos: successes,
        duplicados: 0,
        erros: errors,
        detalhes_erros: errorDetails.length > 0 ? errorDetails : null,
      })

      setStats({ total: rows.length, processed: rows.length, successes, errors })
      setStatus('success')
      await reloadMetadata()
      toast({ title: 'Importação de NCM concluída' })
    } catch (err: any) {
      console.error(err)
      setStatus('error')
      toast({ variant: 'destructive', title: 'Erro na importação', description: err.message })
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    if (status === 'success') {
      setStatus('idle')
      setFile(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar NCM via CSV/Excel</DialogTitle>
          <DialogDescription>
            Selecione uma planilha contendo as colunas: codigo, ii, ipi, pis, cofins, observacoes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <Input
            type="file"
            accept=".xlsx, .xls, .csv"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setFile(e.target.files[0])
                setStatus('idle')
              }
            }}
            disabled={status === 'loading'}
          />

          {status === 'loading' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Processando...</span>
                <span>
                  {stats.processed} / {stats.total}
                </span>
              </div>
              <Progress
                value={stats.total > 0 ? (stats.processed / stats.total) * 100 : 0}
                className="h-2"
              />
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
              <CheckCircle2 className="h-6 w-6" />
              <div className="text-sm">
                <p className="font-medium">Importação concluída!</p>
                <p>
                  Sucessos: {stats.successes} | Erros: {stats.errors}
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-3 text-destructive bg-destructive/10 p-4 rounded-lg border border-destructive/20 text-sm">
              <AlertCircle className="h-6 w-6" />
              <span className="font-medium">
                Erro ao processar o arquivo. Verifique o formato e tente novamente.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
          <Button onClick={processImport} disabled={!file || status === 'loading'}>
            <UploadCloud className="mr-2 h-4 w-4" /> Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
