import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Marcador de versão do fluxo de cotação: o gate do backend recusa (503) escritas REST
// sem este cabeçalho. É marcador de compatibilidade, nunca autorização.
// Não remova: toda escrita do app passa por este cliente único.
pb.beforeSend = (url, options) => ({
  url,
  options: {
    ...options,
    headers: {
      ...((options.headers as Record<string, string>) || {}),
      'X-C2-Quote-Flow': 'v2',
    },
  },
})

export default pb
