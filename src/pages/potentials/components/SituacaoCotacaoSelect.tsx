import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const SITUACOES = [
  'Aguardando especificações',
  'Aguardando cotação dos fabricantes',
  'Cotações recebidas',
  'Em negociação',
  'Em formação de preço',
  'Cotação concluída',
  'Cancelada',
]

export const CORES_SITUACAO: Record<string, string> = {
  'Aguardando especificações': 'bg-slate-100 text-slate-700',
  'Aguardando cotação dos fabricantes': 'bg-amber-100 text-amber-800',
  'Cotações recebidas': 'bg-blue-100 text-blue-800',
  'Em negociação': 'bg-violet-100 text-violet-800',
  'Em formação de preço': 'bg-cyan-100 text-cyan-800',
  'Cotação concluída': 'bg-emerald-100 text-emerald-800',
  Cancelada: 'bg-rose-100 text-rose-800',
}

export default function SituacaoCotacaoSelect({
  potencialId,
  value,
  onChange,
  disabled,
}: {
  potencialId?: string | null
  value?: string
  onChange?: (v: string) => void
  disabled?: boolean
}) {
  const [situacao, setSituacao] = useState(value || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (value !== undefined) {
      setSituacao(value)
      return
    }
    if (!potencialId) return
    let alive = true
    pb.collection('potenciais')
      .getOne(potencialId)
      .then((rec: any) => {
        if (alive) setSituacao(rec.situacao_cotacao || '')
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [potencialId, value])

  const trocar = async (v: string) => {
    setSituacao(v)
    onChange?.(v)
    if (!potencialId) return
    setSaving(true)
    try {
      await pb.collection('potenciais').update(potencialId, { situacao_cotacao: v })
    } catch (err: any) {
      console.error('Erro ao salvar situação da cotação', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
        Situação da Cotação — Compras:
      </span>
      <Select value={situacao} onValueChange={trocar} disabled={disabled || saving}>
        <SelectTrigger className="h-7 w-[240px] text-xs">
          <SelectValue placeholder="Selecione…" />
        </SelectTrigger>
        <SelectContent>
          {SITUACOES.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {situacao && (
        <Badge
          variant="outline"
          className={`text-[10px] border-transparent ${CORES[situacao] || ''}`}
        >
          {saving ? 'salvando…' : ''}
        </Badge>
      )}
    </div>
  )
}

export { SITUACOES }
// CORES_SITUACAO exportado acima para uso na lista de potenciais
