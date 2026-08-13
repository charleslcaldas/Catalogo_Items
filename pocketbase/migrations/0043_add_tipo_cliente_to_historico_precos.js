/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('historico_precos')

    if (!col.fields.getByName('tipo')) {
      col.fields.add(new SelectField({ name: 'tipo', values: ['compra', 'venda'], maxSelect: 1 }))
    }
    if (!col.fields.getByName('cliente')) {
      col.fields.add(new TextField({ name: 'cliente' }))
    }
    if (!col.fields.getByName('potencial_id')) {
      col.fields.add(
        new RelationField({
          name: 'potencial_id',
          collectionId: app.findCollectionByNameOrId('potenciais').id,
          maxSelect: 1,
        }),
      )
    }

    app.save(col)

    app
      .db()
      .newQuery("UPDATE historico_precos SET tipo = 'compra' WHERE tipo IS NULL OR tipo = ''")
      .execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('historico_precos')
    col.fields.removeByName('tipo')
    col.fields.removeByName('cliente')
    col.fields.removeByName('potencial_id')
    app.save(col)
  },
)
