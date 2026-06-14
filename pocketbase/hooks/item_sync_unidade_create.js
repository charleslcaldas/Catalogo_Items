onRecordCreate((e) => {
  try {
    const unidId = e.record.getString('unidade_id')
    if (unidId) {
      const u = $app.findRecordById('unidades_medida', unidId)
      const nome = u.getString('nome')
      const allowed = ['Pcs', 'MPC', 'kg', 'm']
      if (allowed.includes(nome)) {
        e.record.set('unidade', nome)
      } else {
        e.record.set('unidade', '')
      }
    }
  } catch (_) {}
  return e.next()
}, 'itens')
