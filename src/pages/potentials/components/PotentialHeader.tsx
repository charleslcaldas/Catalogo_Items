import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { Potencial } from '@/types'
import { getPotenciais } from '@/services/potenciais'

interface PotentialHeaderProps {
  selected: Potencial | null
  onSelect: (p: Potencial | null) => void
}

export function PotentialHeader({ selected, onSelect }: PotentialHeaderProps) {
  const [potenciais, setPotenciais] = useState<Potencial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPotenciais()
      .then(setPotenciais)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end shrink-0">
      <div className="space-y-2">
        <Label>Número do Potencial</Label>
        {loading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={selected?.id || ''}
            onValueChange={(val) => onSelect(potenciais.find((p) => p.id === val) || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione ou digite um potencial..." />
            </SelectTrigger>
            <SelectContent>
              {potenciais.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.numero_potencial}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="space-y-2">
        <Label>Cliente</Label>
        <Input
          readOnly
          value={selected?.cliente || ''}
          placeholder="Nome do cliente"
          className="bg-muted"
        />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Input
          readOnly
          value={selected?.status || ''}
          placeholder="Status atual"
          className="bg-muted"
        />
      </div>
    </div>
  )
}
