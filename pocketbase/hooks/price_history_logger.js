onRecordAfterUpdateSuccess((e) => {
  const oldRec = e.record.original()
  const oldPreco = oldRec.get('preco_compra')
  const newPreco = e.record.get('preco_compra')
  const oldForn = oldRec.get('fornecedor_ultima_atualizacao')
  const newForn = e.record.get('fornecedor_ultima_atualizacao')

  if (oldPreco !== newPreco || oldForn !== newForn) {
    const col = $app.findCollectionByNameOrId('historico_precos')
    const rec = new Record(col)
    rec.set('item_id', e.record.id)
    rec.set('preco', newPreco)
    rec.set('fornecedor', newForn)
    rec.set('data_cotacao', new Date().toISOString())
    $app.saveNoValidate(rec)
  }
  return e.next()
}, 'itens')
