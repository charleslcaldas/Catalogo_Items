/** Auxiliares puros para validação preliminar no cliente.
 * Não autorizam operações nem substituem o handler. As regras efetivas são
 * avaliadas pelo servidor com canAccessRecord em cada registro/transação.
 * A evidência de servidor está nos testes HTTP em tests/isolated/run.py.
 */
import { computeVenda, isValidMargin } from './money'

// ---------- códigos de erro (estáveis, espelham o hook) ----------

export type ConfirmarCompraErrorCode =
  | 'payload_invalido'
  | 'preco_invalido'
  | 'moq_invalido'
  | 'acesso_negado'
  | 'nao_autenticado'
  | 'identidade_nao_resolvida'
  | 'preco_eh_alvo'
  | 'oferta_vencida'
  | 'relacoes_incoerentes'
  | 'potencial_item_ambiguo'
  | 'quantidade_invalida'
  | 'quantidade_abaixo_moq'
  | 'moeda_ausente'
  | 'unidade_ausente'
  | 'venda_invalida'
  | 'pendencia_margem'
  | 'pendencia_dados'
  | 'precisao_ausente'
  | 'precisao_invalida'
  | 'margem_invalida'
  | 'conflito_margem'
  | 'conflito_versao'
  | 'conflito_idempotencia'
  | 'falha_transacao'

// ---------- payload ----------

export type { ConfirmarCompraPayload } from '../services/cotacaoConfirmacao'
import type { ConfirmarCompraPayload } from '../services/cotacaoConfirmacao'

// ---------- canonicalização (mesma do hook) ----------

/**
 * Canonical JSON: chaves ordenadas, sem ambiguidade de ordem de propriedades.
 * Mesma chave de idempotência + payload semanticamente igual → mesmo hash,
 * independente da ordem das chaves no objeto.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']'
  const keys = Object.keys(value as Record<string, unknown>).sort()
  const parts = keys.map(
    (k) => JSON.stringify(k) + ':' + canonicalize((value as Record<string, unknown>)[k]),
  )
  return '{' + parts.join(',') + '}'
}

/** Mesmo corpo integral que o servidor usa para detectar reutilização divergente. */
export function payloadCanonico(p: ConfirmarCompraPayload) {
  return p
}

/** Identificação preliminar do cliente; não constitui autorização. */
export const MEI_INTEGRATION_USER_ID = 'meiqw9s6c4r2t8a'

/** Status de identidade para a matriz de autorização (negar por padrão). */
export type IdentidadeStatus = 'anonimo' | 'mei' | 'time' | 'indeterminado'

export interface IdentidadeConfirmacao {
  status: IdentidadeStatus
  id: string
}

/** Operação equivalente exigida por coleção envolvida na confirmação. */
export const OPERACOES_CONFIRMACAO: ReadonlyArray<{
  colecao: string
  operacoes: readonly ('list' | 'view' | 'create' | 'update' | 'delete')[]
}> = [
  { colecao: 'cotacoes_itens', operacoes: ['view', 'update'] },
  { colecao: 'cotacoes_fornecedor', operacoes: ['view'] },
  { colecao: 'cotacoes_rodadas', operacoes: ['list', 'create'] },
  { colecao: 'potenciais', operacoes: ['view'] },
  { colecao: 'potencial_itens', operacoes: ['list', 'view', 'update'] },
  { colecao: 'historico_precos', operacoes: ['create'] },
  { colecao: 'itens', operacoes: ['view'] },
  { colecao: 'fornecedores', operacoes: ['view'] },
]

/** Classificação preliminar; somente o servidor verifica autenticação e regras. */
export function resolverIdentidade(
  authUser: { id?: unknown } | null | undefined,
): IdentidadeConfirmacao {
  if (authUser === null || authUser === undefined) {
    return { status: 'anonimo', id: '' }
  }
  if (typeof authUser.id !== 'string' || authUser.id === '') {
    return { status: 'indeterminado', id: '' }
  }
  if (authUser.id === MEI_INTEGRATION_USER_ID) {
    return { status: 'mei', id: authUser.id }
  }
  return { status: 'time', id: authUser.id }
}

/** Verifica apenas o escopo previsto para a UI, nunca permissão efetiva. */
export function operacaoNoEscopo(
  identidade: IdentidadeConfirmacao,
  colecao: string,
  operacao: 'list' | 'view' | 'create' | 'update' | 'delete',
): boolean {
  if (identidade.status !== 'time' || !identidade.id || identidade.id === MEI_INTEGRATION_USER_ID)
    return false
  for (const o of OPERACOES_CONFIRMACAO) {
    if (o.colecao === colecao && o.operacoes.includes(operacao)) return true
  }
  return false
}

