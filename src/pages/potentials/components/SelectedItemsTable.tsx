import { useState } from 'react'
import { Trash2, ChevronUp, ChevronDown, Calculator, Percent } from 'lucide-react'
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
}

export function SelectedItemsTable({
  selectedItems,
  handleUpdateItem,
  handleRemoveItem,
  handleMoveUp,
  handleMoveDown,
  setIsSelecting,
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

  const formatCurrency = (value: number | '') => {
    if (value === '') return '-'
    const num = Number(value)
    return isNaN(num)
      ? '-'
      : `$ ${num.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`
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

  const [globalMargin, setGlobalMargin] = useState('')
  const [isApplying, setIsApplying] = useState(false)

  const handleApplyLineMargins = async () => {
    setIsApplying(true)
    const promises = []
    for (const record of selectedItems) {
      const custo = Number(record.data.referencia_preco) || 0
      if (custo > 0) {
        const margem = record.data.item.expand?.linha_id?.margem_padrao ?? 7.5
        const newVenda = margem < 100 ? custo / (1 - margem / 100) : custo
        if (record.recordId && record.recordId.length === 15) {
          promises.push(
            pb.collection('potencial_itens').update(record.recordId, { preco_unitario: newVenda }),
          )
        }
        handleUpdateItem(record.id, 'preco_unitario', newVenda.toFixed(3))
      }
    }
    await Promise.all(promises)
    setIsApplying(false)
  }

  const handleApplyGlobalMargin = async () => {
    const m = parseFloat(globalMargin)
    if (isNaN(m) || m >= 100 || m < 0) return
    setIsApplying(true)
    const promises = []
    for (const record of selectedItems) {
      const custo = Number(record.data.referencia_preco) || 0
      if (custo > 0) {
        const newVenda = custo / (1 - m / 100)
        if (record.recordId && record.recordId.length === 15) {
          promises.push(
            pb.collection('potencial_itens').update(record.recordId, { preco_unitario: newVenda }),
          )
        }
        handleUpdateItem(record.id, 'preco_unitario', newVenda.toFixed(3))
      }
    }
    await Promise.all(promises)
    setIsApplying(false)
    setGlobalMargin('')
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleApplyLineMargins}
            disabled={isApplying || selectedItems.length === 0}
            className="h-8 text-xs font-medium"
          >
            <Calculator className="w-3.5 h-3.5 mr-2 text-blue-600" />
            Aplicar Margens das Linhas
          </Button>

          <div className="flex items-center h-8 bg-white border rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-ring">
            <div className="flex items-center justify-center pl-2 pr-1 text-muted-foreground bg-slate-50 border-r">
              <Percent className="w-3 h-3" />
            </div>
            <FormattedInput
              className="h-full w-20 border-0 focus-visible:ring-0 shadow-none text-xs text-right rounded-none"
              placeholder="Global %"
              value={globalMargin}
              onValueChange={setGlobalMargin}
              disabled={isApplying}
            />
            <Button
              variant="secondary"
              onClick={handleApplyGlobalMargin}
              disabled={isApplying || !globalMargin || selectedItems.length === 0}
              className="h-full rounded-none px-3 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border-l"
            >
              Aplicar Global
            </Button>
          </div>
        </div>
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
              <TableHead className="w-20 text-[11px] text-right text-amber-600">
                <Tooltip>
                  <TooltipTrigger className="cursor-help underline decoration-dashed underline-offset-2">
                    Custo Ref.
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-semibold">Custo de Referência</p>
                    <p className="text-[10px] text-muted-foreground mt-1 max-w-[150px] leading-tight">
                      Snapshot do último preço capturado no momento da adição.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="w-20 text-[11px] text-right">Margem %</TableHead>
              <TableHead className="w-28 text-[11px] text-right">Preço Venda</TableHead>
              <TableHead className="w-24 text-[11px] text-right">Total</TableHead>
              <TableHead className="w-10 text-center text-[11px]">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedItems.map((record, index) => {
              const { id, data } = record
              const total =
                typeof data.quantidade === 'number' && typeof data.preco_unitario === 'number'
                  ? data.quantidade * data.preco_unitario
                  : 0

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
                    {data.item.unidade || '-'}
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
                  <TableCell className="py-1 text-xs text-right font-mono text-amber-600 font-semibold whitespace-nowrap">
                    {(() => {
                      const hasSnapshot =
                        typeof data.referencia_preco === 'number' && data.referencia_preco > 0
                      const refPrice = hasSnapshot ? data.referencia_preco : null
                      const refSupplier = data.referencia_fornecedor
                      const refDate = data.referencia_data

                      if (!refPrice) {
                        return (
                          <span className="font-mono text-xs text-amber-600 font-bold">N/A</span>
                        )
                      }

                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col cursor-help items-end">
                              <span>{formatCurrency(refPrice)}</span>
                              {refSupplier ? (
                                <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">
                                  {refSupplier}
                                </span>
                              ) : (
                                <span className="text-[9px] text-muted-foreground">-</span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-semibold">
                              Fornecedor: {refSupplier || 'Não informado'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Data: {refDate ? new Date(refDate).toLocaleDateString() : '-'}
                            </p>
                            <p className="text-[10px] text-amber-500 mt-1">Snapshot salvo</p>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })()}
                  </TableCell>
                  <TableCell className="py-1 text-right">
                    <FormattedInput
                      className="h-7 w-16 px-2 text-right text-xs bg-white ml-auto"
                      value={(() => {
                        const hasSnapshot =
                          typeof data.referencia_preco === 'number' && data.referencia_preco > 0
                        const custo = hasSnapshot ? Number(data.referencia_preco) : 0
                        return Number(data.preco_unitario) > 0 && custo > 0
                          ? ((1 - custo / Number(data.preco_unitario)) * 100).toFixed(3)
                          : '0.000'
                      })()}
                      onValueChange={(val) => {
                        const m = parseFloat(val) || 0
                        const hasSnapshot =
                          typeof data.referencia_preco === 'number' && data.referencia_preco > 0
                        const custo = hasSnapshot ? Number(data.referencia_preco) : 0
                        if (custo === 0 || m >= 100) return
                        const newVenda = custo / (1 - m / 100)
                        handleUpdateItem(id, 'preco_unitario', newVenda.toFixed(3))
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
                      prefixText="$"
                      className="h-7 w-24 px-2 text-right text-xs bg-white font-bold ml-auto"
                      value={
                        typeof data.preco_unitario === 'number'
                          ? data.preco_unitario.toFixed(3)
                          : data.preco_unitario
                      }
                      onValueChange={(val) => handleUpdateItem(id, 'preco_unitario', val)}
                      onBlur={() => {
                        let parsed = parseFloat(String(data.preco_unitario))
                        if (isNaN(parsed)) parsed = 0
                        handleUpdateItem(id, 'preco_unitario', parsed.toFixed(3))
                        handlePriceBlur(record.recordId, parsed)
                      }}
                    />
                  </TableCell>
                  <TableCell className="py-1 text-xs font-semibold text-right whitespace-nowrap">
                    {formatCurrency(total)}
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
