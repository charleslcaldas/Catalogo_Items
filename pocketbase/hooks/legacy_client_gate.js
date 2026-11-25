// RELEASE CANDIDATE ONLY. Not deployed. Client compatibility marker, never authorization.
// Cached old frontends issue parallel REST writes; reject ALL financial record writes
// without the current UI marker. Auth rules, capabilities and strict winner guards still apply.
onRecordCreateRequest(
  (e) => {
    if (e.hasSuperuserAuth()) return e.next()
    if (e.requestInfo().headers['x_c2_quote_flow'] !== 'v2')
      throw new ApiError(
        503,
        'A cotação está sendo atualizada. Recarregue a página antes de tentar novamente.',
      )
    return e.next()
  },
  'itens',
  'potenciais',
  'potencial_itens',
  'cotacoes_itens',
  'cotacoes_fornecedor',
  'historico_precos',
  'cotacoes_rodadas',
  'c2_idempotency_keys',
)
onRecordUpdateRequest(
  (e) => {
    if (e.hasSuperuserAuth()) return e.next()
    if (e.requestInfo().headers['x_c2_quote_flow'] !== 'v2')
      throw new ApiError(
        503,
        'A cotação está sendo atualizada. Recarregue a página antes de tentar novamente.',
      )
    return e.next()
  },
  'itens',
  'potenciais',
  'potencial_itens',
  'cotacoes_itens',
  'cotacoes_fornecedor',
  'historico_precos',
  'cotacoes_rodadas',
  'c2_idempotency_keys',
)
onRecordDeleteRequest(
  (e) => {
    if (e.hasSuperuserAuth()) return e.next()
    if (e.requestInfo().headers['x_c2_quote_flow'] !== 'v2')
      throw new ApiError(
        503,
        'A cotação está sendo atualizada. Recarregue a página antes de tentar novamente.',
      )
    return e.next()
  },
  'itens',
  'potenciais',
  'potencial_itens',
  'cotacoes_itens',
  'cotacoes_fornecedor',
  'historico_precos',
  'cotacoes_rodadas',
  'c2_idempotency_keys',
)
