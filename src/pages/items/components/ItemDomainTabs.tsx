import type { ReactNode } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type ItemDomainTabsProps = {
  dataContent: ReactNode
  partnersContent: ReactNode
  commercialContent: ReactNode
  documentsContent: ReactNode
}

const triggerClassName =
  'rounded-full px-4 py-1 text-xs transition-all font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm'

export function ItemDomainTabs({
  dataContent,
  partnersContent,
  commercialContent,
  documentsContent,
}: ItemDomainTabsProps) {
  return (
    <Tabs defaultValue="data" className="flex min-h-0 flex-1 flex-col bg-muted/10">
      <div className="px-4 pt-3 shrink-0 z-10">
        <TabsList className="flex w-full bg-muted border-border p-1 h-auto rounded-full justify-start overflow-x-auto gap-1">
          <TabsTrigger value="data" className={triggerClassName}>
            Dados C2
          </TabsTrigger>
          <TabsTrigger value="partners" className={triggerClassName}>
            Clientes e fornecedores
          </TabsTrigger>
          <TabsTrigger value="commercial" className={triggerClassName}>
            Preços e cotações
          </TabsTrigger>
          <TabsTrigger value="documents" className={triggerClassName}>
            Documentos e aplicações
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <TabsContent value="data" className="m-0">
          {dataContent}
        </TabsContent>
        <TabsContent value="partners" className="m-0">
          {partnersContent}
        </TabsContent>
        <TabsContent value="commercial" className="m-0">
          {commercialContent}
        </TabsContent>
        <TabsContent value="documents" className="m-0">
          {documentsContent}
        </TabsContent>
      </div>
    </Tabs>
  )
}
