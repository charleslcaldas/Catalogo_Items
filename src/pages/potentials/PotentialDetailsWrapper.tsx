import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AddItemsToPotential from './AddItemsToPotential'
import QuotationMatrix from './components/QuotationMatrix'
import { cn } from '@/lib/utils'

export default function PotentialDetailsWrapper() {
  const [tab, setTab] = useState('items')
  const [itemsKey, setItemsKey] = useState(Date.now())

  const handleTabChange = (v: string) => {
    setTab(v)
    if (v === 'items') setItemsKey(Date.now())
  }

  return (
    <div className="h-full flex flex-col bg-background relative z-0">
      <div className="px-6 pt-4 border-b">
        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-[-1px] bg-muted/40 p-1">
            <TabsTrigger
              value="items"
              className="rounded-b-none px-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Itens do Potencial
            </TabsTrigger>
            <TabsTrigger
              value="quotations"
              className="rounded-b-none px-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Cotação de Fabricantes
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div className={cn('absolute inset-0 overflow-auto', tab === 'items' ? 'block' : 'hidden')}>
          <AddItemsToPotential key={itemsKey} />
        </div>
        <div
          className={cn(
            'absolute inset-0 overflow-auto p-6 bg-muted/20',
            tab === 'quotations' ? 'block' : 'hidden',
          )}
        >
          <QuotationMatrix />
        </div>
      </div>
    </div>
  )
}
