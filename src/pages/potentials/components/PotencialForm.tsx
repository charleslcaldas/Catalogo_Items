import { Settings } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { Potencial, StatusPotencial } from '@/types'

interface PotencialFormProps {
  formData: any
  setFormData: any
  currentPotential: Potencial | null
  statusBadge: React.ReactNode
  statuses: StatusPotencial[]
  onManageStatuses: () => void
}

export function PotencialForm({
  formData,
  setFormData,
  statusBadge,
  statuses,
  onManageStatuses,
}: PotencialFormProps) {
  return (
    <div className="bg-white p-3 rounded-lg shadow-sm border shrink-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 items-start">
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
        <div className="flex items-center gap-2 flex-1">
          <select
            className="flex-1 h-7 rounded-md border border-input bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            value={formData.status || 'Sem Itens'}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="Sem Itens">Sem Itens</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.nome}>
                {s.nome}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-slate-900"
            onClick={onManageStatuses}
            title="Gerenciar Status"
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
          {statusBadge}
        </div>
      </div>
    </div>
  )
}
