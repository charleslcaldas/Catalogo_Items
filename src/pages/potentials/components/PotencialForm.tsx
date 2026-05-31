import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import type { Potencial } from '@/types'
import { ReactNode } from 'react'

interface PotencialFormProps {
  formData: {
    numero_potencial: string
    cliente: string
    nome_potencial: string
    proprietario: string
    estagio: string
    observacoes: string
  }
  setFormData: React.Dispatch<React.SetStateAction<any>>
  currentPotential: Potencial | null
  statusBadge: ReactNode
}

export function PotencialForm({
  formData,
  setFormData,
  currentPotential,
  statusBadge,
}: PotencialFormProps) {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-center">
      <div className="flex items-center gap-2">
        <Label className="w-32 text-right shrink-0 font-medium text-muted-foreground">
          Nº Cotação <span className="text-destructive">*</span>
        </Label>
        <Input
          value={formData.numero_potencial}
          onChange={(e) => setFormData((p: any) => ({ ...p, numero_potencial: e.target.value }))}
          placeholder="Ex: POT-2026-001"
          className={`h-8 flex-1 ${!formData.numero_potencial ? 'border-destructive focus-visible:ring-destructive' : ''}`}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="w-32 text-right shrink-0 font-medium text-muted-foreground">
          Cliente
        </Label>
        <Input
          value={formData.cliente}
          onChange={(e) => setFormData((p: any) => ({ ...p, cliente: e.target.value }))}
          placeholder="Nome do cliente"
          className="h-8 flex-1"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="w-32 text-right shrink-0 font-medium text-muted-foreground">
          Nome Cotação
        </Label>
        <Input
          value={formData.nome_potencial}
          onChange={(e) => setFormData((p: any) => ({ ...p, nome_potencial: e.target.value }))}
          placeholder="Ex: Fornecimento Obra Y"
          className="h-8 flex-1"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="w-32 text-right shrink-0 font-medium text-muted-foreground">
          Proprietário
        </Label>
        <Input
          value={formData.proprietario}
          onChange={(e) => setFormData((p: any) => ({ ...p, proprietario: e.target.value }))}
          placeholder="Responsável"
          className="h-8 flex-1"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="w-32 text-right shrink-0 font-medium text-muted-foreground">
          Estágio
        </Label>
        <Select
          value={formData.estagio}
          onValueChange={(v) => setFormData((p: any) => ({ ...p, estagio: v }))}
        >
          <SelectTrigger className="h-8 flex-1">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Qualificação">Qualificação</SelectItem>
            <SelectItem value="Em Negociação">Em Negociação</SelectItem>
            <SelectItem value="Proposta Enviada">Proposta Enviada</SelectItem>
            <SelectItem value="Fechado Ganho">Fechado Ganho</SelectItem>
            <SelectItem value="Fechado Perdido">Fechado Perdido</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Label className="w-32 text-right shrink-0 font-medium text-muted-foreground">
          Data Solicitação
        </Label>
        <Input
          value={
            currentPotential?.created
              ? format(new Date(currentPotential.created), 'dd/MM/yyyy HH:mm')
              : 'Automático'
          }
          readOnly
          className="h-8 flex-1 bg-muted text-muted-foreground"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="w-32 text-right shrink-0 font-medium text-muted-foreground">
          Status Itens
        </Label>
        <div className="flex-1 flex items-center h-8">{statusBadge}</div>
      </div>
      <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 flex items-start gap-2 mt-2">
        <Label className="w-32 text-right shrink-0 font-medium text-muted-foreground mt-2">
          Observações
        </Label>
        <Textarea
          value={formData.observacoes}
          onChange={(e) => setFormData((p: any) => ({ ...p, observacoes: e.target.value }))}
          placeholder="Detalhes adicionais da cotação..."
          className="min-h-[60px] flex-1 resize-y"
        />
      </div>
    </div>
  )
}
