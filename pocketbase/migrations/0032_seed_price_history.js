migrate(
  (app) => {
    try {
      const items = app.findRecordsByFilter('itens', '1=1', '-created', 1, 0)
      if (items.length === 0) return
      const item = items[0]

      const col = app.findCollectionByNameOrId('historico_precos')

      const records = [
        { preco: 10.5, fornecedor: 'Supplier A', data_cotacao: '2023-10-01 12:00:00.000Z' },
        { preco: 11.2, fornecedor: 'Supplier B', data_cotacao: '2023-11-15 12:00:00.000Z' },
        { preco: 10.8, fornecedor: 'Supplier A', data_cotacao: '2024-01-10 12:00:00.000Z' },
      ]

      for (const r of records) {
        try {
          app.findFirstRecordByFilter(
            'historico_precos',
            `item_id = '${item.id}' && data_cotacao = '${r.data_cotacao}'`,
          )
        } catch (_) {
          const rec = new Record(col)
          rec.set('item_id', item.id)
          rec.set('preco', r.preco)
          rec.set('fornecedor', r.fornecedor)
          rec.set('data_cotacao', r.data_cotacao)
          app.save(rec)
        }
      }
    } catch (err) {
      console.log('Failed to seed price history: ', err.message)
    }
  },
  (app) => {
    try {
      app.db().newQuery('DELETE FROM historico_precos WHERE 1=1').execute()
    } catch (_) {}
  },
)
