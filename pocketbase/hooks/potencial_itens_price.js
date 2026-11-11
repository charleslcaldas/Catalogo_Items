onRecordAfterUpdateSuccess((e) => {
  const preco = e.record.get('preco_unitario')
  const fornecedor = e.record.get('observacoes')

  const oldPreco = e.record.original().get('preco_unitario')
  const oldFornecedor = e.record.original().get('observacoes')

  if (preco && (preco !== oldPreco || fornecedor !== oldFornecedor)) {
    try {
      const potencialId = e.record.get('potencial_id')
      let cliente = ''
      if (potencialId) {
        try {
          const potencial = $app.findRecordById('potenciais', potencialId)
          cliente = potencial.getString('cliente')
        } catch (_) {}
      }

      const col = $app.findCollectionByNameOrId('historico_precos')
      const rec = new Record(col)
      rec.set('item_id', e.record.get('item_id'))
      rec.set('preco', preco)
      rec.set('fornecedor', fornecedor || '')
      rec.set('data_cotacao', new Date().toISOString())
      rec.set('tipo', 'venda')
      rec.set('cliente', cliente)
      if (potencialId) {
        rec.set('potencial_id', potencialId)
      }
      $app.saveNoValidate(rec)
    } catch (err) {
      console.log('Error saving price history from potencial_itens update:', err.message)
    }
  }
  return e.next()
}, 'potencial_itens')

onRecordAfterCreateSuccess((e) => {
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
  const preco = e.record.get('preco_unitario')
  const fornecedor = e.record.get('observacoes')

  if (preco) {
    try {
      const potencialId = e.record.get('potencial_id')
      let cliente = ''
      if (potencialId) {
        try {
          const potencial = $app.findRecordById('potenciais', potencialId)
          cliente = potencial.getString('cliente')
        } catch (_) {}
      }

      const col = $app.findCollectionByNameOrId('historico_precos')
      const rec = new Record(col)
      rec.set('item_id', e.record.get('item_id'))
      rec.set('preco', preco)
      rec.set('fornecedor', fornecedor || '')
      rec.set('data_cotacao', new Date().toISOString())
      rec.set('tipo', 'venda')
      rec.set('cliente', cliente)
      if (potencialId) {
        rec.set('potencial_id', potencialId)
      }
      $app.saveNoValidate(rec)
    } catch (err) {
      console.log('Error saving price history from potencial_itens create:', err.message)
    }
  }
  return e.next()
}, 'potencial_itens')
