import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Check, CheckCircle2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

const PriceCell = ({
  cotacaoF,
  item,
  cotacaoI,
  allCotacoesIParaItem,
  onPriceChange,
  onSetWinner,
}: any) => {
  const [val, setVal] = useState('')

  useEffect(() => {
    if (cotacaoI?.preco_ofertado !== undefined && cotacaoI.preco_ofertado !== null) {
      setVal(cotacaoI.preco_ofertado.toString().replace('.', ','))
    }
  }, [cotacaoI?.preco_ofertado])

  const handleBlur = () => {
    if (val === '') return
    const str = String(val).replace(',', '.')
    const num = parseFloat(str)
    if (isNaN(num)) return
    if (num !== cotacaoI?.preco_ofertado) {
      onPriceChange(cotacaoF.id, item.item_id, num, cotacaoI?.id)
      setVal(num.toString().replace('.', ','))
    }
  }

  const isWinner = cotacaoI?.vencedor

  const validPrices = allCotacoesIParaItem
    .map((c: any) => c.preco_ofertado)
    .filter((p: number) => p > 0)
  const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : null
  const isLowest = cotacaoI?.preco_ofertado && cotacaoI.preco_ofertado === lowestPrice

  return (
    <div
      className={cn(
        'flex flex-col gap-2 p-2 rounded-md border transition-colors',
        isLowest ? 'bg-green-50/50 border-green-300' : 'bg-card border-transparent',
      )}
    >
      <Input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        placeholder="0,00"
        className="h-8 text-right font-mono"
        disabled={cotacaoF.status === 'finalizada'}
      />
      <Button
        variant={isWinner ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSetWinner(cotacaoF.id, item.item_id, cotacaoI?.id)}
        disabled={cotacaoF.status === 'finalizada'}
        className={cn('w-full text-xs h-7', isWinner && 'bg-green-600 hover:bg-green-700')}
      >
        {isWinner ? (
          <>
            <CheckCircle2 className="w-3 h-3 mr-1" /> Vencedor
          </>
        ) : (
          'Selecionar'
        )}
      </Button>
    </div>
  )
}

