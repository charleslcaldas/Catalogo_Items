import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, CheckCircle2, AlertCircle, FileType2, ChevronLeft } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function parseCSV(text: string): Record<string, string>[] {
  const rows: Record<string, string>[] = []
  let currentHeader: string[] = []
  let currentObj: Record<string, string> = {}
  let currentCell = ''
  let inQuotes = false
  let rowIdx = 0
  let colIdx = 0

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      if (rowIdx === 0) currentHeader.push(currentCell.trim())
      else currentObj[currentHeader[colIdx]] = currentCell.trim()
      currentCell = ''
      colIdx++
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      if (char === '\r') i++

      if (rowIdx === 0) {
        currentHeader.push(currentCell.trim())
      } else {
        currentObj[currentHeader[colIdx]] = currentCell.trim()
        if (Object.keys(currentObj).some((k) => currentObj[k])) {
          rows.push({ ...currentObj })
        }
      }
      currentObj = {}
      currentCell = ''
      colIdx = 0
      rowIdx++
    } else {
      currentCell += char
    }
  }

  if (currentCell || colIdx > 0) {
    if (rowIdx === 0) {
      currentHeader.push(currentCell.trim())
    } else {
      currentObj[currentHeader[colIdx]] = currentCell.trim()
      if (Object.keys(currentObj).some((k) => currentObj[k])) {
        rows.push({ ...currentObj })
      }
    }
  }

  return rows
}

