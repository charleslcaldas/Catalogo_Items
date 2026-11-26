import { useEffect, useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PriceInput } from '@/components/PriceInput'
import { Button } from '@/components/ui/button'

interface PriceCellProps {
  cotacaoF: any
  item: any
  cotacaoI: any
  draftPrice?: number
  draftMoq?: number
  isLowest?: boolean
  accepted?: boolean
  onDraftChange: (cfId: string, itemId: string, val: number) => void
  onDraftMoqChange: (cfId: string, itemId: string, val: number) => void
  onBlur?: (cfId: string, itemId: string, preco: number, moq: number, ofertaId?: string) => void
  onToggleWinner: (
    cfId: string,
    itemId: string,
    ofertaId?: string,
    winner?: boolean,
    linhaId?: string,
  ) => void
  onSaveCell: (cfId: string, itemId: string, preco: number, moq: number) => Promise<void>
  onCancelEdit: (cfId: string, itemId: string) => void
}

export function PriceCell({
  cotacaoF,
  item,
  cotacaoI,
  draftPrice,
  draftMoq,
  isLowest,
  accepted: acceptedProp,
  onDraftChange,
  onDraftMoqChange,
  onBlur,
  onToggleWinner,
  onSaveCell,
  onCancelEdit,
}: PriceCellProps) {
  const [editing, setEditing] = useState(false)
  const key = `${cotacaoF.id}_${item.item_id}`

  // Quando um rascunho é salvo ou cancelado, sai do modo de edição.
  useEffect(() => {
    if (draftPrice === undefined && draftMoq === undefined) setEditing(false)
  }, [draftPrice, draftMoq])

  const currentPrice = draftPrice !== undefined ? draftPrice : cotacaoI?.preco_ofertado || 0
  const currentMoq = draftMoq !== undefined ? draftMoq : cotacaoI?.quantidade_minima || 0

  const hasCounter = cotacaoI && cotacaoI.preco_contraproposta > 0
  const counterPrice = cotacaoI?.preco_contraproposta

  // Aceite pode vir de fora (duplo clique na célula ou no header do fabricante)
  // ou do próprio registro (vencedor salvo).
  const accepted =
    acceptedProp === true || cotacaoI?.vencedor === true || cotacaoI?.selecionadoLocal === true

  const hasDraft = draftPrice !== undefined || draftMoq !== undefined
  const dirty =
    (draftPrice !== undefined && draftPrice !== (cotacaoI?.preco_ofertado || 0)) ||
    (draftMoq !== undefined && draftMoq !== (cotacaoI?.quantidade_minima || 0))

  const startEditing = () => {
    // Semeia os rascunhos com o valor atual para que o painel de edição
    // mostre o preço/MOQ existentes da oferta.
    onDraftChange(cotacaoF.id, item.item_id, currentPrice)
    onDraftMoqChange(cotacaoF.id, item.item_id, currentMoq)
    setEditing(true)
  }

  const cancel = () => {
    onCancelEdit(cotacaoF.id, item.item_id)
    setEditing(false)
  }

  const save = async () => {
    setEditing(false)
    await onSaveCell(cotacaoF.id, item.item_id, currentPrice, currentMoq)
  }

  return (
    <div
      title="Duplo clique para aceitar o preço deste fabricante"
      onDoubleClick={() =>
        onToggleWinner(cotacaoF.id, item.item_id, cotacaoI?.id, cotacaoI?.vencedor, item.id)
      }
      className={cn(
        'p-1.5 rounded-md flex flex-col gap-1.5 relative group min-h-[44px] select-none transition-all',
        accepted
          ? 'bg-blue-100 hover:bg-blue-100/90'
          : isLowest
            ? 'bg-emerald-100/70 ring-1.5 ring-emerald-500/80 hover:bg-emerald-100'
            : 'hover:bg-muted/50',
      )}
    >
      <div className="flex items-center gap-1">
        <div onClick={(e) => e.stopPropagation()} className="flex-1 min-w-0">
          <PriceInput
            disabled={!!accepted || editing}
            value={currentPrice || undefined}
            onChange={(val) => onDraftChange(cotacaoF.id, item.item_id, val || 0)}
            onBlur={() => {
              if (onBlur && (draftPrice !== undefined || draftMoq !== undefined)) {
                onBlur(cotacaoF.id, item.item_id, currentPrice, currentMoq, cotacaoI?.id)
              }
            }}
            className={cn(
              'h-7 text-xs text-right font-mono w-full font-semibold transition-colors',
              accepted
                ? 'bg-white text-blue-900 border-border font-bold focus-visible:ring-blue-400 shadow-2xs'
                : isLowest
                  ? 'bg-white/90 text-emerald-800 font-bold border-emerald-400 focus-visible:ring-emerald-400 shadow-2xs'
                  : 'bg-background text-foreground',
            )}
          />
        </div>
        {/* Editar oferta: registra cotação melhor recebida (preço novo + MOQ). */}
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
          aria-label="Editar preço e MOQ da oferta"
          title="Editar preço da oferta (registra cotação melhor recebida)"
          onClick={(e) => {
            e.stopPropagation()
            if (editing) {
              cancel()
            } else {
              startEditing()
            }
          }}
        >
          {editing ? <X className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
        </Button>
        {hasCounter && (
          <span
            className={cn(
              'font-mono text-[10px] font-bold whitespace-nowrap pl-1',
              accepted ? 'text-amber-700' : 'text-amber-600',
            )}
            title="Contraproposta"
          >
            $ {counterPrice.toFixed(3)}
          </span>
        )}
      </div>

      {editing && (
        <div
          className="flex flex-col gap-1 p-1.5 rounded-md border bg-white shadow-sm"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <label className="text-[9px] font-medium text-muted-foreground flex flex-col gap-0.5">
            Novo preço
            <PriceInput
              value={currentPrice || undefined}
              onChange={(val) => onDraftChange(cotacaoF.id, item.item_id, val || 0)}
              className="h-6 text-[11px] text-right font-mono w-full"
            />
          </label>
          <label className="text-[9px] font-medium text-muted-foreground flex flex-col gap-0.5">
            MOQ (quantidade mínima)
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={currentMoq || ''}
              placeholder="0"
              onChange={(e) =>
                onDraftMoqChange(
                  cotacaoF.id,
                  item.item_id,
                  Math.max(0, Number(e.target.value) || 0),
                )
              }
              className="h-6 text-[11px] text-right font-mono w-full rounded border bg-background px-1.5"
            />
          </label>
          <div className="flex items-center justify-end gap-1 pt-0.5">
            <Button
              variant="outline"
              size="icon"
              className="h-5 w-5"
              aria-label="Cancelar edição da oferta"
              title="Cancelar"
              onClick={cancel}
            >
              <X className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              className="h-5 w-5 bg-emerald-600 hover:bg-emerald-700 text-white"
              aria-label="Salvar novo preço e MOQ"
              title="Salvar preço e MOQ"
              disabled={!dirty}
              onClick={save}
            >
              <Check className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {currentMoq > 0 && (
        <p
          className={cn(
            'text-[10px] font-mono whitespace-nowrap',
            accepted ? 'text-blue-700' : 'text-muted-foreground',
          )}
        >
          MLQ {currentMoq.toLocaleString('pt-BR')}
          {item?.unidade_medida ? ` ${item.unidade_medida}` : ''}
        </p>
      )}
    </div>
  )
}
