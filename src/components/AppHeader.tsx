import { Search, CloudCog, Menu } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { useData } from '@/contexts/data-context'

export function AppHeader() {
  const { isMobile } = useSidebar()
  const { itens } = useData()
  const pendentes = itens.filter((i) => !i.sincronizado_com_zoho).length

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background px-4 shadow-sm md:px-6">
      <div className="flex items-center gap-4">
        {isMobile && <SidebarTrigger />}
        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por SKU ou descrição..."
            className="w-full bg-muted/50 pl-9 border-none focus-visible:ring-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Status do Zoho:</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary">
            {pendentes > 0 ? (
              <>
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-medium text-amber-700">{pendentes} pendentes</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-emerald-700">Sincronizado</span>
              </>
            )}
            <CloudCog className="h-4 w-4 text-muted-foreground ml-1" />
          </div>
        </div>

        <Button variant="ghost" size="icon" className="md:hidden">
          <Search className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
