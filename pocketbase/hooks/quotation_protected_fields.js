// TEMPORARY LEGACY COMPATIBILITY — authorized by Charles on 2026-11-25.
// Restore legacy winner/offer REST writes while the old production frontend remains live.
// New margin/version fields and append-only negotiation history remain protected.
// All three new business routes must remain unconditional authenticated 503.
// This is a request hook: trusted application transactions still use their own explicit checks.
onRecordUpdateRequest((e) => {
  if (e.hasSuperuserAuth()) return e.next()
  const before = e.record.original()
  for (const name of ['preco_original', 'rodada_atual']) {
    if (e.record.get(name) !== before.get(name))
      throw new ForbiddenError('Use a revisão e confirmação de compra.')
  }
  for (const name of ['margem_negociada', 'margem_versao', 'precisao_negociada']) {
    if (e.record.get(name) !== before.get(name))
      throw new ForbiddenError('Use o fluxo autorizado de edição de margem.')
  }
  return e.next()
}, 'cotacoes_itens')
onRecordCreateRequest((e) => {
  if (e.hasSuperuserAuth()) return e.next()
  for (const name of [
    'margem_negociada',
    'margem_versao',
    'precisao_negociada',
    'preco_original',
    'rodada_atual',
  ]) {
    if (e.record.getFloat(name) !== 0)
      throw new ForbiddenError('Margem deve ser inicializada pelo fluxo autorizado.')
  }
  return e.next()
}, 'cotacoes_itens')

// Negotiation history is append-only through the authorized recorder/confirmation routes.
onRecordCreateRequest((e) => {
  if (!e.hasSuperuserAuth()) throw new ForbiddenError('Use o registro de negociação.')
  return e.next()
}, 'cotacoes_rodadas')
onRecordUpdateRequest((e) => {
  if (!e.hasSuperuserAuth())
    throw new ForbiddenError('O histórico de negociação não pode ser alterado.')
  return e.next()
}, 'cotacoes_rodadas')
onRecordDeleteRequest((e) => {
  if (!e.hasSuperuserAuth())
    throw new ForbiddenError('O histórico de negociação não pode ser excluído.')
  return e.next()
}, 'cotacoes_rodadas')
