import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

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
  onAcceptCounter,
}: any) {
  const currentPrice = draftPrice !== undefined ? draftPrice : cotacaoI?.preco_ofertado || 0
  const currentMoq = draftMoq !== undefined ? draftMoq : cotacaoI?.quantidade_minima || 0
  const counterPrice = cotacaoI?.preco_contraproposta || 0

  return (
    <div className="flex flex-col gap-1 min-w-[120px] group">
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground font-semibold text-[10px] w-4 text-center">$</span>
        <Input
          type="number"
          className={cn(
            'h-7 text-xs font-mono px-1.5',
            isLowest && currentPrice > 0 ? 'border-green-500 bg-green-50 text-green-700' : '',
          )}
          value={currentPrice === 0 ? '' : currentPrice}
          onChange={(e) =>
            onDraftChange(cotacaoF.id, item.item_id, parseFloat(e.target.value) || 0)
          }
          onBlur={(e) => {
            const val = parseFloat(e.target.value) || 0
            if (
              val !== (cotacaoI?.preco_ofertado || 0) ||
              currentMoq !== (cotacaoI?.quantidade_minima || 0)
            ) {
              onBlur(cotacaoF.id, item.item_id, val, currentMoq, cotacaoI?.id)
            }
          }}
          placeholder="0.00"
        />
        <Button
          variant={cotacaoI?.vencedor ? 'default' : 'ghost'}
          size="icon"
          className={cn(
            'h-7 w-7 shrink-0',
            cotacaoI?.vencedor ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-muted-foreground',
          )}
          onClick={() =>
            onToggleWinner(cotacaoF.id, item.item_id, cotacaoI?.id, cotacaoI?.vencedor)
          }
        >
          <Check className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div
        className={cn(
          'flex items-center gap-1 transition-opacity',
          currentMoq > 0
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100',
        )}
      >
        <span
          className="text-muted-foreground font-medium text-[9px] w-4 text-center"
          title="Minimum Order Quantity"
        >
          Q
        </span>
        <Input
          type="number"
          className="h-6 text-[10px] font-mono px-1.5 bg-muted/30"
          value={currentMoq === 0 ? '' : currentMoq}
          onChange={(e) =>
            onDraftMoqChange(cotacaoF.id, item.item_id, parseInt(e.target.value) || 0)
          }
          onBlur={(e) => {
            const val = parseInt(e.target.value) || 0
            if (
              currentPrice !== (cotacaoI?.preco_ofertado || 0) ||
              val !== (cotacaoI?.quantidade_minima || 0)
            ) {
              onBlur(cotacaoF.id, item.item_id, currentPrice, val, cotacaoI?.id)
            }
          }}
          placeholder="MOQ"
        />
      </div>

      {counterPrice > 0 && (
        <div className="flex items-center gap-1 mt-1 bg-amber-50 border border-amber-200 rounded p-1">
          <span
            className="text-amber-700 font-bold text-[10px] leading-none shrink-0"
            title="Contraproposta"
          >
            Alvo:
          </span>
          <span className="text-amber-700 font-mono text-[10px] leading-none flex-1 truncate">
            ${counterPrice}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-sm"
            onClick={() => onAcceptCounter(cotacaoF.id, item.item_id, cotacaoI.id, counterPrice)}
            title="Aceitar Target"
          >
            <Check className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
