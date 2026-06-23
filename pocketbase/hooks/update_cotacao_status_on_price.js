onRecordAfterUpdateSuccess((e) => {
  const preco = e.record.getFloat('preco_ofertado')
  if (preco > 0) {
    try {
      const cfId = e.record.getString('cotacao_fornecedor_id')
      const cf = $app.findRecordById('cotacoes_fornecedor', cfId)
      if (cf.getString('status') !== 'finalizada') {
        cf.set('status', 'finalizada')
        $app.saveNoValidate(cf)
      }
    } catch (err) {}
  }
  return e.next()
}, 'cotacoes_itens')

onRecordAfterCreateSuccess((e) => {
  const preco = e.record.getFloat('preco_ofertado')
  if (preco > 0) {
    try {
      const cfId = e.record.getString('cotacao_fornecedor_id')
      const cf = $app.findRecordById('cotacoes_fornecedor', cfId)
      if (cf.getString('status') !== 'finalizada') {
        cf.set('status', 'finalizada')
        $app.saveNoValidate(cf)
      }
    } catch (err) {}
  }
  return e.next()
}, 'cotacoes_itens')
