onRecordBeforeUpdateRequest((e) => {
  const record = e.record

  const precoCompra = record.getFloat('preco_compra')
  const precoVenda = record.getFloat('preco_venda')

  if (precoCompra > 0 && precoVenda > 0) {
    const margin = (precoVenda / precoCompra - 1) * 100
    if (margin < 0) {
      $app
        .logger()
        .warn('Item atualizado com margem negativa', 'item_id', record.id, 'margin', margin)
    }
  }

  e.next()
}, 'itens')

onRecordBeforeCreateRequest((e) => {
  const record = e.record

  const precoCompra = record.getFloat('preco_compra')
  const precoVenda = record.getFloat('preco_venda')

  if (precoCompra > 0 && precoVenda > 0) {
    const margin = (precoVenda / precoCompra - 1) * 100
    if (margin < 0) {
      $app.logger().warn('Item criado com margem negativa', 'item_id', record.id, 'margin', margin)
    }
  }

  e.next()
}, 'itens')
