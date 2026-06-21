import { useState } from 'react'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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
  const [editing, setEditing] = useState(false)
  const price = draftPrice !== undefined ? draftPrice : cotacaoI?.preco_ofertado || 0
  const moq = draftMoq !== undefined ? draftMoq : cotacaoI?.quantidade_minima || 0
  const isWinner = cotacaoI?.vencedor

  const contraproposta = cotacaoI?.preco_contraproposta || 0

  const handleBlur = () => {
    setEditing(false)
    if (draftPrice !== undefined || draftMoq !== undefined) {
      onBlur(cotacaoF.id, item.item_id, price, moq, cotacaoI?.id)
    }
  }

  const activePrice = contraproposta > 0 ? contraproposta : price

  return (
    <div
      className={cn(
        'relative flex flex-col gap-1 p-1.5 rounded-md min-h-[50px] border transition-colors',
        isWinner
          ? 'bg-green-50 border-green-300'
          : 'bg-transparent border-transparent hover:border-muted',
      )}
      onDoubleClick={() => setEditing(true)}
    >
      {editing ? (
        <div className="flex flex-col gap-1 z-10 relative">
          <Input
            autoFocus
            type="number"
            placeholder="Preço"
            className="h-6 text-xs px-1 text-right font-mono"
            value={price || ''}
            onChange={(e) =>
              onDraftChange(cotacaoF.id, item.item_id, parseFloat(e.target.value) || 0)
            }
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
          />
          <Input
            type="number"
            placeholder="MOQ"
            className="h-6 text-xs px-1 text-right font-mono"
            value={moq || ''}
            onChange={(e) =>
              onDraftMoqChange(cotacaoF.id, item.item_id, parseFloat(e.target.value) || 0)
            }
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
          />
        </div>
      ) : (
        <div
          className="flex flex-col justify-center items-end flex-1 cursor-pointer w-full group/cell"
          onClick={() => setEditing(true)}
        >
          <div className="flex items-center gap-1.5 w-full justify-end">
            {contraproposta > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[10px] line-through text-muted-foreground font-mono">
                    ${price.toFixed(4)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Preço Original: ${price.toFixed(4)}</TooltipContent>
              </Tooltip>
            )}
            <span
              className={cn(
                'font-mono text-sm font-semibold text-right',
                contraproposta > 0
                  ? 'text-amber-600'
                  : isLowest && price > 0
                    ? 'text-green-600'
                    : 'text-foreground',
              )}
            >
              {activePrice > 0 ? `$${activePrice.toFixed(4)}` : '-'}
            </span>
          </div>

          {moq > 0 && <span className="text-[9px] text-muted-foreground mt-0.5">MOQ: {moq}</span>}
          {!moq && price > 0 && (
            <span className="text-[9px] opacity-0 group-hover/cell:opacity-100 text-muted-foreground mt-0.5">
              Add MOQ
            </span>
          )}
        </div>
      )}

      {activePrice > 0 && !editing && (
        <Button
          variant={isWinner ? 'default' : 'outline'}
          size="icon"
          className={cn(
            'absolute -right-2 -top-2 h-5 w-5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10',
            isWinner && 'opacity-100 bg-green-600 hover:bg-green-700 border-green-600',
            !isWinner && 'bg-background hover:bg-green-50 hover:text-green-600 border-muted',
          )}
          onClick={(e) => {
            e.stopPropagation()
            onToggleWinner(cotacaoF.id, item.item_id, cotacaoI?.id, isWinner)
          }}
        >
          {isWinner ? <Check className="w-3 h-3 text-white" /> : <Check className="w-3 h-3" />}
        </Button>
      )}
    </div>
  )
}
