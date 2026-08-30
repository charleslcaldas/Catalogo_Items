import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, AlignJustify, Layers } from 'lucide-react'
import { useData } from '@/contexts/data-context'
import { Badge } from '@/components/ui/badge'
import { getContrastColor } from '@/lib/utils'

export function LinePickerModal({
  open,
  onOpenChange,
  onSelect,
  selectedLinhaId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSelect: (linhaId: string) => void
  selectedLinhaId?: string
}) {
  const { linhas, categorias } = useData()
  const [search, setSearch] = useState('')
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)

  const getCatName = (catId?: string) => {
    if (!catId) return ''
    const cat = categorias.find((c) => c.id === catId)
    return cat ? cat.nome_pt : ''
  }

  const getCatColor = (catId?: string) => {
    if (!catId) return null
    const cat = categorias.find((c) => c.id === catId)
    return cat?.color || null
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    return linhas.filter((l) => {
      if (selectedCatId && l.categoria_id !== selectedCatId) return false
      if (!term) return true
      const catName = getCatName(l.categoria_id).toLowerCase()
      const nomePt = (l.nome_pt || '').toLowerCase()
      const nomeEn = (l.nome_en || '').toLowerCase()
      const superPt = (l.superlinha_pt || '').toLowerCase()
      return (
        nomePt.includes(term) ||
        nomeEn.includes(term) ||
        catName.includes(term) ||
        superPt.includes(term)
      )
    })
  }, [linhas, categorias, search, selectedCatId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <AlignJustify className="w-5 h-5 text-primary" />
            Selecionar Nova Linha
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-3 my-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              className="pl-9 bg-card"
              placeholder="Buscar por nome da linha ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {categorias.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full sm:max-w-xs scrollbar-none shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCatId(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap border ${
                  selectedCatId === null
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted border-transparent'
                }`}
              >
                Todas ({linhas.length})
              </button>
              {categorias.map((cat) => {
                const count = linhas.filter((l) => l.categoria_id === cat.id).length
                if (count === 0) return null
                const isSelected = selectedCatId === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCatId(isSelected ? null : cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap border ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted border-transparent'
                    }`}
                  >
                    {cat.nome_pt} ({count})
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Layers className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">Nenhuma linha encontrada.</p>
              <p className="text-xs text-muted-foreground">
                Tente alterar os termos da busca ou filtro de categoria.
              </p>
            </div>
          ) : (
            filtered.map((linha) => {
              const catName = getCatName(linha.categoria_id)
              const catColor = getCatColor(linha.categoria_id)
              const isCurrent = linha.id === selectedLinhaId

              return (
                <div
                  key={linha.id}
                  className={`border bg-card rounded-xl p-4 cursor-pointer hover:border-primary hover:shadow-md transition-all group flex flex-col justify-between gap-3 text-left relative ${
                    isCurrent ? 'ring-2 ring-primary border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    onSelect(linha.id)
                    onOpenChange(false)
                  }}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {linha.color ? (
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0 shadow-sm"
                            style={{ backgroundColor: linha.color }}
                          />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full bg-muted border border-border shrink-0" />
                        )}
                        <h4 className="font-semibold text-sm leading-tight text-foreground group-hover:text-primary transition-colors truncate">
                          {linha.nome_pt}
                        </h4>
                      </div>
                    </div>

                    {linha.nome_en && (
                      <p className="text-xs text-muted-foreground truncate pl-5">{linha.nome_en}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 mt-auto">
                    {catName ? (
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium truncate max-w-[140px]"
                        style={
                          catColor
                            ? {
                                backgroundColor: catColor,
                                color: getContrastColor(catColor),
                              }
                            : { backgroundColor: '#E5E7EB', color: '#1F2937' }
                        }
                      >
                        {catName}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Sem categoria</span>
                    )}

                    {linha.margem_padrao != null && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-normal"
                      >
                        {linha.margem_padrao}%
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
