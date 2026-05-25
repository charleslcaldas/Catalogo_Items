import { useState, useEffect } from 'react'
import { Search, Loader2, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { searchPotenciais } from '@/services/potenciais'
import type { Potencial } from '@/types'

interface SearchQuoteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (quote: Potencial) => void
}

export function SearchQuoteModal({ open, onOpenChange, onSelect }: SearchQuoteModalProps) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Potencial[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setSearch('')
      setResults([])
      return
    }

    setLoading(true)
    const delay = setTimeout(async () => {
      try {
        const res = await searchPotenciais(search)
        setResults(res.items)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(delay)
  }, [search, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Buscar Cotação Salva</DialogTitle>
        </DialogHeader>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou cliente..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {loading && (
            <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 overflow-y-auto mt-4 space-y-2 min-h-0">
          {!loading && results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-70">
              <FileText className="h-10 w-10 mb-2" />
              <p>Nenhuma cotação encontrada</p>
            </div>
          ) : (
            results.map((quote) => (
              <div
                key={quote.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => onSelect(quote)}
              >
                <div>
                  <div className="font-medium text-primary">{quote.numero_potencial}</div>
                  <div className="text-sm text-muted-foreground">
                    {quote.cliente || 'Sem cliente'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(quote.created).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={quote.status === 'ativo' ? 'default' : 'secondary'}>
                    {quote.status}
                  </Badge>
                  <Button size="sm" variant="outline">
                    Carregar
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
