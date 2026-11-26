import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/hooks/use-auth'
import {
  carregarNegociacao,
  mensagemNegociacao,
  novaChaveNegociacao,
  numeroDecimal,
  registrarNegociacao,
  type RegistrarNegociacaoPayload,
} from '@/services/negociacaoCotacao'
import { toConfirmarCompraError } from '@/services/cotacaoConfirmacao'

interface TargetRow {
  id: string
  linhaId: string
  sku: string
  fabricante: string
  oferta: number
  alvo: string
  selected: boolean
}
export function CounterProposalModal({
  open,
  onOpenChange,
  cotacoesI,
  potencialItens,
  cotacoesF,
  onSaved,
}: any) {
  const { user } = useAuth()
  const [rows, setRows] = useState<TargetRow[]>([])
  const [discount, setDiscount] = useState('5')
  const [supplier, setSupplier] = useState('all')
  const [busy, setBusy] = useState(false)
  const running = useRef(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const pending = useRef<Record<string, RegistrarNegociacaoPayload>>({})
  useEffect(() => {
    if (!open) return
    pending.current = {}
    setError('')
    setNotice('')
    setUncertain(false)
    setRows(
      cotacoesI
        .filter((c: any) => c.preco_ofertado > 0)
        .map((c: any) => {
          const matches = potencialItens.filter((p: any) => p.item_id === c.item_id)
          const cf = cotacoesF.find((f: any) => f.id === c.cotacao_fornecedor_id)
          return {
            id: c.id,
            linhaId: matches.length === 1 ? matches[0].id : '',
            sku: matches[0]?.expand?.item_id?.sku || 'Produto',
            fabricante: cf?.expand?.fornecedor_id?.nome || 'Fabricante',
            oferta: c.preco_ofertado,
            alvo: String(c.preco_contraproposta || c.preco_ofertado),
            selected: matches.length === 1,
          }
        }),
    )
    setSupplier('all')
    // Drafts are initialized only on open, never overwritten by a realtime refresh.
  }, [open])
  const visible = rows.filter((r) => supplier === 'all' || r.fabricante === supplier)
  const simulate = () => {
    const d = numeroDecimal(discount)
    if (!Number.isFinite(d) || d < 0 || d >= 100) {
      setError('Informe um desconto entre 0 e menos de 100%.')
      return
    }
    setError('')
    setRows((prev) =>
      prev.map((r) =>
        visible.some((v) => v.id === r.id) && r.selected
          ? { ...r, alvo: (r.oferta * (1 - d / 100)).toFixed(3) }
          : r,
      ),
    )
  }
  const save = async () => {
    if (running.current) return
    const selected = visible.filter((r) => r.selected)
    if (!selected.length) {
      setError('Selecione pelo menos um item.')
      return
    }
    if (
      selected.some(
        (r) => !r.linhaId || !Number.isFinite(numeroDecimal(r.alvo)) || numeroDecimal(r.alvo) <= 0,
      )
    ) {
      setError('Preencha alvos maiores que zero e escolha linhas sem ambiguidade.')
      return
    }
    running.current = true
    setBusy(true)
    setError('')
    setNotice('')
    const saved: string[] = [],
      failures: string[] = []
    let unknown = false
    for (const row of selected) {
      try {
        if (!pending.current[row.id]) {
          const c = await carregarNegociacao(row.id, row.linhaId)
          pending.current[row.id] = {
            cotacao_iten_id: c.oferta.id,
            potencial_iten_id: c.linha.id,
            versao: c.oferta.updated,
            versao_cotacao: c.cotacao.updated,
            versao_item: c.linha.updated,
            tipo: 'contraproposta_c2',
            moeda: c.resposta?.moeda || c.cotacao.oferta_moeda || c.linha.moeda_compra,
            preco: numeroDecimal(row.alvo),
            idempotency_key: novaChaveNegociacao(),
          }
        }
        await registrarNegociacao(pending.current[row.id])
        delete pending.current[row.id]
        saved.push(row.id)
      } catch (e) {
        const err = toConfirmarCompraError(e)
        if ((err.status >= 400 && err.status < 500) || err.code === 'confirmacao_em_validacao')
          delete pending.current[row.id]
        else unknown = true
        failures.push(row.sku + ': ' + mensagemNegociacao(e))
      }
    }
    setRows((prev) => prev.map((r) => (saved.includes(r.id) ? { ...r, selected: false } : r)))
    setUncertain(unknown)
    if (saved.length) {
      setNotice(`${saved.length} alvo(s) salvo(s). Nenhuma compra foi confirmada.`)
      await onSaved?.()
    }
    if (failures.length) setError(failures.join('\n'))
    running.current = false
    setBusy(false)
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy && !uncertain) onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Preparar contraproposta</DialogTitle>
          <DialogDescription>
            Defina os preços alvo da C2. Depois de receber a resposta do fabricante, registre-a e
            revise a compra.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p
            role="alert"
            className="whitespace-pre-line rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-green-800">
            {notice}
          </p>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="fabricante-alvo">Fabricante</Label>
            <select
              id="fabricante-alvo"
              className="block h-10 rounded border bg-background px-3"
              value={supplier}
              disabled={busy || uncertain}
              onChange={(e) => setSupplier(e.target.value)}
            >
              <option value="all">Todos</option>
              {Array.from(new Set(rows.map((r) => r.fabricante))).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="desconto-alvo">Desconto sobre a oferta (%)</Label>
            <Input
              id="desconto-alvo"
              className="w-32"
              inputMode="decimal"
              value={discount}
              disabled={busy || uncertain}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>
          <Button variant="secondary" disabled={busy || uncertain} onClick={simulate}>
            Simular nos selecionados
          </Button>
        </div>
        <div className="overflow-auto max-h-[45vh] rounded border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="p-3">
                  <Checkbox
                    aria-label="Selecionar todos os alvos visíveis"
                    disabled={busy || uncertain}
                    checked={visible.length > 0 && visible.every((r) => r.selected)}
                    onCheckedChange={(v) =>
                      setRows((prev) =>
                        prev.map((r) =>
                          visible.some((x) => x.id === r.id) && r.linhaId
                            ? { ...r, selected: v === true }
                            : r,
                        ),
                      )
                    }
                  />
                </th>
                <th className="text-left p-3">SKU / fabricante</th>
                <th className="p-3 text-right">Oferta atual</th>
                <th className="p-3 text-right">Alvo C2</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3">
                    <Checkbox
                      aria-label={'Selecionar ' + row.sku}
                      disabled={busy || uncertain || !row.linhaId}
                      checked={row.selected}
                      onCheckedChange={(v) =>
                        setRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, selected: v === true } : r)),
                        )
                      }
                    />
                  </td>
                  <td className="p-3">
                    <strong>{row.sku}</strong>
                    <div className="text-xs text-muted-foreground">{row.fabricante}</div>
                    {!row.linhaId && (
                      <p className="text-xs text-red-700">Revise pela linha do potencial.</p>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono">{row.oferta.toFixed(3)}</td>
                  <td className="p-3">
                    <Input
                      aria-label={'Alvo ' + row.sku}
                      className="w-28 text-right"
                      inputMode="decimal"
                      value={row.alvo}
                      disabled={busy || uncertain}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, alvo: e.target.value } : r)),
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <p className="p-4 text-muted-foreground">
              Preencha e salve as ofertas dos fabricantes para preparar os alvos.
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Cada alvo é salvo com histórico próprio. Se algum item falhar, os itens concluídos
          aparecem desmarcados e os demais continuam selecionados.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={busy || uncertain}
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          <Button disabled={busy || !user?.pode_confirmar_compra} onClick={save}>
            {busy
              ? 'Salvando…'
              : uncertain
                ? 'Tentar salvar novamente'
                : 'Salvar alvos selecionados'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
