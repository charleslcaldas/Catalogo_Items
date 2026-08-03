/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    if (!col.fields.getByName('foto_catalogo_id')) {
      col.fields.add(
        new RelationField({
          name: 'foto_catalogo_id',
          collectionId: app.findCollectionByNameOrId('foto_catalogo').id,
          maxSelect: 1,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    col.fields.removeByName('foto_catalogo_id')
    app.save(col)
  },
)
