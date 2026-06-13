onRecordCreate((e) => {
  try {
    const unidId = e.record.getString('unidade_id')
    if (unidId) {
      const u = $app.findRecordById('unidades_medida', unidId)
      e.record.set('unidade', u.getString('nome'))
    }
  } catch (_) {}
  return e.next()
}, 'itens')
