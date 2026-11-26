import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Marcador de compatibilidade exigido pelo gate server-side (legacy_client_gate.js):
// toda escrita REST nas coleções financeiras (itens, potenciais, potencial_itens,
// cotacoes_itens, cotacoes_fornecedor, historico_precos, cotacoes_rodadas,
// c2_idempotency_keys) precisa do header X-C2-Quote-Flow: v2. Sem ele o backend
// responde 503 "A cotação está sendo atualizada...". Marcador apenas — nunca autorização.
pb.beforeSend = function (url, options) {
  options.headers = Object.assign({}, options.headers, {
    'X-C2-Quote-Flow': 'v2',
  })
  return { url, options }
}

export default pb
