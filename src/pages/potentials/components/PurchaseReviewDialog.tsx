import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { computeVenda } from '@/lib/money'
import {
  confirmarCompra,
  salvarMargemNegociada,
  toConfirmarCompraError,
  type ConfirmarCompraPayload,
} from '@/services/cotacaoConfirmacao'
import {
  carregarNegociacao,
  mensagemNegociacao,
  novaChaveNegociacao,
  numeroDecimal,
  payloadConfirmacao,
  registrarNegociacao,
  validadeResposta,
  type NegociacaoContexto,
  type RegistrarNegociacaoPayload,
} from '@/services/negociacaoCotacao'

export interface RevisaoItem {
  ofertaId: string
  linhaId: string
  titulo: string
}
export function PurchaseReviewDialog({
  items,
  onClose,
  onConfirmed,
}: {
  items: RevisaoItem[]
  onClose: () => void
  onConfirmed: () => void
}) {
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  // Estado "revisado e aprovado" por item: sobrevive à troca de item na navegação.
  const [approved, setApproved] = useState<Record<string, boolean>>({})
  const toggleApproved = (key: string, value: boolean) =>
    setApproved((prev) => ({ ...prev, [key]: value }))
  return (
    <Dialog
      open={items.length > 0}
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          if (busy) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Revisar compras selecionadas</DialogTitle>
          <DialogDescription>
            Confira a resposta do fabricante, a margem e os valores antes de confirmar cada item.
            Duplo clique no nome do item marca como revisado e aprovado.
          </DialogDescription>
        </DialogHeader>
        {items.length > 1 && (
          <div className="flex flex-wrap gap-2" aria-label="Itens para revisar">
            {items.map((x, i) => {
              const key = x.ofertaId + ':' + x.linhaId
              return (
                <Button
                  key={key}
                  size="sm"
                  variant={i === index ? 'default' : 'outline'}
                  disabled={busy}
                  onDoubleClick={() => toggleApproved(key, true)}
                  title="Duplo clique marca o item como revisado e aprovado"
                  onClick={() => setIndex(i)}
                  className={cn(
                    approved[key] && 'border-green-600 bg-green-600 text-white hover:bg-green-700',
                    i === index && !approved[key] && 'default',
                  )}
                >
                  {i + 1}. {x.titulo}
                  {approved[key] ? ' ✓' : ''}
                </Button>
              )
            })}
          </div>
        )}
        {items[index] && (
          <ReviewItem
            key={items[index].ofertaId + ':' + items[index].linhaId}
            item={items[index]}
            onBusy={setBusy}
            onConfirmed={onConfirmed}
            approved={approved[items[index].ofertaId + ':' + items[index].linhaId] === true}
            onToggleApproved={(v: boolean) =>
              toggleApproved(items[index].ofertaId + ':' + items[index].linhaId, v)
            }
          />
        )}
        <div className="flex justify-end">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Fechar revisão
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
function ReviewItem({
  item,
  onBusy,
  onConfirmed,
  approved,
  onToggleApproved,
}: {
  item: RevisaoItem
  onBusy: (b: boolean) => void
  onConfirmed: () => void
  approved?: boolean
  onToggleApproved?: (v: boolean) => void
}) {
  const { user } = useAuth()
  const [context, setContext] = useState<NegociacaoContexto | null>(null)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const running = useRef(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [margin, setMargin] = useState('')
  const [precision, setPrecision] = useState<2 | 3>(2)
  const [adjust, setAdjust] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [receipt, setReceipt] = useState<any>(null)
  const [response, setResponse] = useState({
    preco: '',
    moq: '0',
    moeda: '',
    validade: '',
    referencia: '',
    incoterm: '',
    pagamento: '',
    fabricacao: '',
  })
  const [attested, setAttested] = useState(false)
  const pendingConfirm = useRef<ConfirmarCompraPayload | null>(null)
  const pendingResponse = useRef<RegistrarNegociacaoPayload | null>(null)
  const [uncertain, setUncertain] = useState(false)
  useEffect(() => {
    onBusy(busy || uncertain)
  }, [busy, uncertain, onBusy])
  const authorized = user?.pode_confirmar_compra === true
  const load = async () => {
    const c = await carregarNegociacao(item.ofertaId, item.linhaId)
    setContext(c)
    setMargin(c.oferta.margem_versao >= 1 ? String(c.oferta.margem_negociada) : '')
    setPrecision(c.oferta.precisao_negociada === 3 ? 3 : 2)
    setResponse({
      preco: String(c.oferta.preco_ofertado || ''),
      moq: String(c.oferta.quantidade_minima || 0),
      moeda: c.resposta?.moeda || c.cotacao.oferta_moeda || '',
      validade: '',
      referencia: '',
      incoterm: c.cotacao.incoterm || '',
      pagamento: c.cotacao.condicao_pagamento || '',
      fabricacao: c.cotacao.tempo_fabricacao || '',
    })
    setReviewed(false)
    setAdjust(false)
    return c
  }
  useEffect(() => {
    let active = true
    carregarNegociacao(item.ofertaId, item.linhaId)
      .then((c) => {
        if (!active) return
        setContext(c)
        setStep(c.resposta ? 1 : 0)
        setMargin(c.oferta.margem_versao >= 1 ? String(c.oferta.margem_negociada) : '')
        setPrecision(c.oferta.precisao_negociada === 3 ? 3 : 2)
        setResponse({
          preco: String(c.oferta.preco_ofertado || ''),
          moq: String(c.oferta.quantidade_minima || 0),
          moeda: c.resposta?.moeda || c.cotacao.oferta_moeda || '',
          validade: '',
          referencia: '',
          incoterm: c.cotacao.incoterm || '',
          pagamento: c.cotacao.condicao_pagamento || '',
          fabricacao: c.cotacao.tempo_fabricacao || '',
        })
      })
      .catch((e) => {
        if (active) setError(mensagemNegociacao(e))
      })
    return () => {
      active = false
    }
  }, [item.ofertaId, item.linhaId])
  const run = async (fn: () => Promise<void>) => {
    if (running.current) return
    running.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await fn()
    } catch (e) {
      setError(mensagemNegociacao(e))
    } finally {
      running.current = false
      setBusy(false)
    }
  }
  const saveResponse = () =>
    run(async () => {
      if (!context) return
      if (!pendingResponse.current) {
        const price = numeroDecimal(response.preco),
          moq = numeroDecimal(response.moq)
        if (
          !attested ||
          !Number.isFinite(price) ||
          price <= 0 ||
          !Number.isFinite(moq) ||
          moq < 0 ||
          !response.referencia.trim() ||
          !validadeResposta(response.validade) ||
          !/^[A-Z]{3}$/.test(response.moeda)
        )
          throw new Error(
            'Preencha preço, MOQ, moeda, validade e referência, e confirme a origem da resposta.',
          )
        pendingResponse.current = {
          cotacao_iten_id: context.oferta.id,
          potencial_iten_id: context.linha.id,
          versao: context.oferta.updated,
          versao_cotacao: context.cotacao.updated,
          versao_item: context.linha.updated,
          tipo: 'resposta_fabricante',
          preco: price,
          moq,
          moeda: response.moeda,
          unidade: context.linha.unidade_medida,
          validade_oferta: validadeResposta(response.validade),
          data_oferta: new Date().toISOString(),
          referencia_resposta: response.referencia,
          incoterm: response.incoterm,
          condicao_pagamento: response.pagamento,
          tempo_fabricacao: response.fabricacao,
          confirmo_resposta_fabricante: true,
          idempotency_key: novaChaveNegociacao(),
        }
      }
      try {
        await registrarNegociacao(pendingResponse.current)
        pendingResponse.current = null
        setUncertain(false)
        await load()
        setStep(1)
        setNotice('Resposta registrada. Confira agora a margem de venda.')
      } catch (e) {
        const err = toConfirmarCompraError(e)
        if ((err.status >= 400 && err.status < 500) || err.code === 'confirmacao_em_validacao') {
          pendingResponse.current = null
          setUncertain(false)
        } else setUncertain(true)
        throw e
      }
    })
  const saveMargin = () =>
    run(async () => {
      if (!context) return
      const m = numeroDecimal(margin)
      if (!Number.isFinite(m) || m < 0 || m >= 100)
        throw new Error('Informe uma margem entre 0 e menos de 100%.')
      try {
        await salvarMargemNegociada({
          cotacao_iten_id: context.oferta.id,
          versao: context.oferta.updated,
          margem_versao_esperada: context.oferta.margem_versao || 0,
          margem_negociada: m,
          precisao_negociada: precision,
        })
        await load()
        setStep(2)
      } catch (e) {
        const original = e
        await load().catch(() => {})
        throw original
      }
    })
  const confirm = () =>
    run(async () => {
      if (!context || !context.resposta) return
      if (!pendingConfirm.current) pendingConfirm.current = payloadConfirmacao(context, adjust)
      try {
        const result = await confirmarCompra(pendingConfirm.current)
        pendingConfirm.current = null
        setUncertain(false)
        setReceipt(result.recibo)
        await load().catch(() => {})
        onConfirmed()
      } catch (e) {
        const err = toConfirmarCompraError(e)
        if ((err.status >= 400 && err.status < 500) || err.code === 'confirmacao_em_validacao') {
          pendingConfirm.current = null
          setUncertain(false)
        } else setUncertain(true)
        throw e
      }
    })
  const money = (n: number, currency = context?.resposta?.moeda || response.moeda) =>
    Number.isFinite(n)
      ? `${currency} ${n.toLocaleString('pt-BR', { minimumFractionDigits: precision, maximumFractionDigits: precision })}`
      : '—'
  if (!context) return <div role="status">{error || 'Carregando dados da cotação…'}</div>
  const evidence = context.resposta
  const amount = evidence?.preco || 0
  const marginNumber = numeroDecimal(margin)
  const sale = computeVenda(amount, marginNumber)
  const rounded = sale !== undefined ? Number(sale.toFixed(precision)) : NaN
  const quantity = adjust
    ? Math.max(context.linha.quantidade, evidence?.moq || 0)
    : context.linha.quantidade
  const needsMoq = !!evidence && context.linha.quantidade < evidence.moq
  const termsValid = !!evidence && Date.parse(evidence.validade_oferta) >= Date.now()
  const marginSaved =
    context.oferta.margem_versao >= 1 &&
    Number(context.oferta.margem_negociada) === marginNumber &&
    context.oferta.precisao_negociada === precision
  const canConfirm =
    authorized &&
    termsValid &&
    marginSaved &&
    (!needsMoq || adjust) &&
    (reviewed || approved) &&
    !context.confirmada &&
    !receipt
  const field = (key: keyof typeof response, label: string, type = 'text') => (
    <div className="space-y-1">
      <Label htmlFor={'resposta-' + key}>{label}</Label>
      <Input
        id={'resposta-' + key}
        type={type}
        disabled={busy || uncertain || !authorized}
        value={response[key]}
        onChange={(e) =>
          setResponse({
            ...response,
            [key]: key === 'moeda' ? e.target.value.toUpperCase() : e.target.value,
          })
        }
      />
    </div>
  )
  // Informações gerais da cotação (não são por item): moeda, validade, incoterm,
  // pagamento e fabricação — exibidas uma única vez, fora do cartão do item.
  const generalInfo = (
    <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground mb-1">Condições gerais do fornecedor</p>
      <p>
        Moeda: <strong>{context.resposta?.moeda || context.cotacao.oferta_moeda || '—'}</strong> ·
        Validade:{' '}
        <strong>
          {context.resposta
            ? new Date(context.resposta.validade_oferta).toLocaleDateString('pt-BR')
            : '—'}
        </strong>
      </p>
      <p>
        Incoterm: <strong>{context.cotacao.incoterm || '—'}</strong> · Pagamento:{' '}
        <strong>{context.cotacao.condicao_pagamento || '—'}</strong> · Fabricação:{' '}
        <strong>{context.cotacao.tempo_fabricacao || '—'}</strong>
      </p>
      {context.resposta?.incoterm && (
        <p>
          Na resposta: Incoterm <strong>{context.resposta.incoterm}</strong> · Pagamento{' '}
          <strong>{context.resposta.condicao_pagamento || '—'}</strong> · Fabricação{' '}
          <strong>{context.resposta.tempo_fabricacao || '—'}</strong>
        </p>
      )}
    </div>
  )
  const moqInfo = Number(context.resposta?.moq ?? context.oferta.quantidade_minima ?? 0)
  const belowMoq = moqInfo > 0 && context.linha.quantidade < moqInfo
  return (
    <div
      className="space-y-4"
      aria-busy={busy}
      onDoubleClick={(e) => {
        // Duplo clique em qualquer área livre do cartão marca revisado e aprovado.
        const t = e.target as HTMLElement
        if (t.closest('input, select, textarea, button, label, a')) return
        onToggleApproved?.(true)
      }}
    >
      <div
        className="rounded-lg border p-3 cursor-pointer select-none"
        onDoubleClick={() => onToggleApproved?.(true)}
        title="Duplo clique marca como revisado e aprovado"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">
              {context.produto.sku} · {context.fabricante.nome}
            </p>
            <p className="text-sm text-muted-foreground">
              Quantidade solicitada: {context.linha.quantidade} {context.linha.unidade_medida}
              {context.oferta.preco_contraproposta > 0
                ? ` · Alvo C2: ${money(context.oferta.preco_contraproposta)}`
                : ''}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Preço</p>
            <p className="font-bold text-sm">
              {context.resposta ? money(context.resposta.preco, context.resposta.moeda) : '—'}
            </p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-1">MOQ</p>
            {moqInfo > 0 ? (
              <p
                className={cn('font-bold text-sm', belowMoq ? 'text-red-700' : 'text-emerald-700')}
              >
                {moqInfo} {context.linha.unidade_medida}
                {belowMoq && ' ⚠ abaixo do pedido'}
              </p>
            ) : (
              <p className="font-bold text-sm text-muted-foreground">sem MOQ</p>
            )}
          </div>
        </div>
        {approved && (
          <p className="mt-2 text-xs font-semibold text-green-700" role="status">
            ✓ Revisado e aprovado
          </p>
        )}
        {!approved && (
          <p className="mt-2 text-[11px] text-muted-foreground italic">
            Dica: duplo clique no cartão (ou no nome do item acima) para marcar como revisado e
            aprovado.
          </p>
        )}
      </div>
      {generalInfo}
      {!authorized && (
        <p role="alert" className="rounded border p-3 text-sm">
          Sua conta ainda não está habilitada para confirmar compras. Atualize sua sessão após a
          liberação da equipe.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-green-800">
          {notice}
        </p>
      )}
      {receipt ? (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4" role="status">
          <h3 className="font-semibold text-green-900">Compra confirmada</h3>
          <p>
            {money(receipt.preco_compra)} de compra · {money(receipt.preco_unitario)} de venda ·{' '}
            {receipt.quantidade} {receipt.unidade}
          </p>
          <p className="text-xs mt-2">
            Registro: {receipt.rodada.id} ·{' '}
            {new Date(receipt.data_confirmacao).toLocaleString('pt-BR')}
          </p>
        </div>
      ) : (
        <>
          {context.confirmada && (
            <p className="rounded bg-green-50 p-3 text-green-900" role="status">
              Esta resposta já foi confirmada. Para uma nova negociação, registre uma nova resposta
              recebida do fabricante.
            </p>
          )}
          <nav className="flex flex-wrap gap-2" aria-label="Etapas da compra">
            {['1. Resposta do fabricante', '2. Margem e venda', '3. Conferência'].map((name, i) => (
              <Button
                key={name}
                size="sm"
                variant={step === i ? 'default' : 'outline'}
                disabled={busy || uncertain || (i > 0 && !evidence)}
                onClick={() => setStep(i)}
              >
                {name}
              </Button>
            ))}
          </nav>
          {step === 0 && (
            <section className="space-y-3" aria-label="Registro da resposta">
              <p className="text-sm text-muted-foreground">
                Registre o que o fabricante respondeu. O alvo da C2 não preenche este registro e a
                compra só muda após a confirmação final.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {field('preco', 'Preço recebido')}
                {field('moeda', 'Moeda (USD, CNY, EUR…)')}
                {field('moq', 'Quantidade mínima (MOQ)')}
                {field('validade', 'Válida até (DD/MM/AAAA)')}
                {field('incoterm', 'Incoterm')}
                {field('pagamento', 'Condição de pagamento')}
                {field('fabricacao', 'Tempo de fabricação')}
                {field('referencia', 'Referência da resposta (e-mail, data ou observação)')}
              </div>
              <p className="text-sm">
                Unidade: {context.linha.unidade_medida}. A moeda não é convertida automaticamente.
              </p>
              <label className="flex gap-2 text-sm items-start">
                <Checkbox
                  aria-label="Confirmo a origem da resposta"
                  checked={attested}
                  disabled={busy || uncertain || !authorized}
                  onCheckedChange={(v) => setAttested(v === true)}
                />
                Confirmo que estes dados correspondem à resposta recebida do fabricante.
              </label>
              <Button disabled={busy || !authorized} onClick={saveResponse}>
                {busy
                  ? 'Registrando…'
                  : pendingResponse.current
                    ? 'Tentar registrar novamente'
                    : 'Registrar resposta e continuar'}
              </Button>
            </section>
          )}
          {step === 1 && evidence && (
            <section className="space-y-3" aria-label="Margem e venda">
              <div className="rounded bg-muted p-3 text-sm">
                Resposta recebida: <strong>{money(evidence.preco, evidence.moeda)}</strong> por{' '}
                {evidence.unidade}. Válida até{' '}
                {new Date(evidence.validade_oferta).toLocaleDateString('pt-BR')}.
                <p>{evidence.observacoes}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="margem-venda">Margem sobre a venda (%)</Label>
                  <Input
                    id="margem-venda"
                    inputMode="decimal"
                    value={margin}
                    disabled={busy || !authorized}
                    onChange={(e) => {
                      setMargin(e.target.value)
                      setReviewed(false)
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="precisao-venda">Casas decimais do preço</Label>
                  <select
                    id="precisao-venda"
                    className="flex h-10 w-full rounded-md border bg-background px-3"
                    value={precision}
                    disabled={busy || !authorized}
                    onChange={(e) => {
                      setPrecision(Number(e.target.value) as 2 | 3)
                      setReviewed(false)
                    }}
                  >
                    <option value="2">2 casas</option>
                    <option value="3">3 casas</option>
                  </select>
                </div>
              </div>
              <p>
                Preço de venda calculado: <strong>{money(rounded, evidence.moeda)}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Venda = compra ÷ (1 − margem/100). Nenhuma margem padrão é aplicada sem sua escolha.
              </p>
              <Button disabled={busy || !authorized || !termsValid} onClick={saveMargin}>
                {busy ? 'Salvando…' : 'Salvar margem e conferir'}
              </Button>
              {!termsValid && (
                <p role="alert" className="text-sm text-red-700">
                  A resposta venceu. Registre uma nova resposta antes de continuar.
                </p>
              )}
            </section>
          )}
          {step === 2 && evidence && (
            <section className="space-y-3" aria-label="Conferência final">
              <p className="text-xs text-muted-foreground">
                Moeda, validade, incoterm, pagamento e fabricação são condições gerais do fornecedor
                e aparecem no topo desta revisão.
              </p>
              <dl className="grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm">
                <div>
                  <dt>Compra unitária</dt>
                  <dd className="font-semibold">{money(amount, evidence.moeda)}</dd>
                </div>
                <div>
                  <dt>Venda unitária</dt>
                  <dd className="font-semibold">{money(rounded, evidence.moeda)}</dd>
                </div>
                <div>
                  <dt>Quantidade</dt>
                  <dd>
                    {quantity} {evidence.unidade}
                  </dd>
                </div>
                <div>
                  <dt>Margem sobre venda</dt>
                  <dd>{margin}%</dd>
                </div>
                <div>
                  <dt>Total de compra</dt>
                  <dd>{money(amount * quantity, evidence.moeda)}</dd>
                </div>
                <div>
                  <dt>Total de venda</dt>
                  <dd>{money(rounded * quantity, evidence.moeda)}</dd>
                </div>
              </dl>
              {needsMoq && (
                <label className="flex items-start gap-2 rounded border border-amber-300 p-3 text-sm">
                  <Checkbox
                    aria-label="Ajustar quantidade ao MOQ"
                    disabled={busy || uncertain}
                    checked={adjust}
                    onCheckedChange={(v) => {
                      setAdjust(v === true)
                      setReviewed(false)
                    }}
                  />
                  A quantidade solicitada é {context.linha.quantidade}. Autorizo ajustar para o
                  mínimo de {evidence.moq} {evidence.unidade}.
                </label>
              )}
              {!marginSaved && (
                <p role="alert" className="text-sm text-amber-800">
                  Salve a margem e a precisão antes de confirmar.
                </p>
              )}
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  aria-label="Conferi os dados da compra"
                  checked={reviewed || approved}
                  disabled={busy || uncertain || !authorized || approved}
                  onCheckedChange={(v) => setReviewed(v === true)}
                />
                {approved
                  ? 'Revisado e aprovado por duplo clique.'
                  : 'Conferi fabricante, resposta, unidade, quantidade, margem e condições.'}
              </label>
              <Button disabled={busy || (!canConfirm && !pendingConfirm.current)} onClick={confirm}>
                {busy
                  ? 'Confirmando…'
                  : pendingConfirm.current
                    ? 'Tentar confirmar novamente'
                    : 'Confirmar compra deste item'}
              </Button>
            </section>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={busy || uncertain}
            onClick={() =>
              run(async () => {
                await load()
                setNotice('Dados atualizados. Confira novamente antes de confirmar.')
              })
            }
          >
            Atualizar dados
          </Button>
        </>
      )}
      <details className="rounded border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Histórico de negociação ({context.rodadas.length})
        </summary>
        <ol className="mt-3 space-y-3 text-sm">
          {context.rodadas.map((r) => (
            <li key={r.id} className="border-t pt-2">
              <Badge variant="outline">
                {{
                  contraproposta_c2: 'Alvo C2',
                  resposta_fabricante: 'Resposta do fabricante',
                  selecao: 'Compra confirmada',
                  oferta_original: 'Oferta original',
                  oferta_confirmada: 'Oferta confirmada',
                }[r.tipo] || r.tipo}
              </Badge>
              <span className="ml-2">
                {money(r.preco, r.moeda)} · {new Date(r.created).toLocaleString('pt-BR')}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {r.observacoes} · Responsável: {r.autor}
              </p>
            </li>
          ))}
        </ol>
        {!context.rodadas.length && (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum registro ainda.</p>
        )}
      </details>
    </div>
  )
}
