import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Gate legacy_client_gate.js (backend): toda escrita REST nas coleções financeiras
// exige o header X-C2-Quote-Flow: v2. Injetado centralmente aqui — todo o app usa
// este único cliente (nenhum fluxo cria cliente próprio ou usa fetch/axios).
pb.beforeSend = function (url, options) {
  options.headers = { ...(options.headers ?? {}), 'X-C2-Quote-Flow': 'v2' }
  return { url, options }
}

export default pb
