import { Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import pb from '@/lib/pocketbase/client'
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
  const handleRemoveAnexo = async (filename: string) => {
    if (!currentPotential?.id) return
    try {
      await pb.collection('potenciais').update(currentPotential.id, {
        'anexos-': filename,
      })
      if (formData.anexos) {
        setFormData({ ...formData, anexos: formData.anexos.filter((a: string) => a !== filename) })
      }
    } catch (err) {
      console.error('Failed to remove attachment', err)
    }
  }

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
        <select
          className="flex-1 h-7 rounded-md border border-input bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          value={formData.status || 'Sem Itens'}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
        >
          <option value="Sem Itens">Sem Itens</option>
          <option value="rascunho">Rascunho</option>
          <option value="Incompleto">Incompleto</option>
          <option value="Completo">Completo</option>
          <option value="Aguardando Cotação Fornecedor">Aguardando Cotação</option>
          <option value="Cotação Recebida">Cotação Recebida</option>
          <option value="Negociação">Negociação</option>
          <option value="Fechado Ganho">Fechado Ganho</option>
          <option value="Fechado Perdido">Fechado Perdido</option>
        </select>
      </div>

      <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3 mt-1">
        <Label className="text-xs font-semibold text-muted-foreground">
          Notas (Comunicação Interna):
        </Label>
        <Textarea
          className="min-h-[60px] text-xs resize-y"
          placeholder="Adicione notas, dúvidas ou observações sobre esta cotação..."
          value={formData.notas || ''}
          onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3 mt-1">
        <Label className="text-xs font-semibold text-muted-foreground">Anexos:</Label>
        <div className="flex flex-col gap-2">
          <Input
            type="file"
            multiple
            className="text-xs h-8 cursor-pointer file:cursor-pointer"
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              setFormData({ ...formData, novos_anexos: files })
            }}
          />
          {((formData.anexos || []) as string[]).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {(formData.anexos as string[]).map((anexo: string) => (
                <div
                  key={anexo}
                  className="flex items-center gap-1 bg-slate-50 p-1 px-2 rounded-md border text-xs group"
                >
                  <Paperclip className="h-3 w-3 text-muted-foreground" />
                  <a
                    href={currentPotential ? pb.files.getURL(currentPotential, anexo) : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline max-w-[200px] truncate"
                    title={anexo}
                  >
                    {anexo}
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => handleRemoveAnexo(anexo)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
