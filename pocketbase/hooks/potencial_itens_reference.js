onRecordCreate((e) => {
  const itemId = e.record.get('item_id')
  if (!itemId) return e.next()

  try {
    const records = $app.findRecordsByFilter(
      'historico_precos',
      `item_id = '${itemId}'`,
      '-data_cotacao,-created',
      1,
      0,
    )

    if (records && records.length > 0) {
      const history = records[0]
      e.record.set('referencia_preco', history.get('preco'))
      e.record.set('referencia_fornecedor', history.get('fornecedor'))
      e.record.set('referencia_data', history.get('data_cotacao'))
    }
  } catch (err) {
    console.log('Error fetching history for reference snapshot:', err.message)
  }

  return e.next()
}, 'potencial_itens')
