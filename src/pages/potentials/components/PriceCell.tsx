import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { PriceInput } from '@/components/PriceInput'

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
  const currentPrice = draftPrice !== undefined ? draftPrice : cotacaoI?.preco_ofertado || 0
  const currentMoq = draftMoq !== undefined ? draftMoq : cotacaoI?.quantidade_minima || 0

  const hasCounter = cotacaoI && cotacaoI.preco_contraproposta > 0
  const counterPrice = cotacaoI?.preco_contraproposta

  return (
    <div
      onClick={() => onToggleWinner(cotacaoF.id, item.item_id, cotacaoI?.id, cotacaoI?.vencedor)}
      className={cn(
        'p-1.5 rounded flex flex-col gap-1.5 relative group min-h-[44px] cursor-pointer transition-colors',
        cotacaoI?.vencedor
          ? 'bg-blue-600 ring-2 ring-blue-700 shadow-md'
          : isLowest
            ? 'bg-green-50/50 ring-1 ring-green-400 hover:bg-green-100/50'
            : 'hover:bg-muted/50',
      )}
    >
      <div className="flex items-center gap-1">
        <div onClick={(e) => e.stopPropagation()} className="flex-1 min-w-0">
          <PriceInput
            value={currentPrice || undefined}
            onChange={(val) => onDraftChange(cotacaoF.id, item.item_id, val || 0)}
            onBlur={() =>
              (draftPrice !== undefined || draftMoq !== undefined) &&
              onBlur(cotacaoF.id, item.item_id, currentPrice, currentMoq, cotacaoI?.id)
            }
            className={cn(
              'h-7 text-xs text-right font-mono w-full',
              cotacaoI?.vencedor
                ? 'bg-blue-700 text-white border-blue-500 focus-visible:ring-blue-300 placeholder:text-blue-300'
                : isLowest
                  ? 'text-green-700 font-bold'
                  : 'bg-background',
            )}
          />
        </div>
        {hasCounter && (
          <span
            className={cn(
              'font-mono text-[10px] font-bold whitespace-nowrap pl-1',
              cotacaoI?.vencedor ? 'text-amber-300' : 'text-amber-500',
            )}
            title="Proposta"
          >
            $ {counterPrice.toFixed(3)}
          </span>
        )}
      </div>

      {currentMoq > 0 || (draftMoq !== undefined && draftMoq !== 0) ? (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-[9px] uppercase font-bold w-6 shrink-0',
              cotacaoI?.vencedor ? 'text-blue-100' : 'text-muted-foreground',
            )}
          >
            MOQ
          </span>
          <Input
            type="text"
            inputMode="numeric"
            value={currentMoq || ''}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '')
              onDraftMoqChange(cotacaoF.id, item.item_id, val ? parseInt(val, 10) : 0)
            }}
            onBlur={() =>
              (draftPrice !== undefined || draftMoq !== undefined) &&
              onBlur(cotacaoF.id, item.item_id, currentPrice, currentMoq, cotacaoI?.id)
            }
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'h-6 text-[10px] text-right font-mono flex-1 min-w-0',
              cotacaoI?.vencedor
                ? 'bg-blue-700 text-white border-blue-500 focus-visible:ring-blue-300 placeholder:text-blue-300'
                : '',
            )}
            placeholder="MOQ"
          />
        </div>
      ) : (
        <div className="hidden group-hover:flex justify-end">
          <button
            className={cn(
              'text-[9px] underline pr-1',
              cotacaoI?.vencedor
                ? 'text-blue-200 hover:text-white'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={(e) => {
              e.stopPropagation()
              onDraftMoqChange(cotacaoF.id, item.item_id, 1)
            }}
          >
            + MOQ
          </button>
        </div>
      )}
    </div>
  )
}
