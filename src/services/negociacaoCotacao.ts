import pb from '../lib/pocketbase/client'
import {
  type ConfirmarCompraPayload,
  gerarIdempotencyKey,
  toConfirmarCompraError,
} from './cotacaoConfirmacao'
import { ClientResponseError, type RecordModel } from 'pocketbase'
import { ConfirmarCompraError } from './cotacaoConfirmacao'

export interface NegociacaoContexto {
  oferta: RecordModel
  cotacao: RecordModel
  linha: RecordModel
  potencial: RecordModel
  fabricante: RecordModel
  produto: RecordModel
  rodadas: RecordModel[]
  resposta?: RecordModel
  confirmada: boolean
}
export async function carregarNegociacao(
  ofertaId: string,
  linhaId: string,
): Promise<NegociacaoContexto> {
  const oferta = await pb.collection('cotacoes_itens').getOne(ofertaId)
  const [cotacao, linha, produto, rodadas] = await Promise.all([
    pb.collection('cotacoes_fornecedor').getOne(oferta.cotacao_fornecedor_id),
    pb.collection('potencial_itens').getOne(linhaId),
    pb.collection('itens').getOne(oferta.item_id),
    pb.collection('cotacoes_rodadas').getFullList({
      filter: pb.filter('cotacao_iten={:id}', { id: ofertaId }),
      sort: '-numero_rodada,-created,-id',
    }),
  ])
  if (linha.item_id !== produto.id || linha.potencial_id !== cotacao.potencial_id)
    throw new Error('O item não pertence a este potencial.')
  const [potencial, fabricante] = await Promise.all([
    pb.collection('potenciais').getOne(cotacao.potencial_id),
    pb.collection('fornecedores').getOne(cotacao.fornecedor_id),
  ])
  const resposta = rodadas.find(
    (r) =>
      ['oferta_original', 'resposta_fabricante', 'oferta_confirmada'].includes(r.tipo) &&
      ['recebida', 'confirmada'].includes(r.estado) &&
      r.validade_oferta,
  )
  const confirmada =
    !!resposta &&
    rodadas.some(
      (r) =>
        r.tipo === 'selecao' &&
        r.estado === 'confirmada' &&
        r.observacoes === 'Resposta de origem: ' + resposta.id,
    )
  return { oferta, cotacao, linha, produto, potencial, fabricante, rodadas, resposta, confirmada }
}
export function payloadConfirmacao(
  c: NegociacaoContexto,
  ajustarMoq: boolean,
): ConfirmarCompraPayload {
  if (!c.resposta) throw new Error('Registre uma resposta do fabricante antes de confirmar.')
  const deps = [c.cotacao, c.linha, c.produto, c.potencial, c.fabricante, c.resposta]
  return {
    cotacao_iten_id: c.oferta.id,
    potencial_iten_id: c.linha.id,
    rodada_resposta_id: c.resposta.id,
    versao: c.oferta.updated,
    versoes_esperadas: Object.fromEntries(deps.map((r) => [r.id, r.updated])),
    margem_versao_esperada: c.oferta.margem_versao,
    idempotency_key: gerarIdempotencyKey(c.oferta.id, c.oferta.updated, c.linha.id),
    ajustar_quantidade_para_moq: ajustarMoq,
  }
}
export interface RegistrarNegociacaoPayload {
  cotacao_iten_id: string
  potencial_iten_id: string
  versao: string
  versao_cotacao: string
  versao_item: string
  tipo: 'contraproposta_c2' | 'resposta_fabricante'
  preco: number
  idempotency_key: string
  moq?: number
  moeda?: string
  unidade?: string
  validade_oferta?: string
  data_oferta?: string
  referencia_resposta?: string
  incoterm?: string
  condicao_pagamento?: string
  tempo_fabricacao?: string
  confirmo_resposta_fabricante?: boolean
}
export function novaChaveNegociacao() {
  return 'negociacao:' + crypto.randomUUID()
}
export async function registrarNegociacao(payload: RegistrarNegociacaoPayload) {
  try {
    return await pb.send<{
      ok: true
      rodada_id: string
      cotacao_iten_id: string
      tipo: string
      versao: string
    }>('/backend/v1/cotacoes/registrar-negociacao', { method: 'POST', body: payload })
  } catch (e) {
    throw toConfirmarCompraError(e)
  }
}
export function mensagemNegociacao(err: unknown): string {
  if (
    err instanceof Error &&
    !(err instanceof ClientResponseError) &&
    !(err instanceof ConfirmarCompraError)
  )
    return err.message
  const e = toConfirmarCompraError(err)
  const messages: Record<string, string> = {
    confirmacao_em_validacao:
      'A confirmação está temporariamente indisponível enquanto concluímos a validação. Nenhuma compra foi confirmada por esta solicitação.',
    moeda_ou_unidade_ausente:
      'Registre primeiro a oferta recebida com moeda e unidade, antes de preparar um alvo.',
    data_resposta_invalida: 'A data da resposta não pode estar no futuro.',
    unidade_ou_moq_invalido: 'Confira a unidade e a quantidade mínima recebidas do fabricante.',
    acesso_negado:
      'Sua conta não tem permissão para esta operação. Atualize a sessão ou consulte o administrador.',
    conflito_versao: 'A cotação mudou desde a sua leitura. Atualize os dados e confira novamente.',
    conflito_margem:
      'A margem foi alterada por outra pessoa. Atualize os dados e confira a margem vigente.',
    resposta_ja_confirmada:
      'Esta resposta já foi confirmada. Consulte o histórico; uma nova compra exige nova resposta do fabricante.',
    oferta_vencida_ou_ausente: 'Informe uma validade vigente para a resposta do fabricante.',
    moedas_mistas_no_potencial:
      'Este potencial já tem compra selecionada em outra moeda. Use um potencial separado; não há conversão automática.',
    moeda_incompativel:
      'A moeda da resposta difere da moeda do item. Corrija a moeda do item antes de confirmar; não há conversão automática.',
    resposta_divergente:
      'A quantidade do item mudou. Registre novamente a resposta para a quantidade atual.',
    resposta_nao_confirmada: 'Registre os dados e a referência da resposta recebida do fabricante.',
    unidade_incompativel: 'A unidade da resposta precisa ser a mesma do item.',
    quantidade_abaixo_moq:
      'Confirme o ajuste da quantidade ao mínimo do fabricante para prosseguir.',
  }
  return (
    messages[e.code] ||
    (e.status === 0 || e.status >= 500
      ? 'Não foi possível confirmar o resultado. Tente novamente a mesma solicitação antes de fazer alterações.'
      : e.message || 'Não foi possível concluir a operação.')
  )
}
export function numeroDecimal(value: string): number {
  const normalized = value.trim().replace(',', '.')
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : NaN
}

/** Local calendar date, inclusive through the user's end of day. Never silently normalizes invalid dates. */
export function validadeResposta(value: string): string | undefined {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim())
  if (!match) return undefined
  const day = Number(match[1]),
    month = Number(match[2]),
    year = Number(match[3])
  const date = new Date(year, month - 1, day, 23, 59, 59, 999)
  if (
    year < 2000 ||
    year > 2100 ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    return undefined
  return date.toISOString()
}
