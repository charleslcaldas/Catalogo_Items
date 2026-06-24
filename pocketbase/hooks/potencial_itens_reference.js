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
      const refPrice = history.get('preco') || 0
      e.record.set('referencia_preco', refPrice)
      e.record.set('referencia_fornecedor', history.get('fornecedor'))
      e.record.set('referencia_data', history.get('data_cotacao'))

      const currentPrice = e.record.get('preco_unitario')
      if (!currentPrice && refPrice > 0) {
        let margin = 7.5
        try {
          const item = $app.findRecordById('itens', itemId)
          if (item) {
            const linhaId = item.get('linha_id')
            if (linhaId) {
              const linha = $app.findRecordById('linhas', linhaId)
              const linhaMargin = linha.get('margem_padrao')
              if (typeof linhaMargin === 'number' && linhaMargin > 0) {
                margin = linhaMargin
              }
            }
          }
        } catch (err) {
          console.log('Error fetching line margin:', err.message)
        }
        let calc = refPrice / (1 - margin / 100)
        e.record.set('preco_unitario', Number(calc.toFixed(3)))
      }
    }
  } catch (err) {
    console.log('Error fetching history for reference snapshot:', err.message)
  }

  return e.next()
}, 'potencial_itens')

onRecordUpdate((e) => {
  const newRef = e.record.get('referencia_preco')
  const oldRef = e.record.original().get('referencia_preco')

  const newVenda = e.record.get('preco_unitario')
  const oldVenda = e.record.original().get('preco_unitario')

  if (newRef && newRef !== oldRef && newRef > 0 && newVenda === oldVenda) {
    let margin = 7.5
    if (oldRef > 0 && oldVenda > 0) {
      margin = (1 - oldRef / oldVenda) * 100
    } else {
      try {
        const itemId = e.record.get('item_id')
        if (itemId) {
          const item = $app.findRecordById('itens', itemId)
          if (item) {
            const linhaId = item.get('linha_id')
            if (linhaId) {
              const linha = $app.findRecordById('linhas', linhaId)
              const linhaMargin = linha.get('margem_padrao')
              if (typeof linhaMargin === 'number' && linhaMargin > 0) {
                margin = linhaMargin
              }
            }
          }
        }
      } catch (err) {
        console.log('Error fetching line margin:', err.message)
      }
    }
    let newCalculated = newRef / (1 - margin / 100)
    e.record.set('preco_unitario', Number(newCalculated.toFixed(3)))
  }

  return e.next()
}, 'potencial_itens')
