import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Marcador de compatibilidade exigido pelo gate de escritas das coleções
// financeiras (legacy_client_gate no backend): toda escrita REST do app passa
// por este cliente único, então o header é injetado aqui — centralmente e
// uma única vez. Marcador de compatibilidade, nunca autorização.
pb.beforeSend = function (url, options) {
  options.headers = { ...(options.headers || {}), 'X-C2-Quote-Flow': 'v2' }
  return { url, options }
}

export default pb
