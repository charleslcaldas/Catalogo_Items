import { Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormattedInput } from '@/components/FormattedInput'
import { Badge } from '@/components/ui/badge'
import { getContrastColor, cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { SelectedItemRecord, SelectedItemData } from '../AddItemsToPotential'
import pb from '@/lib/pocketbase/client'

interface SelectedItemsTableProps {
  selectedItems: SelectedItemRecord[]
  handleUpdateItem: (id: string, field: keyof SelectedItemData, value: string) => void
  handleRemoveItem: (id: string) => void
  handleMoveUp: (index: number) => void
  handleMoveDown: (index: number) => void
  setIsSelecting: (selecting: boolean) => void
  lastOfferedPrices: Record<string, number>
}

// Fórmula aprovada: venda = compra / (1 - margem/100). Sem markup invertido.
const computeVendaFromMargem = (compra: number, margem: number): number => {
  if (!isFinite(compra) || !isFinite(margem)) return compra
  if (margem >= 100) return compra
  return compra / (1 - margem / 100)
}

export function SelectedItemsTable({
  selectedItems,
  handleUpdateItem,
  handleRemoveItem,
  handleMoveUp,
  handleMoveDown,
  setIsSelecting,
  lastOfferedPrices,
}: SelectedItemsTableProps) {
  if (selectedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground bg-white">
        <p className="mb-3 text-sm">Nenhum item selecionado para esta cotação.</p>
        <Button variant="outline" size="sm" onClick={() => setIsSelecting(true)}>
          Adicionar Itens
        </Button>
      </div>
    )
  }

  // minDec/maxDec: exibição exata — o total da linha usa a mesma precisão do
  // unitário exibido/salvo, sem casas ocultas.
  const formatCurrency = (value: number | '', minDec = 2, maxDec = 3, currency = 'USD') => {
    if (value === '') return '-'
    const num = Number(value)
    return isNaN(num)
      ? '-'
      : `${currency} ${num.toLocaleString('en-US', { minimumFractionDigits: minDec, maximumFractionDigits: maxDec })}`
  }

  // Precisão por linha (2 ou 3 casas). Reduzir para 2 arredonda o preço para
  // que o valor exibido continue sendo exatamente o salvo.
  const handlePrecisionChange = async (record: SelectedItemRecord, value: string) => {
    const p = value === '3' ? 3 : 2
    const unitRaw = Number(record.data.preco_unitario)
    const rounded = p === 2 && Number.isFinite(unitRaw) ? Number(unitRaw.toFixed(2)) : unitRaw
    handleUpdateItem(record.id, 'precisao_preco', String(p))
    if (p === 2 && Number.isFinite(unitRaw)) {
      handleUpdateItem(record.id, 'preco_unitario', String(rounded))
    }
    if (record.recordId && record.recordId.length === 15) {
      const payload: Record<string, number> = { precisao_preco: p }
      if (p === 2 && Number.isFinite(unitRaw)) payload.preco_unitario = rounded
      try {
        await pb.collection('potencial_itens').update(record.recordId, payload)
      } catch (err) {
        console.error('Auto-save precision failed', err)
      }
    }
  }

  const handleQuantityBlur = async (recordId: string | undefined, quantidade: string | number) => {
    if (recordId && recordId.length === 15) {
      try {
        await pb
          .collection('potencial_itens')
          .update(recordId, { quantidade: Number(quantidade) || 0 })
      } catch (err) {
        console.error('Auto-save quantity failed', err)
      }
    }
  }

  const handlePriceBlur = async (recordId: string | undefined, preco: string | number) => {
    if (recordId && recordId.length === 15) {
      try {
        await pb
          .collection('potencial_itens')
          .update(recordId, { preco_unitario: Number(preco) || 0 })
      } catch (err) {
        console.error('Auto-save price failed', err)
      }
    }
  }

  // A margem global é controlada SOMENTE pelo comando único no cabeçalho da
  // tela (PotentialDetailsWrapper) — não há controle duplicado aqui.

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="flex items-center justify-end p-2 border-b bg-slate-50/50 shrink-0">
        <div className="text-xs text-muted-foreground font-medium pr-2">
          {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'itens'}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <Table className="w-full">
          <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
            <TableRow className="h-8">
              <TableHead className="w-10 px-1"></TableHead>
              <TableHead className="w-24 text-[11px] px-4">SKU</TableHead>
              <TableHead className="w-auto text-[11px]">Descrição Curta</TableHead>
              <TableHead className="w-20 text-[11px]">Tamanho</TableHead>
              <TableHead className="w-24 text-[11px]">Acabamento</TableHead>
              <TableHead className="w-16 text-[11px] text-center">Unidade</TableHead>
              <TableHead className="w-20 text-[11px]">Quant.</TableHead>
              <TableHead className="w-24 text-[11px] text-right">
                <Tooltip>
                  <TooltipTrigger className="cursor-help underline decoration-dashed underline-offset-2">
                    Último Preço Ofertado
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-semibold">Último Preço Ofertado ao Cliente</p>
                    <p className="text-[10px] text-muted-foreground mt-1 max-w-[150px] leading-tight">
                      Preço mais recente ofertado a clientes em outras cotações.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="w-24 text-[11px] text-right text-amber-600">
                <Tooltip>
                  <TooltipTrigger className="cursor-help underline decoration-dashed underline-offset-2">
                    Preço de Compra Selecionado
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-semibold">Preço de Compra Selecionado</p>
                    <p className="text-[10px] text-muted-foreground mt-1 max-w-[170px] leading-tight">
                      Preço da oferta escolhida para este item na cotação de fabricantes.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="w-24 text-[11px] text-right">Margem de Venda (%)</TableHead>
              <TableHead className="w-28 text-[11px] text-right">Preço de Venda</TableHead>
              <TableHead className="w-14 text-[11px] text-center">
                <Tooltip>
                  <TooltipTrigger className="cursor-help underline decoration-dashed underline-offset-2">
                    Prec.
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-semibold">Precisão do preço</p>
                    <p className="text-[10px] text-muted-foreground mt-1 max-w-[160px] leading-tight">
                      Casas decimais (2 ou 3) usadas para exibir e salvar o preço de venda desta
                      linha.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="w-24 text-[11px] text-right">Total</TableHead>
              <TableHead className="w-10 text-center text-[11px]">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedItems.map((record, index) => {
              const { id, data } = record
              // Precisão por linha (2 ou 3 casas); fallback 2 quando ausente/vazia.
              const precisao = data.precisao_preco === 3 ? 3 : 2
              // O total usa EXATAMENTE o unitário exibido/salvo, na mesma precisão.
              const unitario =
                typeof data.preco_unitario === 'number'
                  ? Number(data.preco_unitario.toFixed(precisao))
                  : 0
              const total =
                Math.round((Number(data.quantidade) || 0) * Math.round(unitario * 1000)) / 1000

              const acabamento = data.item.expand?.acabamento_id
              const descricao = data.item.descricao_curta || data.item.descr_pt || '-'

              return (
                <TableRow key={id} className="h-10 py-0 group">
                  <TableCell className="px-1 py-1 w-10 align-middle">
                    <div className="flex flex-col gap-0 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === selectedItems.length - 1}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="py-1 text-[10px] font-normal px-4 font-mono whitespace-nowrap">
                    {data.item.sku || '-'}
                  </TableCell>
                  <TableCell className="py-1 text-[11px] whitespace-normal leading-tight">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            data.item.descricao_extra
                              ? 'cursor-help underline decoration-dashed underline-offset-2'
                              : 'cursor-default',
                          )}
                        >
                          {descricao}
                        </span>
                      </TooltipTrigger>
                      {data.item.descricao_extra && (
                        <TooltipContent className="max-w-xs text-xs">
                          {data.item.descricao_extra}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TableCell>
                  <TableCell className="py-1 text-[11px] whitespace-nowrap">
                    {data.item.tamanho || '-'}
                  </TableCell>
                  <TableCell className="py-1 text-xs">
                    {acabamento ? (
                      <Badge
                        style={{
                          backgroundColor: acabamento.cor_hex || '#e2e8f0',
                          color: getContrastColor(acabamento.cor_hex || '#e2e8f0'),
                        }}
                        className="whitespace-nowrap border-0 shadow-none font-medium px-2 py-0 h-5 text-[10px] rounded-full"
                      >
                        {acabamento.nome_pt}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="py-1 text-xs text-center text-muted-foreground bg-slate-50/50">
                    {data.unidade_medida || data.item.unidade || '-'}
                  </TableCell>
                  <TableCell className="py-1">
                    <FormattedInput
                      className="h-7 w-16 px-2 text-right text-xs bg-white"
                      value={data.quantidade}
                      onValueChange={(val) => {
                        if (Number(val) < 0) return
                        handleUpdateItem(id, 'quantidade', val)
                      }}
                      onBlur={() => handleQuantityBlur(record.recordId, data.quantidade)}
                    />
                  </TableCell>
                  <TableCell className="py-1 text-xs text-right font-mono whitespace-nowrap text-blue-600">
                    {lastOfferedPrices[data.item.id]
                      ? formatCurrency(lastOfferedPrices[data.item.id])
                      : '—'}
                  </TableCell>
                  <TableCell className="py-1 text-xs text-right font-mono text-amber-700 font-semibold whitespace-nowrap bg-amber-50/40">
                    {(() => {
                      const hasSnapshot =
                        typeof data.referencia_preco === 'number' && data.referencia_preco > 0
                      const refPrice = hasSnapshot ? data.referencia_preco : null
                      const refSupplier = data.referencia_fornecedor
                      const refDate = data.referencia_data

                      if (!refPrice) {
                        return (
                          <span className="font-mono text-xs text-amber-600/70 font-semibold">
                            N/A
                          </span>
                        )
                      }

                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col cursor-help items-end">
                              <span className="font-bold text-amber-700">
                                {formatCurrency(refPrice, 2, 3, data.moeda_compra || 'USD')}
                              </span>
                              {refSupplier ? (
                                <span
                                  className="text-[9px] text-amber-900/80 font-medium truncate max-w-[90px]"
                                  title={refSupplier}
                                >
                                  {refSupplier}
                                </span>
                              ) : (
                                <span className="text-[9px] text-muted-foreground">-</span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-semibold text-xs">
                              Preço de Compra Selecionado:{' '}
                              {formatCurrency(refPrice, 2, 3, data.moeda_compra || 'USD')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Fornecedor: {refSupplier || 'Não informado'}
                            </p>
                            {refDate && (
                              <p className="text-[10px] text-muted-foreground">
                                Data: {new Date(refDate).toLocaleDateString()}
                              </p>
                            )}
                            <p className="text-[10px] text-amber-600 font-medium mt-1">
                              Definido na Cotação de Fabricantes
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })()}
                  </TableCell>
                  <TableCell className="py-1 text-right">
                    <FormattedInput
                      className="h-7 w-20 px-2 text-right text-xs bg-white ml-auto"
                      value={(() => {
                        const hasSnapshot =
                          typeof data.referencia_preco === 'number' && data.referencia_preco > 0
                        const custo = hasSnapshot ? Number(data.referencia_preco) : 0
                        const venda = Number(data.preco_unitario)
                        if (venda > 0 && custo > 0) {
                          return ((1 - custo / venda) * 100).toFixed(2)
                        }
                        return ''
                      })()}
                      onValueChange={(val) => {
                        const m = parseFloat(val.replace(',', '.'))
                        const hasSnapshot =
                          typeof data.referencia_preco === 'number' && data.referencia_preco > 0
                        const custo = hasSnapshot ? Number(data.referencia_preco) : 0
                        if (custo === 0 || isNaN(m) || m < 0 || m >= 100) return
                        const newVenda = computeVendaFromMargem(custo, m)
                        handleUpdateItem(id, 'preco_unitario', newVenda.toFixed(precisao))
                      }}
                      onBlur={() => {
                        let parsed = parseFloat(String(data.preco_unitario))
                        if (isNaN(parsed)) parsed = 0
                        handlePriceBlur(record.recordId, parsed)
                      }}
                    />
                  </TableCell>
                  <TableCell className="py-1 text-right">
                    <FormattedInput
                      isPrice
                      fractionDigits={precisao}
                      prefixText={data.moeda_compra || 'USD'}
                      className="h-7 w-24 px-2 text-right text-xs bg-white font-bold ml-auto"
                      value={
                        typeof data.preco_unitario === 'number'
                          ? unitario.toFixed(precisao)
                          : data.preco_unitario
                      }
                      onValueChange={(val) => handleUpdateItem(id, 'preco_unitario', val)}
                      onBlur={() => {
                        let parsed = parseFloat(String(data.preco_unitario))
                        if (isNaN(parsed)) parsed = 0
                        const normalizado = Number(parsed.toFixed(precisao))
                        handleUpdateItem(id, 'preco_unitario', String(normalizado))
                        handlePriceBlur(record.recordId, normalizado)
                      }}
                    />
                  </TableCell>
                  <TableCell className="py-1 text-center">
                    <select
                      className="h-7 w-12 rounded-md border bg-white text-xs text-center"
                      title="Precisão do preço (casas decimais)"
                      value={precisao}
                      onChange={(e) => handlePrecisionChange(record, e.target.value)}
                    >
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </TableCell>
                  <TableCell className="py-1 text-xs font-semibold text-right whitespace-nowrap">
                    {formatCurrency(total, 2, precisao, data.moeda_compra || 'USD')}
                  </TableCell>
                  <TableCell className="py-1 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveItem(id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