/**
 * Checagem anti-escopo: a cadeia oferta → cotação do fornecedor → potencial →
 * potencial_iten deve apontar para o MESMO potencial e o MESMO item.
 * Divergência em qualquer elo → NEGADO (tentativa entre escopos).
 * Indeterminado (registro ausente ou id vazio em elo obrigatório) → NEGADO.
 */
export function cadeiaCoerente(input: {
  oferta: { id: string; cotacao_fornecedor_id: string; item_id: string } | null
  cotacaoFornecedor: { id: string; potencial_id: string } | null
  potencial: { id: string } | null
  potencialIten: { potencial_id: string; item_id: string } | null
}): boolean {
  const { oferta, cotacaoFornecedor, potencial, potencialIten } = input
  if (!oferta || !cotacaoFornecedor || !potencial) return false
  if (!oferta.id || !oferta.cotacao_fornecedor_id || !oferta.item_id) return false
  if (!cotacaoFornecedor.id || !cotacaoFornecedor.potencial_id) return false
  if (!potencial.id) return false
  if (oferta.cotacao_fornecedor_id !== cotacaoFornecedor.id) return false
  if (cotacaoFornecedor.potencial_id !== potencial.id) return false
  if (potencialIten) {
    if (!potencialIten.potencial_id || !potencialIten.item_id) return false
    if (potencialIten.potencial_id !== potencial.id) return false
    if (potencialIten.item_id !== oferta.item_id) return false
  }
  return true
}

// ---------- validações server-side (espelho) ----------

export interface Pendencia {
  code: ConfirmarCompraErrorCode
  message: string
}

/** Valida o payload na borda do cliente — o servidor revalida tudo. */
export function validarPayload(p: Partial<ConfirmarCompraPayload>): Pendencia[] {
  const erros: Pendencia[] = []
  if (!p.cotacao_iten_id) {
    erros.push({ code: 'payload_invalido', message: 'cotacao_iten_id é obrigatório.' })
  }
  if (!p.idempotency_key || !p.idempotency_key.trim()) {
    erros.push({ code: 'payload_invalido', message: 'idempotency_key é obrigatória.' })
  }
  if (p.idempotency_key && !/^[A-Za-z0-9:_-]{8,120}$/.test(p.idempotency_key)) {
    erros.push({
      code: 'payload_invalido',
      message: 'idempotency_key deve ter 8 a 120 caracteres válidos.',
    })
  }
  if (!p.versao || !p.potencial_iten_id || !p.rodada_resposta_id || !p.versoes_esperadas) {
    erros.push({
      code: 'payload_invalido',
      message: 'Versão, item, resposta e versões são obrigatórios.',
    })
  }
  if (!Number.isSafeInteger(p.margem_versao_esperada) || (p.margem_versao_esperada ?? 0) < 1) {
    erros.push({
      code: 'payload_invalido',
      message: 'margem_versao_esperada deve ser inteiro >= 1.',
    })
  }
  return erros
}

/**
 * O alvo (preco_contraproposta) NUNCA confirma compra: exige preço de oferta
 * Pode ser igual ao alvo quando há resposta confirmada. Isto é apenas um aviso
 * de cliente; o servidor exige a rodada e confere sua proveniência/versão.
 */
export function validarPrecoNaoEhAlvo(
  preco: number,
  precoContraproposta: number,
  respostaConfirmada = false,
): Pendencia | null {
  if (
    Number.isFinite(precoContraproposta) &&
    precoContraproposta > 0 &&
    precoContraproposta === preco &&
    !respostaConfirmada
  ) {
    return {
      code: 'preco_eh_alvo',
      message: 'O preço informado é o alvo (contraproposta C2). Não confirma compra.',
    }
  }
  return null
}

/**
 * MOQ nunca muda quantidade silenciosamente: quantidade < moq é rejeitada, a não
 * ser com a flag explícita ajustar_quantidade_para_moq=true (ajusta ao moq).
 */
export function avaliarMoq(
  quantidade: number,
  moq: number,
  ajustarFlag: boolean,
): { ok: boolean; quantidadeFinal: number; pendencia: Pendencia | null } {
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return {
      ok: false,
      quantidadeFinal: 0,
      pendencia: {
        code: 'quantidade_invalida',
        message: 'quantidade do item do potencial deve ser > 0.',
      },
    }
  }
  if (moq > 0 && quantidade < moq && !ajustarFlag) {
    return {
      ok: false,
      quantidadeFinal: quantidade,
      pendencia: {
        code: 'quantidade_abaixo_moq',
        message: 'Quantidade abaixo do MOQ. Envie ajustar_quantidade_para_moq=true.',
      },
    }
  }
  return {
    ok: true,
    quantidadeFinal: moq > 0 && quantidade < moq && ajustarFlag ? moq : quantidade,
    pendencia: null,
  }
}

