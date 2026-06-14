onRecordCreate((e) => {
  const unidadeId = e.record.getString('unidade_id')
  if (unidadeId) {
    try {
      const u = $app.findRecordById('unidades_medida', unidadeId)
      e.record.set('unidade', u.getString('nome'))
    } catch (_) {}
  }
  return e.next()
}, 'itens')
