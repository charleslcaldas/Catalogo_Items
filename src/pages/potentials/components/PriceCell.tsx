import { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function PriceCell({
  cotacaoF,
  item,
  cotacaoI,
  draftPrice,
  draftMoq,
  isLowest,
  onDraftChange,
  onDraftMoqChange,
  onBlur,
  onToggleWinner,
}: any) {
  const [val, setVal] = useState('')
  const [moq, setMoq] = useState('')

  useEffect(() => {
    if (draftPrice !== undefined) setVal(draftPrice.toString())
    else if (cotacaoI?.preco_ofertado !== undefined && cotacaoI.preco_ofertado !== null)
      setVal(cotacaoI.preco_ofertado.toString())
    else setVal('')
  }, [cotacaoI?.preco_ofertado, draftPrice])

  useEffect(() => {
    if (draftMoq !== undefined) setMoq(draftMoq.toString())
    else if (cotacaoI?.quantidade_minima !== undefined && cotacaoI.quantidade_minima !== null)
      setMoq(cotacaoI.quantidade_minima.toString())
    else setMoq('')
  }, [cotacaoI?.quantidade_minima, draftMoq])

  const handlePriceBlur = () => {
    let num = val !== '' ? parseFloat(String(val).replace(/,/g, '')) || 0 : 0
    if (num !== (cotacaoI?.preco_ofertado || 0)) {
      onBlur(cotacaoF.id, item.item_id, num, cotacaoI?.quantidade_minima || 0, cotacaoI?.id)
    }
  }

  const handleMoqBlur = () => {
    let num = moq !== '' ? parseFloat(String(moq).replace(/,/g, '')) || 0 : 0
    if (num !== (cotacaoI?.quantidade_minima || 0)) {
      onBlur(cotacaoF.id, item.item_id, cotacaoI?.preco_ofertado || 0, num, cotacaoI?.id)
    }
  }

  const isWinner = cotacaoI?.vencedor
  const moqNum = parseFloat(moq) || cotacaoI?.quantidade_minima || 0
  const hasMoqWarning = moqNum > (item.quantidade || 0)

  return (
    <div
      className={cn(
        'flex flex-col p-1.5 rounded-md border transition-all cursor-pointer justify-center relative group min-h-[56px]',
        isWinner
          ? 'bg-primary/10 border-primary ring-1 ring-primary/30'
          : isLowest
            ? 'bg-green-50/50 border-green-300 hover:border-green-400'
            : 'bg-card border-transparent hover:border-border',
      )}
      onClick={() => onToggleWinner(cotacaoF.id, item.item_id, cotacaoI?.id, isWinner)}
    >
      {isWinner && (
        <div className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full shadow-sm z-10">
          <CheckCircle2 className="w-3.5 h-3.5" />
        </div>
      )}
      <div className="flex items-center">
        <span className="text-muted-foreground text-[10px] w-3 select-none">$</span>
        <Input
          type="text"
          value={val}
          onChange={(e) => {
            setVal(e.target.value)
            const parsed = parseFloat(e.target.value.replace(/,/g, ''))
            if (!isNaN(parsed)) onDraftChange(cotacaoF.id, item.item_id, parsed)
          }}
          onBlur={handlePriceBlur}
          onClick={(e) => e.stopPropagation()}
          placeholder="0.00"
          className="h-6 text-right font-mono text-xs px-1 shadow-none border-transparent bg-transparent hover:bg-background focus:bg-background focus-visible:ring-1"
        />
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span
          className={cn(
            'text-[9px] font-bold uppercase',
            hasMoqWarning ? 'text-red-500' : 'text-muted-foreground/70',
          )}
        >
          {hasMoqWarning ? 'MOQ ALERT' : 'MOQ'}
        </span>
        <Input
          type="text"
          value={moq}
          onChange={(e) => {
            setMoq(e.target.value)
            const parsed = parseFloat(e.target.value.replace(/,/g, ''))
            if (!isNaN(parsed)) onDraftMoqChange(cotacaoF.id, item.item_id, parsed)
          }}
          onBlur={handleMoqBlur}
          onClick={(e) => e.stopPropagation()}
          placeholder="0"
          title={hasMoqWarning ? `MOQ ${moqNum} > Qtd ${item.quantidade}` : ''}
          className={cn(
            'h-5 w-12 text-right font-mono text-[10px] px-1 shadow-none border-transparent bg-transparent hover:bg-background focus:bg-background focus-visible:ring-1',
            hasMoqWarning && 'text-red-700 font-bold border-red-200 bg-red-50/50',
          )}
        />
      </div>
    </div>
  )
}