/** Validade da oferta: quando presente e anterior a agora → oferta vencida. */
export function ofertaEstaVencida(validade: string | undefined, agora = new Date()): boolean {
  if (!validade) return false
  const d = new Date(String(validade).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return true // data inválida não passa
  return d.getTime() < agora.getTime()
}

/**
 * Venda da confirmação (v0.0.266): usa EXCLUSIVAMENTE a margem PERSISTIDA em
 * cotacoes_itens.margem_negociada — nunca margem_padrao da linha, nunca 7,5 fixo,
 * nunca margem enviada no payload. Fórmula venda = compra / (1 - margem/100),
 * arredondada na precisão persistida (precisao_negociada, 2 ou 3 — ausente →
 * pendência, sem default silencioso).
 *
 * Concorrência otimista: margemVersaoPersistida deve bater com
 * margemVersaoEsperada do payload; divergente → conflito_margem (nenhum valor).
 * Margem persistida ausente/vazia → pendencia_margem (nada inventado).
 * Margem inválida (< 0 ou >= 100) → margem_invalida.
 *
 * O incremento de margem_versao (+1) na gravação é responsabilidade da
 * transação do hook — esta função é a espelho do cálculo puro.
 */
export function calcularVendaConfirmacao(
  precoCompra: number,
  margemPersistida: number | null | undefined,
  precisaoPersistida: number | null | undefined,
  margemVersaoPersistida: number | null | undefined,
  margemVersaoEsperada: number,
): {
  venda: number | undefined
  precisao: 2 | 3 | undefined
  pendencia: Pendencia | null
} {
  // precisão: ausente/vazia → pendência explícita; fora de 2/3 → precisao_invalida
  const precisaoInformada = precisaoPersistida
  if (
    precisaoInformada === null ||
    precisaoInformada === undefined ||
    !Number.isFinite(precisaoInformada)
  ) {
    return {
      venda: undefined,
      precisao: undefined,
      pendencia: {
        code: 'precisao_ausente',
        message:
          'precisao_negociada não persistida (2 ou 3) — pendência explícita. Nada foi gravado.',
      },
    }
  }
  const precisao: 2 | 3 = precisaoInformada === 2 ? 2 : precisaoInformada === 3 ? 3 : (0 as 2)
  if (precisao !== 2 && precisao !== 3) {
    return {
      venda: undefined,
      precisao: undefined,
      pendencia: {
        code: 'precisao_invalida',
        message: 'precisao_negociada deve ser 2 ou 3 — pendência explícita. Nada foi gravado.',
      },
    }
  }
  // margem: ausente/vazia → pendencia_margem (nunca fallback)
  if (
    margemPersistida === null ||
    margemPersistida === undefined ||
    !Number.isFinite(margemPersistida)
  ) {
    return {
      venda: undefined,
      precisao,
      pendencia: {
        code: 'pendencia_margem',
        message:
          'Margem negociada não persistida em cotacoes_itens.margem_negociada — pendência explícita. Nada foi gravado.',
      },
    }
  }
  if (!isValidMargin(margemPersistida as number)) {
    return {
      venda: undefined,
      precisao,
      pendencia: {
        code: 'margem_invalida',
        message: 'Margem persistida deve ser >= 0 e < 100 — nada foi gravado.',
      },
    }
  }
  // versão: divergente → conflito_margem
  if (
    margemVersaoPersistida === null ||
    margemVersaoPersistida === undefined ||
    !Number.isSafeInteger(margemVersaoPersistida) ||
    Number(margemVersaoPersistida) !== margemVersaoEsperada
  ) {
    return {
      venda: undefined,
      precisao,
      pendencia: {
        code: 'conflito_margem',
        message:
          'A margem negociada mudou desde a leitura (margem_versao divergente). Recarregue a margem autorizada e confirme novamente.',
      },
    }
  }
  const vendaBruta = computeVenda(precoCompra, margemPersistida as number)
  if (vendaBruta === undefined) {
    return {
      venda: undefined,
      precisao,
      pendencia: {
        code: 'venda_invalida',
        message: 'Cálculo de venda resultou inválido — nada gravado.',
      },
    }
  }
  const fator = precisao === 3 ? 1000 : 100
  const venda = Math.round(vendaBruta * fator) / fator
  if (!Number.isFinite(venda) || venda <= 0) {
    return {
      venda: undefined,
      precisao,
      pendencia: {
        code: 'venda_invalida',
        message: 'Arredondamento da venda resultou inválido — nada gravado.',
      },
    }
  }
  return { venda, precisao, pendencia: null }
}