export default function ImportPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [stats, setStats] = useState({
    total: 0,
    processed: 0,
    successes: 0,
    duplicates: 0,
    errors: 0,
  })
  const [summary, setSummary] = useState<{
    successes: number
    duplicates: number
    errors: number
    errorDetails: string[]
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setStatus('idle')
      setSummary(null)
      setStats({ total: 0, processed: 0, successes: 0, duplicates: 0, errors: 0 })
    }
  }

  const parseNumber = (val: string) => {
    if (!val) return 0
    let cleanVal = val.trim()
    if (cleanVal.includes('.') && cleanVal.includes(',')) {
      cleanVal = cleanVal.replace(/\./g, '').replace(',', '.')
    } else if (cleanVal.includes(',')) {
      cleanVal = cleanVal.replace(',', '.')
    }
    const parsed = parseFloat(cleanVal)
    return isNaN(parsed) ? 0 : parsed
  }

  const processImport = async () => {
    if (!file) return

    setStatus('loading')
    setStats({ total: 0, processed: 0, successes: 0, duplicates: 0, errors: 0 })
    setSummary(null)

    try {
      const text = await file.text()
      const rows = parseCSV(text)

      setStats((s) => ({ ...s, total: rows.length }))

      const [categoriasList, linhasList, acabamentosList, ncmList, itensList] = await Promise.all([
        pb.collection('categorias').getFullList(),
        pb.collection('linhas').getFullList(),
        pb.collection('acabamentos').getFullList(),
        pb.collection('ncm').getFullList(),
        pb.collection('itens').getFullList({ fields: 'sku,item_id_books' }),
      ])

      let categoryId = categoriasList.find((c) => c.nome_pt === 'Importado')?.id
      if (!categoryId) {
        const newCat = await pb.collection('categorias').create({ nome_pt: 'Importado' })
        categoryId = newCat.id
      }

      const cache = {
        linhas: new Map(linhasList.map((l) => [l.nome_pt?.toLowerCase(), l.id])),
        acabamentos: new Map(acabamentosList.map((a) => [a.codigo?.toLowerCase(), a.id])),
        ncm: new Map(ncmList.map((n) => [n.codigo?.toLowerCase(), n.id])),
        skus: new Set(itensList.map((i) => i.sku)),
        itemIds: new Set(itensList.map((i) => i.item_id_books).filter(Boolean)),
      }

      let successes = 0
      let duplicates = 0
      let errors = 0
      const errorDetails: string[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const sku = row['sku'] || row['SKU'] || ''
        const itemId = row['item_id_books'] || ''

        if (i % 5 === 0 || i === rows.length - 1) {
          setStats((s) => ({ ...s, processed: i + 1 }))
        }

        if (!sku || !itemId) {
          errors++
          errorDetails.push(`Linha ${i + 2}: SKU e item_id_books são obrigatórios`)
          continue
        }

        if (cache.skus.has(sku)) {
          duplicates++
          continue
        }

        if (cache.itemIds.has(itemId)) {
          duplicates++
          continue
        }

        try {
          const linhaNome = row['cf_linha_from_desc_geral_portugues_'] || row['cf_linha'] || ''
          let linhaId = ''
          if (linhaNome) {
            const lKey = linhaNome.toLowerCase()
            if (cache.linhas.has(lKey)) {
              linhaId = cache.linhas.get(lKey)!
            } else {
              const newLinha = await pb.collection('linhas').create({
                nome_pt: linhaNome,
                categoria_id: categoryId,
              })
              linhaId = newLinha.id
              cache.linhas.set(lKey, linhaId)
            }
          }

          const acabCodigo = row['acab_'] || row['acabamento'] || ''
          let acabId = ''
          if (acabCodigo) {
            const aKey = acabCodigo.toLowerCase()
            if (cache.acabamentos.has(aKey)) {
              acabId = cache.acabamentos.get(aKey)!
            } else {
              const newAcab = await pb.collection('acabamentos').create({
                codigo: acabCodigo,
                nome_pt: acabCodigo,
              })
              acabId = newAcab.id
              cache.acabamentos.set(aKey, acabId)
            }
          }

          const ncmCodigo = row['cf_ncm_from_desc_geral_portugues_'] || row['cf_ncm'] || ''
          let ncmId = ''
          if (ncmCodigo) {
            const nKey = ncmCodigo.toLowerCase()
            if (cache.ncm.has(nKey)) {
              ncmId = cache.ncm.get(nKey)!
            } else {
              const newNcm = await pb.collection('ncm').create({
                codigo: ncmCodigo,
              })
              ncmId = newNcm.id
              cache.ncm.set(nKey, ncmId)
            }
          }

          await pb.collection('itens').create({
            sku,
            descr_pt: row['desc_geral_portugues'] || '',
            descr_en: row['descr_geral_ingles'] || '',
            tamanho: row['tamanho'] || '',
            material: row['material_from_desc_geral_portugues_'] || '',
            preco_venda: parseNumber(row['rate']),
            preco_compra: parseNumber(row['purchase_rate']),
            item_id_books: itemId,
            foto_url: row['photo'] || '',
            linha_id: linhaId || undefined,
            acabamento_id: acabId || undefined,
            ncm_id: ncmId || undefined,
            sincronizado_com_zoho: true,
            data_sincronizacao: new Date().toISOString(),
            ativo: true,
          })

          cache.skus.add(sku)
          cache.itemIds.add(itemId)
          successes++
        } catch (err: any) {
          errors++
          errorDetails.push(`Linha ${i + 2} (${sku}): ${err.message || 'Erro desconhecido'}`)
        }
      }

      await pb.collection('logs_importacao').create({
        arquivo_nome: file.name,
        total_processado: rows.length,
        sucessos: successes,
        duplicados: duplicates,
        erros: errors,
        detalhes_erros: errorDetails.length > 0 ? errorDetails.slice(0, 100) : null,
      })

      setStats({ total: rows.length, processed: rows.length, successes, duplicates, errors })
      setSummary({ successes, duplicates, errors, errorDetails })
      setStatus('success')
      toast({
        title: 'Importação concluída',
        description: 'O processamento do arquivo foi finalizado.',
      })
    } catch (err: any) {
      setStatus('error')
      toast({
        variant: 'destructive',
        title: 'Erro na importação',
        description: err.message || 'Falha ao processar o arquivo.',
      })
    }
  }

  const progressPercentage = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Importar Produtos do Airtable</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full md:col-span-2">
          <CardHeader>
            <CardTitle>Upload de CSV</CardTitle>
            <CardDescription>
              Selecione o arquivo CSV exportado do Airtable. Os produtos serão importados e
              sincronizados com as tabelas de referência.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={status === 'loading'}
                className="cursor-pointer max-w-sm"
              />
              <Button
                onClick={processImport}
                disabled={!file || status === 'loading'}
                className="w-full sm:w-auto"
              >
                <UploadCloud className="mr-2 h-4 w-4" />
                {status === 'loading' ? 'Processando...' : 'Processar Importação'}
              </Button>
            </div>

            {status === 'loading' && (
              <div className="space-y-2 mt-6">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Processando...</span>
                  <span className="font-medium text-muted-foreground">
                    {stats.processed} de {stats.total}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            )}

            {status === 'success' && (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-4 rounded-lg border border-emerald-100 mt-4">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Sucesso! Importação concluída.</span>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-4 rounded-lg border border-destructive/20 mt-4">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">
                  Erro - tente novamente. Verifique se o formato do CSV está correto.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {summary && (
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Resumo da Importação</CardTitle>
            <CardDescription>
              Resultado final do processamento das {stats.total} linhas do arquivo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-emerald-600 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Importados com Sucesso
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {summary.successes}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-amber-600 flex items-center gap-2">
                      <FileType2 className="h-4 w-4" /> Ignorados (Duplicados)
                    </TableCell>
                    <TableCell className="text-right font-bold text-amber-600">
                      {summary.duplicates}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> Erros de Validação
                    </TableCell>
                    <TableCell className="text-right font-bold text-destructive">
                      {summary.errors}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {summary.errorDetails.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="text-sm font-semibold text-destructive">
                  Detalhes dos Erros (amostra):
                </h4>
                <div className="max-h-60 overflow-y-auto bg-muted/50 p-4 rounded-md text-xs font-mono space-y-2 border">
                  {summary.errorDetails.slice(0, 100).map((err, i) => (
                    <div key={i} className="text-muted-foreground">
                      {err}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              variant="default"
              onClick={() => navigate('/itens')}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar para Catálogo
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
