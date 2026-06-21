onRecordAfterUpdateSuccess((e) => {
  const isFinalizada = e.record.getString('status') === 'finalizada'
  const wasFinalizada = e.record.original().getString('status') === 'finalizada'

  if (isFinalizada && !wasFinalizada) {
    const cotacoesItens = $app.findRecordsByFilter(
      'cotacoes_itens',
      'cotacao_fornecedor_id = {:id} && vencedor = true',
      '-created',
      1000,
      0,
      { id: e.record.id },
    )

    if (cotacoesItens.length === 0) return e.next()

    let fornecedorNome = 'Desconhecido'
    try {
      const fornecedor = $app.findRecordById('fornecedores', e.record.getString('fornecedor_id'))
      fornecedorNome = fornecedor.getString('nome')
    } catch (err) {}

    const historicoPrecosCol = $app.findCollectionByNameOrId('historico_precos')

    for (const item of cotacoesItens) {
      const preco = item.getFloat('preco_ofertado')
      if (preco > 0) {
        const hp = new Record(historicoPrecosCol)
        hp.set('item_id', item.getString('item_id'))
        hp.set('preco', preco)
        hp.set('fornecedor', fornecedorNome)
        hp.set('data_cotacao', new Date().toISOString())
        $app.save(hp)
      }
    }
  }

  return e.next()
}, 'cotacoes_fornecedor')
