import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Check, Image as ImageIcon, Loader2, Sparkles, AlertTriangle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'

export interface MergeFotosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedFotos: any[]
  acabamentos?: any[]
  onSuccess: (result: { reassignedItems: number; removedFotos: number }) => void
}

export function MergeFotosModal({
  open,
  onOpenChange,
  selectedFotos,
  acabamentos = [],
  onSuccess,
}: MergeFotosModalProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('')
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({})
  const [loadingCounts, setLoadingCounts] = useState(false)
  const [merging, setMerging] = useState(false)

  // Ao abrir ou mudar as fotos selecionadas, seleciona por padrão a primeira
  useEffect(() => {
    if (open && selectedFotos.length > 0) {
      if (!selectedTargetId || !selectedFotos.some((f) => f.id === selectedTargetId)) {
        setSelectedTargetId(selectedFotos[0].id)
      }
    }
  }, [open, selectedFotos, selectedTargetId])

  // Contar quantos itens estão vinculados a cada foto selecionada para exibir feedback rico
  useEffect(() => {
    if (!open || selectedFotos.length === 0) return

    let isMounted = true
    const fetchCounts = async () => {
      setLoadingCounts(true)
      const counts: Record<string, number> = {}
      try {
        await Promise.all(
          selectedFotos.map(async (f) => {
            try {
              const res = await pb.collection('itens').getList(1, 1, {
                filter: `foto_catalogo_id = "${f.id}"`,
              })
              counts[f.id] = res.totalItems
            } catch {
              counts[f.id] = 0
            }
          }),
        )
        if (isMounted) {
          setItemCounts(counts)
        }
      } catch (err) {
        console.error('Erro ao contar itens das fotos:', err)
      } finally {
        if (isMounted) setLoadingCounts(false)
      }
    }

    fetchCounts()
    return () => {
      isMounted = false
    }
  }, [open, selectedFotos])

  const getAcabamentoName = (id: string) => {
    return acabamentos.find((a: any) => a.id === id)?.nome_pt || null
  }

  const handleConfirmMerge = async () => {
    if (!selectedTargetId) {
      toast.error('Escolha a foto oficial que deve permanecer no catálogo.')
      return
    }

    const sourceFotoIds = selectedFotos.map((f) => f.id)
    setMerging(true)

    try {
      const res = await pb.send('/backend/v1/foto-catalogo/merge', {
        method: 'POST',
        body: JSON.stringify({
          sourceFotoIds,
          targetFotoId: selectedTargetId,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const reassigned = res.reassignedItems ?? 0
      const removed = res.removedFotos ?? 0

      toast.success(
        `Mesclagem concluída com sucesso! ${reassigned} ${
          reassigned === 1 ? 'item reatribuído' : 'itens reatribuídos'
        } e ${removed} ${removed === 1 ? 'foto duplicada removida' : 'fotos duplicadas removidas'}.`,
      )

      onSuccess({ reassignedItems: reassigned, removedFotos: removed })
      onOpenChange(false)
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Erro ao mesclar fotos'
      toast.error(msg)
    } finally {
      setMerging(false)
    }
  }

  const selectedTargetFoto = selectedFotos.find((f) => f.id === selectedTargetId)
  const otherFotos = selectedFotos.filter((f) => f.id !== selectedTargetId)

  // Total de itens que serão reatribuídos
  const totalItemsToReassign = otherFotos.reduce((sum, f) => sum + (itemCounts[f.id] || 0), 0)
  const currentTargetItems = selectedTargetId ? itemCounts[selectedTargetId] || 0 : 0
  const finalTargetTotalItems = currentTargetItems + totalItemsToReassign

  return (
    <Dialog open={open} onOpenChange={merging ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col p-6 gap-0">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <DialogTitle className="text-xl">Mesclar Fotos Repetidas</DialogTitle>
          </div>
          <DialogDescription className="text-sm pt-1">
            Selecione qual das{' '}
            <strong className="text-foreground">{selectedFotos.length} fotos</strong> será a foto{' '}
            <strong>oficial</strong> (que permanece no catálogo). Todos os itens vinculados às
            outras {otherFotos.length} fotos passarão a apontar para a foto oficial, e as fotos
            duplicadas serão removidas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-3 rounded-lg text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Atenção:</strong> Esta ação reatribui todos os produtos das demais fotos para
              a foto oficial escolhida e exclui permanentemente as fotos repetidas.
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Escolha a foto oficial (permanece no catálogo):
            </Label>

            <RadioGroup
              value={selectedTargetId}
              onValueChange={setSelectedTargetId}
              className="space-y-2.5"
            >
              {selectedFotos.map((f) => {
                const isSelected = f.id === selectedTargetId
                const count = itemCounts[f.id]
                const photoUrl = f.arquivo
                  ? pb.files.getURL(f, f.arquivo, { thumb: '150x150' })
                  : f.url_foto || ''
                const acabName = f.acabamento_id ? getAcabamentoName(f.acabamento_id) : null

                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedTargetId(f.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                        : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                    }`}
                  >
                    <RadioGroupItem value={f.id} id={`radio-${f.id}`} className="mt-0.5" />
                    <div className="w-16 h-16 rounded-lg bg-muted border overflow-hidden shrink-0 flex items-center justify-center relative">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={f.descricao || 'Foto'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-muted-foreground opacity-30" />
                      )}
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label
                          htmlFor={`radio-${f.id}`}
                          className="font-semibold text-sm cursor-pointer truncate"
                        >
                          {f.descricao || 'Sem descrição'}
                        </Label>
                        {isSelected && (
                          <Badge variant="default" className="text-[10px] h-5 px-1.5 py-0">
                            Foto Oficial
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                        {f.tipo && (
                          <span>
                            Tipo: <strong>{f.tipo}</strong>
                          </span>
                        )}
                        {f.subtipo && (
                          <span>
                            Subtipo: <strong>{f.subtipo}</strong>
                          </span>
                        )}
                        {f.tamanho && (
                          <span>
                            Tam: <strong>{f.tamanho}</strong>
                          </span>
                        )}
                        {acabName && (
                          <span>
                            Acab: <strong>{acabName}</strong>
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground/80 mt-1">
                        {loadingCounts ? (
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Carregando itens...
                          </span>
                        ) : (
                          <span>
                            {count === 1 ? '1 item vinculado' : `${count ?? 0} itens vinculados`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </RadioGroup>
          </div>

          {selectedTargetFoto && (
            <div className="bg-muted/40 border rounded-xl p-3 text-xs space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <span>Resumo da mesclagem:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                <li>
                  <strong className="text-foreground">{otherFotos.length}</strong> foto(s)
                  repetida(s) serão <span className="text-destructive font-medium">excluídas</span>.
                </li>
                <li>
                  <strong className="text-foreground">{totalItemsToReassign}</strong> item(ns) serão{' '}
                  <span className="text-primary font-medium">reatribuídos</span> para a foto
                  oficial.
                </li>
                <li>
                  A foto oficial ficará com um total de{' '}
                  <strong className="text-foreground">{finalTargetTotalItems}</strong> itens
                  vinculados.
                </li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={merging}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmMerge}
            disabled={merging || !selectedTargetId}
            className="gap-2"
          >
            {merging ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mesclando fotos...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Confirmar Mesclagem ({selectedFotos.length} fotos)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
