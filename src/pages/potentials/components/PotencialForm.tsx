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
    <div className="bg-white rounded-lg border shadow-sm p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="space-y-2">
        <Label>
          Número da Cotação <span className="text-destructive">*</span>
        </Label>
        <Input
          value={formData.numero_potencial}
          onChange={(e) => setFormData((p: any) => ({ ...p, numero_potencial: e.target.value }))}
          placeholder="Ex: POT-2026-001"
          className={
            !formData.numero_potencial ? 'border-destructive focus-visible:ring-destructive' : ''
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Cliente</Label>
        <Input
          value={formData.cliente}
          onChange={(e) => setFormData((p: any) => ({ ...p, cliente: e.target.value }))}
          placeholder="Nome do cliente"
        />
      </div>
      <div className="space-y-2">
        <Label>Nome da Cotação</Label>
        <Input
          value={formData.nome_potencial}
          onChange={(e) => setFormData((p: any) => ({ ...p, nome_potencial: e.target.value }))}
          placeholder="Ex: Fornecimento Obra Y"
        />
      </div>
      <div className="space-y-2">
        <Label>Proprietário</Label>
        <Input
          value={formData.proprietario}
          onChange={(e) => setFormData((p: any) => ({ ...p, proprietario: e.target.value }))}
          placeholder="Responsável"
        />
      </div>
      <div className="space-y-2">
        <Label>Estágio</Label>
        <Select
          value={formData.estagio}
          onValueChange={(v) => setFormData((p: any) => ({ ...p, estagio: v }))}
        >
          <SelectTrigger>
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
      <div className="space-y-2">
        <Label>Data da Solicitação</Label>
        <Input
          value={
            currentPotential?.created
              ? format(new Date(currentPotential.created), 'dd/MM/yyyy HH:mm')
              : 'Automático após salvar'
          }
          readOnly
          className="bg-muted text-muted-foreground"
        />
      </div>
      <div className="space-y-2">
        <Label>Status dos Itens</Label>
        <div className="h-10 flex items-center">{statusBadge}</div>
      </div>
      <div className="space-y-2 lg:col-span-4">
        <Label>Observações Gerais</Label>
        <Textarea
          value={formData.observacoes}
          onChange={(e) => setFormData((p: any) => ({ ...p, observacoes: e.target.value }))}
          placeholder="Detalhes adicionais da cotação..."
          className="min-h-[80px]"
        />
      </div>
    </div>
  )
}