export default function QuotationMatrix() {
  const [searchParams] = useSearchParams()
  const potencialId =
    searchParams.get('id') || searchParams.get('potencialId') || searchParams.get('potencial_id')
  const { toast } = useToast()

  const [potencialItens, setPotencialItens] = useState<any[]>([])
  const [cotacoesF, setCotacoesF] = useState<any[]>([])
  const [cotacoesI, setCotacoesI] = useState<any[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [fornecedores, setFornecedores] = useState<any[]>([])

  const [selectedFornecedor, setSelectedFornecedor] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)

  const loadData = async () => {
    if (!potencialId) return
    try {
      const [pItens, cF, cI, forn] = await Promise.all([
        pb
          .collection('potencial_itens')
          .getFullList({
            filter: `potencial_id="${potencialId}"`,
            expand: 'item_id',
            sort: 'ordem',
          }),
        pb
          .collection('cotacoes_fornecedor')
          .getFullList({ filter: `potencial_id="${potencialId}"`, expand: 'fornecedor_id' }),
        pb
          .collection('cotacoes_itens')
          .getFullList({ filter: `cotacao_fornecedor_id.potencial_id="${potencialId}"` }),
        pb.collection('fornecedores').getFullList({ filter: 'ativo=true', sort: 'nome' }),
      ])
      setPotencialItens(pItens)
      setCotacoesF(cF)
      setCotacoesI(cI)
      setFornecedores(forn)

      const itemIds = pItens.map((i) => i.item_id)
      if (itemIds.length > 0) {
        const hist = await pb.collection('historico_precos').getFullList({
          filter: itemIds.map((id) => `item_id="${id}"`).join(' || '),
          sort: '-data_cotacao',
        })
        setHistorico(hist)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [potencialId])
  useRealtime('potencial_itens', loadData)
  useRealtime('cotacoes_fornecedor', loadData)
  useRealtime('cotacoes_itens', loadData)

  const handleAddFornecedor = async () => {
    if (!potencialId || !selectedFornecedor) return
    try {
      await pb.collection('cotacoes_fornecedor').create({
        potencial_id: potencialId,
        fornecedor_id: selectedFornecedor,
        status: 'pendente',
        data_solicitacao: new Date().toISOString(),
      })
      setIsAddOpen(false)
      setSelectedFornecedor('')
      toast({ title: 'Fabricante adicionado' })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleSetWinner = async (cotacaoFId: string, itemId: string, cotacaoIId?: string) => {
    try {
      const currentWinner = cotacoesI.find((c) => c.item_id === itemId && c.vencedor)
      if (currentWinner && currentWinner.id !== cotacaoIId) {
        await pb.collection('cotacoes_itens').update(currentWinner.id, { vencedor: false })
      }
      if (cotacaoIId) {
        await pb.collection('cotacoes_itens').update(cotacaoIId, { vencedor: true })
      } else {
        await pb.collection('cotacoes_itens').create({
          cotacao_fornecedor_id: cotacaoFId,
          item_id: itemId,
          preco_ofertado: 0,
          vencedor: true,
        })
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handlePriceChange = async (
    cotacaoFId: string,
    itemId: string,
    price: number,
    cotacaoIId?: string,
  ) => {
    try {
      if (cotacaoIId) {
        await pb.collection('cotacoes_itens').update(cotacaoIId, { preco_ofertado: price })
      } else {
        await pb.collection('cotacoes_itens').create({
          cotacao_fornecedor_id: cotacaoFId,
          item_id: itemId,
          preco_ofertado: price,
          vencedor: false,
        })
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleFinalize = async () => {
    try {
      const pending = cotacoesF.filter((c) => c.status !== 'finalizada')
      if (pending.length === 0)
        return toast({ title: 'Aviso', description: 'Todas as cotações já estão finalizadas.' })
      await Promise.all(
        pending.map((c) =>
          pb.collection('cotacoes_fornecedor').update(c.id, { status: 'finalizada' }),
        ),
      )
      toast({ title: 'Cotações Finalizadas', description: 'O histórico de preços foi atualizado.' })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const totals = useMemo(() => {
    let vendaTotal = 0
    let custoTotal = 0

    potencialItens.forEach((pi) => {
      const qtd = pi.quantidade || 0
      const precoVenda = pi.preco_unitario || 0
      vendaTotal += qtd * precoVenda

      const winner = cotacoesI.find((c) => c.item_id === pi.item_id && c.vencedor)
      if (winner) {
        custoTotal += qtd * (winner.preco_ofertado || 0)
      }
    })

    const margin = vendaTotal > 0 ? ((vendaTotal - custoTotal) / vendaTotal) * 100 : 0
    return { vendaTotal, custoTotal, margin }
  }, [potencialItens, cotacoesI])

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (!potencialId) return <div className="p-4 text-center">Potencial não encontrado.</div>

  const availableFornecedores = fornecedores.filter(
    (f) => !cotacoesF.some((cf) => cf.fornecedor_id === f.id),
  )

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center bg-card p-4 border rounded-xl shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Matriz de Cotações</h2>
          <p className="text-muted-foreground text-sm">
            Compare e selecione as melhores ofertas dos fabricantes.
          </p>
        </div>
        <div className="flex space-x-3">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Fabricante
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Selecione um Fabricante</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Select value={selectedFornecedor} onValueChange={setSelectedFornecedor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                    {availableFornecedores.length === 0 && (
                      <SelectItem value="none" disabled>
                        Nenhum fabricante disponível
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAddFornecedor} disabled={!selectedFornecedor}>
                  Adicionar à Cotação
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            onClick={handleFinalize}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={cotacoesF.length === 0}
          >
            <Check className="w-4 h-4 mr-2" /> Finalizar Cotações
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 border rounded-xl bg-card shadow-sm flex flex-col justify-center">
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Preço de Venda (Total)
          </div>
          <div className="text-3xl font-bold font-mono">R$ {formatCurrency(totals.vendaTotal)}</div>
        </div>
        <div className="p-5 border rounded-xl bg-card shadow-sm flex flex-col justify-center">
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Custo Selecionado (Total)
          </div>
          <div className="text-3xl font-bold font-mono">R$ {formatCurrency(totals.custoTotal)}</div>
        </div>
        <div
          className={cn(
            'p-5 border rounded-xl shadow-sm flex flex-col justify-center',
            totals.margin >= 0 ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200',
          )}
        >
          <div
            className={cn(
              'text-sm font-medium mb-1',
              totals.margin >= 0 ? 'text-green-700' : 'text-red-700',
            )}
          >
            Margem de Lucro Estimada
          </div>
          <div
            className={cn(
              'text-3xl font-bold',
              totals.margin >= 0 ? 'text-green-700' : 'text-red-700',
            )}
          >
            {totals.margin.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto border rounded-xl shadow-sm bg-card">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="min-w-[250px] font-semibold">Item</TableHead>
              <TableHead className="font-semibold text-center w-24">Qtd</TableHead>
              <TableHead className="font-semibold text-right min-w-[120px]">Último Preço</TableHead>
              <TableHead className="font-semibold text-right min-w-[120px]">Menor Preço</TableHead>
              {cotacoesF.map((cf) => (
                <TableHead key={cf.id} className="min-w-[180px] bg-muted/80 border-l border-r-0">
                  <div className="flex flex-col items-center py-2">
                    <span
                      className="font-bold text-foreground truncate max-w-[160px]"
                      title={cf.expand?.fornecedor_id?.nome}
                    >
                      {cf.expand?.fornecedor_id?.nome}
                    </span>
                    {cf.status === 'finalizada' && (
                      <Badge
                        variant="secondary"
                        className="mt-1 text-[10px] h-4 bg-muted-foreground/20 text-muted-foreground"
                      >
                        Finalizada
                      </Badge>
                    )}
                    {cf.status !== 'finalizada' && (
                      <Badge
                        variant="outline"
                        className="mt-1 text-[10px] h-4 border-amber-300 text-amber-700 bg-amber-50"
                      >
                        Pendente
                      </Badge>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {potencialItens.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4 + cotacoesF.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  Nenhum item adicionado a este potencial.
                </TableCell>
              </TableRow>
            ) : (
              potencialItens.map((pi) => {
                const itemHist = historico.filter((h) => h.item_id === pi.item_id)
                const lastPrice = itemHist[0]?.preco
                const lowestPrice =
                  itemHist.length > 0 ? Math.min(...itemHist.map((h) => h.preco)) : undefined
                const allCI = cotacoesI.filter((c) => c.item_id === pi.item_id)

                return (
                  <TableRow key={pi.id} className="group hover:bg-transparent">
                    <TableCell className="align-top py-4">
                      <div className="font-semibold text-sm">{pi.expand?.item_id?.sku}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-1 pr-4">
                        {pi.expand?.item_id?.descricao_curta}
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4 text-center">
                      <span className="font-medium text-lg">{pi.quantidade}</span>{' '}
                      <span className="text-xs text-muted-foreground">
                        {pi.unidade_medida || 'UN'}
                      </span>
                    </TableCell>
                    <TableCell className="align-top py-4 text-right">
                      {lastPrice ? (
                        <span className="font-mono text-sm text-muted-foreground">
                          R$ {formatCurrency(lastPrice)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top py-4 text-right">
                      {lowestPrice ? (
                        <span className="font-mono text-sm text-green-600 font-medium">
                          R$ {formatCurrency(lowestPrice)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {cotacoesF.map((cf) => {
                      const ci = cotacoesI.find(
                        (c) => c.cotacao_fornecedor_id === cf.id && c.item_id === pi.item_id,
                      )
                      return (
                        <TableCell
                          key={cf.id}
                          className="align-top py-3 px-3 border-l bg-muted/5 group-hover:bg-muted/10 transition-colors"
                        >
                          <PriceCell
                            cotacaoF={cf}
                            item={pi}
                            cotacaoI={ci}
                            allCotacoesIParaItem={allCI}
                            onPriceChange={handlePriceChange}
                            onSetWinner={handleSetWinner}
                          />
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
