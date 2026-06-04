import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Potencial } from '@/types'

interface PotencialFormProps {
  formData: any
  setFormData: any
  currentPotential: Potencial | null
  statusBadge: React.ReactNode
}

export function PotencialForm({
  formData,
  setFormData,
  currentPotential,
  statusBadge,
}: PotencialFormProps) {
  return (
    <div className="bg-white p-3 rounded-lg shadow-sm border shrink-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 items-center">
      <div className="flex items-center gap-2">
        <Label className="w-20 text-right shrink-0 text-xs text-muted-foreground">Número:</Label>
        <Input
          className="h-7 text-xs"
          value={formData.numero_potencial}
          onChange={(e) => setFormData({ ...formData, numero_potencial: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="w-20 text-right shrink-0 text-xs text-muted-foreground">Cliente:</Label>
        <Input
          className="h-7 text-xs"
          value={formData.cliente}
          onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="w-20 text-right shrink-0 text-xs text-muted-foreground">Nome:</Label>
        <Input
          className="h-7 text-xs"
          value={formData.nome_potencial}
          onChange={(e) => setFormData({ ...formData, nome_potencial: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="w-20 text-right shrink-0 text-xs text-muted-foreground">Comprador:</Label>
        <Input
          className="h-7 text-xs"
          value={formData.nome_comprador || ''}
          onChange={(e) => setFormData({ ...formData, nome_comprador: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="w-20 text-right shrink-0 text-xs text-muted-foreground">Propriet.:</Label>
        <Input
          className="h-7 text-xs"
          value={formData.proprietario}
          onChange={(e) => setFormData({ ...formData, proprietario: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="w-20 text-right shrink-0 text-xs text-muted-foreground">Estágio:</Label>
        <Input
          className="h-7 text-xs"
          value={formData.estagio}
          onChange={(e) => setFormData({ ...formData, estagio: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="w-20 text-right shrink-0 text-xs text-muted-foreground">Status:</Label>
        <div className="flex-1 flex items-center h-7 text-xs">{statusBadge}</div>
      </div>
    </div>
  )
}
