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
import * as XLSX from 'xlsx'

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

  const processImport = async () => {
    if (!file) return
    setStatus('loading')
    setStats({ total: 0, processed: 0, successes: 0, duplicates: 0, errors: 0 })
    setSummary(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet)

      setStats((s) => ({ ...s, total: rows.length }))

      const [categoriasList, linhasList, acabamentosList, ncmList, itensList] = await Promise.all([
        pb.collection('categorias').getFullList(),
        pb.collection('linhas').getFullList(),
        pb.collection('acabamentos').getFullList(),
        pb.collection('ncm').getFullList(),
        pb.collection('itens').getFullList({ fields: 'id,sku' }),
      ])

      let categoryId = categoriasList.find((c) => c.nome_pt === 'Importado')?.id
      if (!categoryId)
        categoryId = (await pb.collection('categorias').create({ nome_pt: 'Importado' })).id

      const cache = {
        linhas: new Map(linhasList.map((l) => [l.nome_pt?.toLowerCase(), l.id])),
        acabamentos: new Map(acabamentosList.map((a) => [a.codigo?.toLowerCase(), a.id])),
        ncm: new Map(ncmList.map((n) => [n.codigo?.toLowerCase(), n.id])),
        skus: new Map(itensList.map((i) => [i.sku, i.id])),
      }

      let successes = 0,
        duplicates = 0,
        errors = 0
      const errorDetails: string[] = []
      const processedSkusThisRun = new Set<string>()

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (i % 10 === 0 || i === rows.length - 1) setStats((s) => ({ ...s, processed: i + 1 }))

        const sku = String(row['sku'] || row['SKU'] || '').trim()
        if (!sku) {
          errors++
          errorDetails.push(`Linha ${i + 2}: SKU é obrigatório.`)
          continue
        }
        if (processedSkusThisRun.has(sku)) {
          duplicates++
          continue
        }
        processedSkusThisRun.add(sku)

        const descrPt = String(
          row['desc_geral_portugues'] || row['descr_pt'] || row['Descrição'] || '',
        ).trim()
        const linhaNome = String(
          row['cf_linha_from_desc_geral_portugues_'] ||
            row['cf_linha'] ||
            row['linha'] ||
            row['Linha'] ||
            '',
        ).trim()

        if (!descrPt || !linhaNome) {
          errors++
          errorDetails.push(`Linha ${i + 2} (${sku}): Descrição e Linha são obrigatórios.`)
          continue
        }

        try {
          let linhaId = cache.linhas.get(linhaNome.toLowerCase())
          if (!linhaId) {
            const newLinha = await pb
              .collection('linhas')
              .create({ nome_pt: linhaNome, categoria_id: categoryId })
            linhaId = newLinha.id
            cache.linhas.set(linhaNome.toLowerCase(), linhaId)
          }

          const acabCodigo = String(
            row['acab_'] || row['acabamento'] || row['Acabamento'] || '',
          ).trim()
          let acabId = acabCodigo ? cache.acabamentos.get(acabCodigo.toLowerCase()) : undefined
          if (acabCodigo && !acabId) {
            const newAcab = await pb
              .collection('acabamentos')
              .create({ codigo: acabCodigo, nome_pt: acabCodigo })
            acabId = newAcab.id
            cache.acabamentos.set(acabCodigo.toLowerCase(), acabId)
          }

          const ncmCodigo = String(
            row['cf_ncm_from_desc_geral_portugues_'] || row['cf_ncm'] || row['NCM'] || '',
          ).trim()
          let ncmId = ncmCodigo ? cache.ncm.get(ncmCodigo.toLowerCase()) : undefined
          if (ncmCodigo && !ncmId) {
            const newNcm = await pb.collection('ncm').create({ codigo: ncmCodigo })
            ncmId = newNcm.id
            cache.ncm.set(ncmCodigo.toLowerCase(), ncmId)
          }

          const itemData = {
            sku,
            linha_id: linhaId,
            descr_pt: descrPt,
            descr_en: String(row['descr_geral_ingles'] || row['descr_en'] || ''),
            tamanho: String(row['tamanho'] || row['Tamanho'] || ''),
            material: String(row['material_from_desc_geral_portugues_'] || row['material'] || ''),
            preco_venda: parseNumber(row['rate'] || row['preco_venda'] || row['Preço']),
            preco_compra: parseNumber(row['purchase_rate'] || row['preco_compra'] || row['Custo']),
            item_id_books: String(row['item_id_books'] || ''),
            foto_url: String(row['photo'] || row['foto_url'] || ''),
            acabamento_id: acabId,
            ncm_id: ncmId,
            sincronizado_com_zoho: true,
            data_sincronizacao: new Date().toISOString(),
            ativo: true,
          }

          if (cache.skus.has(sku)) {
            await pb.collection('itens').update(cache.skus.get(sku)!, itemData)
          } else {
            const created = await pb.collection('itens').create(itemData)
            cache.skus.set(sku, created.id)
          }
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
        detalhes_erros: errorDetails.length > 0 ? errorDetails : null,
      })

      setStats({ total: rows.length, processed: rows.length, successes, duplicates, errors })
      setSummary({ successes, duplicates, errors, errorDetails })
      setStatus('success')
      toast({
        title: 'Importação concluída',
        description: 'O processamento do arquivo foi finalizado.',
      })
    } catch (err: any) {
      console.error(err)
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
        <h2 className="text-3xl font-bold tracking-tight">Importar Produtos</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full md:col-span-2">
          <CardHeader>
            <CardTitle>Upload de Planilha</CardTitle>
            <CardDescription>
              Selecione o arquivo Excel (.xlsx, .xls) ou CSV. Os produtos serão importados ou
              atualizados e sincronizados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Input
                type="file"
                accept=".xlsx, .xls, .csv"
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
                  Erro - tente novamente. Verifique se o formato do arquivo está correto.
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
                      <CheckCircle2 className="h-4 w-4" /> Criados / Atualizados
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {summary.successes}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-amber-600 flex items-center gap-2">
                      <FileType2 className="h-4 w-4" /> Duplicados Ignorados (na planilha)
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
