import type { ReactNode } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const triggerClassName =
  'rounded-full px-4 py-1 text-xs transition-all font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm'

export function ItemC2DataTabs({ children }: { children: ReactNode }) {
  return (
    <Tabs defaultValue="pt" className="flex flex-col flex-1 bg-muted/10">
      <div className="px-4 pt-3 shrink-0 z-10 flex flex-col gap-3">
        <TabsList className="flex w-full bg-muted border-border p-1 h-auto rounded-full justify-start overflow-x-auto gap-1">
          <TabsTrigger value="pt" className={triggerClassName}>
            Português
          </TabsTrigger>
          <TabsTrigger value="en" className={triggerClassName}>
            Inglês
          </TabsTrigger>
          <TabsTrigger value="record" className={triggerClassName}>
            Registro
          </TabsTrigger>
        </TabsList>
      </div>
      <div className="p-4 flex-1">{children}</div>
    </Tabs>
  )
}
