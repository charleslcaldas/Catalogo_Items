import { useState, useEffect } from 'react'
import { Trash2, PackageOpen, ArrowRight, Save, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormattedInput } from '@/components/FormattedInput'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SelectedItemData } from '../AddItemsToPotential'
import type { Potencial } from '@/types'

interface SelectionPanelProps {
  items: SelectedItemData[]
  currentPotential: Potencial | null
  isSaving: boolean
  onUpdate: (id: string, field: keyof SelectedItemData, value: string) => void
  onRemove: (id: string) => void
  onSave: (data: {
    numero: string
    cliente: string
    observacoes: string
    status: 'rascunho' | 'ativo'
    nome_potencial: string
    proprietario: string
    estagio: string
  }) => void
}

export function SelectionPanel({
  items,
  currentPotential,
  isSaving,
  onUpdate,
  onRemove,
  onSave,
}: SelectionPanelProps) {
  const [step, setStep] = useState(1)
  const [numero, setNumero] = useState('')
  const [cliente, setCliente] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [nomePotencial, setNomePotencial] = useState('')
  const [proprietario, setProprietario] = useState('')
  const [estagio, setEstagio] = useState('')

  useEffect(() => {
    if (currentPotential) {
      setNumero(currentPotential.numero_potencial || '')
      setCliente(currentPotential.cliente || '')
      setObservacoes(currentPotential.observacoes || '')
      setNomePotencial(currentPotential.nome_potencial || '')
      setProprietario(currentPotential.proprietario || '')
      setEstagio(currentPotential.estagio || '')
    }
  }, [currentPotential])

  const totalItems = items.length
  const estimatedValue = items.reduce((acc, curr) => {
    const q = Number(curr.quantidade) || 0
    const p = Number(curr.preco_unitario) || 0
    return acc + q * p
  }, 0)

  const handleNext = () => {
    const hasError = items.some(
      (i) =>
        i.quantidade === '' ||
        Number(i.quantidade) <= 0 ||
        !i.unidade_medida ||
        i.preco_unitario === '',
    )
    if (hasError) {
      onUpdate('VALIDATION_ERROR' as any, 'quantidade', '')
      return
    }
    setStep(2)
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="p-4 border-b font-semibold bg-slate-50 shrink-0 flex items-center justify-between">
        <span>{step === 1 ? '1. Resumo da Seleção' : '2. Detalhes da Cotação'}</span>
        {step === 2 && (
          <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs h-7">
            Voltar
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 min-h-0">
        {step === 1 ? (
          <div className="space-y-4">
            {totalItems === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground opacity-70">
                <PackageOpen className="h-12 w-12 mb-3" />
                <p className="text-sm">Nenhum item selecionado</p>
              </div>
            ) : (
              items.map((si) => (
                <div
                  key={si.item.id}
                  className="bg-white p-3 rounded-md border shadow-sm relative group"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRemove(si.item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="pr-8 mb-3">
                    <div className="font-semibold text-sm">{si.item.sku}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {si.item.descr_pt}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 mb-3">
                    <div className="col-span-4 space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Qtde *</Label>
                      <FormattedInput
                        className={`h-8 text-sm px-2 text-right ${si.quantidade === '' || Number(si.quantidade) <= 0 ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        value={si.quantidade}
                        onValueChange={(val) => onUpdate(si.item.id, 'quantidade', val)}
                      />
                    </div>
                    <div className="col-span-4 space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">
                        Unidade *
                      </Label>
                      <Select
                        value={si.unidade_medida}
                        onValueChange={(v) => onUpdate(si.item.id, 'unidade_medida', v)}
                      >
                        <SelectTrigger
                          className={`h-8 text-sm px-2 ${!si.unidade_medida ? 'border-destructive' : ''}`}
                        >
                          <SelectValue placeholder="UN" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pcs">Pcs</SelectItem>
                          <SelectItem value="MPC">MPC</SelectItem>
                          <SelectItem value="Centena">Centena</SelectItem>
                          <SelectItem value="Quilo">Quilo</SelectItem>
                          <SelectItem value="Metro">Metro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4 space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">
                        Preço $ *
                      </Label>
                      <FormattedInput
                        isPrice
                        prefixText="$"
                        className={`h-8 text-sm px-2 text-right ${si.preco_unitario === '' ? 'border-destructive' : ''}`}
                        value={si.preco_unitario}
                        onValueChange={(val) => onUpdate(si.item.id, 'preco_unitario', val)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Obs</Label>
                    <Input
                      className="h-7 text-xs px-2"
                      value={si.observacoes}
                      onChange={(e) => onUpdate(si.item.id, 'observacoes', e.target.value)}
                      placeholder="Opcional..."
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Número da Cotação <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Ex: POT-2026-001"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className={!numero ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome da Cotação</Label>
              <Input
                placeholder="Ex: Fornecimento Obra Y"
                value={nomePotencial}
                onChange={(e) => setNomePotencial(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                placeholder="Nome do cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Proprietário</Label>
              <Input
                placeholder="Responsável pela cotação"
                value={proprietario}
                onChange={(e) => setProprietario(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Estágio</Label>
              <Select value={estagio} onValueChange={setEstagio}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estágio" />
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
              <Label>Observações Gerais</Label>
              <Textarea
                placeholder="Detalhes adicionais da cotação..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-white shrink-0">
        {step === 1 ? (
          <>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Total de itens:</span>
              <span className="font-medium">{totalItems}</span>
            </div>
            <div className="flex justify-between items-end mb-4">
              <span className="text-sm text-muted-foreground">Valor estimado:</span>
              <span className="font-bold text-lg text-primary">
                ${' '}
                {estimatedValue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={totalItems === 0}
              onClick={handleNext}
            >
              Próximo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-end mb-4 px-2 py-3 bg-slate-50 rounded border">
              <span className="text-sm text-muted-foreground">Valor Final:</span>
              <span className="font-bold text-lg text-primary">
                ${' '}
                {estimatedValue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <Button
              className="w-full bg-slate-600 hover:bg-slate-700 text-white"
              disabled={isSaving || !numero}
              onClick={() =>
                onSave({
                  numero,
                  cliente,
                  observacoes,
                  status: 'rascunho',
                  nome_potencial: nomePotencial,
                  proprietario,
                  estagio,
                })
              }
            >
              <Save className="mr-2 h-4 w-4" /> Salvar como Rascunho
            </Button>
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={isSaving || !numero}
              onClick={() =>
                onSave({
                  numero,
                  cliente,
                  observacoes,
                  status: 'ativo',
                  nome_potencial: nomePotencial,
                  proprietario,
                  estagio,
                })
              }
            >
              <Check className="mr-2 h-4 w-4" /> Finalizar e Ativar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
