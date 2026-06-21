import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Check } from 'lucide-react'
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
  onAcceptCounter,
}: any) {
  const currentPrice = draftPrice !== undefined ? draftPrice : cotacaoI?.preco_ofertado || 0
  const currentMoq = draftMoq !== undefined ? draftMoq : cotacaoI?.quantidade_minima || 0

  const hasCounter = cotacaoI && cotacaoI.preco_contraproposta > 0

  return (
    <div
      className={cn(
        'p-1.5 rounded flex flex-col gap-1.5 relative group min-h-[44px]',
        cotacaoI?.vencedor && 'bg-green-50/50 ring-1 ring-green-500',
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex-1">
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
            className="h-7 text-xs text-right font-mono"
            placeholder="Preço"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 shrink-0',
            cotacaoI?.vencedor ? 'text-green-600' : 'text-muted-foreground',
          )}
          onClick={() =>
            onToggleWinner(cotacaoF.id, item.item_id, cotacaoI?.id, cotacaoI?.vencedor)
          }
        >
          <CheckCircle className="w-4 h-4" />
        </Button>
      </div>

      {currentMoq > 0 || (draftMoq !== undefined && draftMoq !== 0) ? (
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground uppercase font-bold w-6">MOQ</span>
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
            className="h-6 text-[10px] text-right font-mono"
            placeholder="MOQ"
          />
        </div>
      ) : (
        <div className="hidden group-hover:flex justify-end">
          <button
            className="text-[9px] text-muted-foreground hover:text-foreground underline pr-8"
            onClick={() => onDraftMoqChange(cotacaoF.id, item.item_id, 1)}
          >
            + MOQ
          </button>
        </div>
      )}

      {hasCounter ? (
        <div className="pt-1.5 border-t flex flex-col gap-1.5 bg-amber-50/50 -mx-1.5 px-1.5 pb-1 mt-0.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] text-amber-700 font-bold uppercase">C.Proposta</span>
            <span className="font-mono text-xs font-bold text-amber-700">
              $ {cotacaoI.preco_contraproposta.toFixed(4)}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full text-[10px] border-amber-300 text-amber-700 bg-amber-100 hover:bg-amber-200"
            onClick={() =>
              onAcceptCounter(cotacaoF.id, item.item_id, cotacaoI.id, cotacaoI.preco_contraproposta)
            }
          >
            <Check className="w-3 h-3 mr-1" /> Aplicar Aceite
          </Button>
        </div>
      ) : null}

      {isLowest && !cotacaoI?.vencedor && (
        <Badge className="absolute -top-2 -right-2 text-[8px] h-4 px-1 bg-blue-100 text-blue-700 border-none hover:bg-blue-100 shadow-sm pointer-events-none z-10">
          Menor
        </Badge>
      )}
    </div>
  )
}
