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
  onBlur,
  onToggleWinner,
}: any) {
  const currentPrice = draftPrice !== undefined ? draftPrice : cotacaoI?.preco_ofertado || 0
  const currentMoq = draftMoq !== undefined ? draftMoq : cotacaoI?.quantidade_minima || 0

  const hasCounter = cotacaoI && cotacaoI.preco_contraproposta > 0
  const counterPrice = cotacaoI?.preco_contraproposta

  return (
    <div
      title="Revisar resposta e confirmar compra"
      onClick={() =>
        onToggleWinner(cotacaoF.id, item.item_id, cotacaoI?.id, cotacaoI?.vencedor, item.id)
      }
      className={cn(
        'p-1.5 rounded-md flex flex-col gap-1.5 relative group min-h-[44px] cursor-pointer transition-all',
        cotacaoI?.vencedor
          ? 'bg-blue-100 hover:bg-blue-100/90'
          : isLowest
            ? 'bg-emerald-100/70 ring-1.5 ring-emerald-500/80 hover:bg-emerald-100'
            : 'hover:bg-muted/50',
      )}
    >
      <div className="flex items-center gap-1">
        <div onClick={(e) => e.stopPropagation()} className="flex-1 min-w-0">
          <PriceInput
            disabled={!!cotacaoI?.vencedor}
            value={currentPrice || undefined}
            onChange={(val) => onDraftChange(cotacaoF.id, item.item_id, val || 0)}
            onBlur={() => {
              if (onBlur && (draftPrice !== undefined || draftMoq !== undefined)) {
                onBlur(cotacaoF.id, item.item_id, currentPrice, currentMoq, cotacaoI?.id)
              }
            }}
            className={cn(
              'h-7 text-xs text-right font-mono w-full font-semibold transition-colors',
              cotacaoI?.vencedor
                ? 'bg-white text-blue-900 border-border font-bold focus-visible:ring-blue-400 shadow-2xs'
                : isLowest
                  ? 'bg-white/90 text-emerald-800 font-bold border-emerald-400 focus-visible:ring-emerald-400 shadow-2xs'
                  : 'bg-background text-foreground',
            )}
          />
        </div>
        {hasCounter && (
          <span
            className={cn(
              'font-mono text-[10px] font-bold whitespace-nowrap pl-1',
              cotacaoI?.vencedor ? 'text-amber-700' : 'text-amber-600',
            )}
            title="Contraproposta"
          >
            $ {counterPrice.toFixed(3)}
          </span>
        )}
      </div>

      {currentMoq > 0 && (
        <p
          className={cn(
            'text-[10px] font-mono whitespace-nowrap',
            cotacaoI?.vencedor ? 'text-blue-700' : 'text-muted-foreground',
          )}
        >
          MLQ {currentMoq.toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  )
}
