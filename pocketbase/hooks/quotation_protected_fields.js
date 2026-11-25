// Candidate guard for NEW margin/version fields; legacy offer and winner fields are unchanged.
// This is a request hook: trusted application transactions still use their own explicit checks.
onRecordUpdateRequest((e) => {
  if (e.hasSuperuserAuth()) return e.next()
  const before = e.record.original()
  for (const name of ['vencedor', 'preco_original', 'rodada_atual']) {
    if (e.record.get(name) !== before.get(name))
      throw new ForbiddenError('Use a revisão e confirmação de compra.')
  }
  if (
    before.getBool('vencedor') &&
    (e.record.getFloat('preco_ofertado') !== before.getFloat('preco_ofertado') ||
      e.record.getFloat('quantidade_minima') !== before.getFloat('quantidade_minima'))
  )
    throw new ForbiddenError('Registre nova resposta do fabricante para renegociar esta compra.')
  for (const name of ['margem_negociada', 'margem_versao', 'precisao_negociada']) {
    if (e.record.get(name) !== before.get(name))
      throw new ForbiddenError('Use o fluxo autorizado de edição de margem.')
  }
  return e.next()
}, 'cotacoes_itens')
onRecordCreateRequest((e) => {
  if (e.hasSuperuserAuth()) return e.next()
  if (e.record.getBool('vencedor')) throw new ForbiddenError('Use a confirmação de compra.')
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
