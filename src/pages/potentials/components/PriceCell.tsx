import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
          ? 'bg-green-50/50 ring-1 ring-green-500 hover:bg-green-100/50'
          : 'hover:bg-muted/50',
      )}
    >
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={currentPrice || ''}
          onChange={(e) =>
            onDraftChange(cotacaoF.id, item.item_id, parseFloat(e.target.value) || 0)
          }
          onBlur={() =>
            (draftPrice !== undefined || draftMoq !== undefined) &&
            onBlur(cotacaoF.id, item.item_id, currentPrice, currentMoq, cotacaoI?.id)
          }
          onClick={(e) => e.stopPropagation()}
          className="h-7 text-xs text-right font-mono flex-1 min-w-0"
          placeholder="Preço"
        />
        {hasCounter && (
          <span
            className="font-mono text-[10px] font-bold text-amber-500 whitespace-nowrap pl-1"
            title="Proposta"
          >
            $ {counterPrice.toFixed(4)}
          </span>
        )}
      </div>

      {currentMoq > 0 || (draftMoq !== undefined && draftMoq !== 0) ? (
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground uppercase font-bold w-6 shrink-0">
            MOQ
          </span>
          <Input
            type="number"
            value={currentMoq || ''}
            onChange={(e) =>
              onDraftMoqChange(cotacaoF.id, item.item_id, parseInt(e.target.value) || 0)
            }
            onBlur={() =>
              (draftPrice !== undefined || draftMoq !== undefined) &&
              onBlur(cotacaoF.id, item.item_id, currentPrice, currentMoq, cotacaoI?.id)
            }
            onClick={(e) => e.stopPropagation()}
            className="h-6 text-[10px] text-right font-mono flex-1 min-w-0"
            placeholder="MOQ"
          />
        </div>
      ) : (
        <div className="hidden group-hover:flex justify-end">
          <button
            className="text-[9px] text-muted-foreground hover:text-foreground underline pr-1"
            onClick={(e) => {
              e.stopPropagation()
              onDraftMoqChange(cotacaoF.id, item.item_id, 1)
            }}
          >
            + MOQ
          </button>
        </div>
      )}

      {isLowest && !cotacaoI?.vencedor && (
        <Badge className="absolute -top-2 -right-2 text-[8px] h-4 px-1 bg-blue-100 text-blue-700 border-none hover:bg-blue-100 shadow-sm pointer-events-none z-10">
          Menor
        </Badge>
      )}
    </div>
  )
}
