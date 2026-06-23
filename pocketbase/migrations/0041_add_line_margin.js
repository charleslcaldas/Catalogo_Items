/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('linhas')
    if (!col.fields.getByName('margem_padrao')) {
      col.fields.add(new NumberField({ name: 'margem_padrao' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('linhas')
    col.fields.removeByName('margem_padrao')
    app.save(col)
  },
)
