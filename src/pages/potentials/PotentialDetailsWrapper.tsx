import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AddItemsToPotential from './AddItemsToPotential'
import QuotationMatrix from './components/QuotationMatrix'
import { cn } from '@/lib/utils'

export default function PotentialDetailsWrapper() {
  const [tab, setTab] = useState('items')

  return (
    <div className="h-full flex flex-col bg-background relative z-0">
      <div className="px-6 pt-4 border-b">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-[-1px]">
            <TabsTrigger value="items" className="rounded-b-none px-6">
              Itens do Potencial
            </TabsTrigger>
            <TabsTrigger value="quotations" className="rounded-b-none px-6">
              Cotação de Fabricantes
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div className={cn('absolute inset-0 overflow-auto', tab === 'items' ? 'block' : 'hidden')}>
          <AddItemsToPotential />
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
