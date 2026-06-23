/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('potencial_itens')

    if (!col.fields.getByName('referencia_preco')) {
      col.fields.add(new NumberField({ name: 'referencia_preco' }))
    }
    if (!col.fields.getByName('referencia_fornecedor')) {
      col.fields.add(new TextField({ name: 'referencia_fornecedor' }))
    }
    if (!col.fields.getByName('referencia_data')) {
      col.fields.add(new DateField({ name: 'referencia_data' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('potencial_itens')

    col.fields.removeByName('referencia_preco')
    col.fields.removeByName('referencia_fornecedor')
    col.fields.removeByName('referencia_data')

    app.save(col)
  },
)
