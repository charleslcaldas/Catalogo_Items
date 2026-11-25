onRecordCreate((e) => {
  // Runtime marker signed by the private writer; never a client-set boolean.
  try {
    const plan = e.record.getString('__mei_plan_digest')
    const mac = e.record.getString('__mei_runtime_mac')
    const secret = $os.getenv('MEI_QUOTES_HMAC_KEY')
    if (
      secret &&
      secret.length >= 32 &&
      /^[0-9a-f]{64}$/.test(plan) &&
      /^[0-9a-f]{64}$/.test(mac) &&
      $security.equal(mac, $security.hs256('mei-record-v1\n' + e.record.id + '\n' + plan, secret))
    )
      return e.next()
  } catch (_) {}
  const itemId = e.record.get('item_id')
  if (!itemId) return e.next()

  try {
    const records = $app.findRecordsByFilter(
      'historico_precos',
      `item_id = '${itemId}' && tipo = 'compra'`,
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
  // Server-signed, record-local marker survives deferred after-commit hooks.
  // Never suppress a logger via a shared per-record flag or client-supplied boolean.
  try {
    const event = e.record.getString('__c2_confirmation_event')
    const mac = e.record.getString('__c2_confirmation_mac')
    const key = $app.store().get('c2_confirmation_signing_key')
    const message =
      'c2-confirm-v1\n' +
      e.record.id +
      '\n' +
      e.record.getFloat('preco_unitario') +
      '\n' +
      e.record.getFloat('referencia_preco') +
      '\n' +
      event
    if (
      key &&
      /^[0-9a-f]{64}$/.test(event) &&
      /^[0-9a-f]{64}$/.test(mac) &&
      $security.equal(mac, $security.hs256(message, key))
    )
      return e.next()
  } catch (_) {}
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
