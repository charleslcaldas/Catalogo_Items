/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('itens')

    if (!col.fields.getByName('grau')) {
      col.fields.add(new TextField({ name: 'grau' }))
    }
    if (!col.fields.getByName('unidade_str')) {
      col.fields.add(new TextField({ name: 'unidade_str' }))
    }
    app.save(col)

    app
      .db()
      .newQuery(
        'UPDATE itens SET grau = COALESCE(material, classe_material, classe), unidade_str = unidade',
      )
      .execute()

    const fieldsToRemove = [
      'material',
      'classe',
      'classe_material',
      'tipo',
      'subtipo',
      'foto_arquivo',
      'classe_material_en',
      'tipo_rosca_en',
      'unidade',
    ]

    fieldsToRemove.forEach((f) => {
      if (col.fields.getByName(f)) {
        col.fields.removeByName(f)
      }
    })
    app.save(col)

    const us = col.fields.getByName('unidade_str')
    if (us) {
      us.name = 'unidade'
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    if (!col.fields.getByName('material')) col.fields.add(new TextField({ name: 'material' }))
    app.save(col)
  },
)
