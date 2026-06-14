onRecordUpdate((e) => {
  const unidadeId = e.record.getString('unidade_id')
  if (unidadeId) {
    try {
      const u = $app.findRecordById('unidades_medida', unidadeId)
      e.record.set('unidade', u.getString('nome'))
    } catch (_) {}
  } else {
    e.record.set('unidade', '')
  }
  return e.next()
}, 'itens')
