/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const fornecedores = app.findCollectionByNameOrId('fornecedores')

    if (!fornecedores.fields.getByName('business_license')) {
      fornecedores.fields.add(new TextField({ name: 'business_license' }))
    }

    app.save(fornecedores)
  },
  (app) => {
    const fornecedores = app.findCollectionByNameOrId('fornecedores')
    try {
      fornecedores.fields.removeByName('business_license')
      app.save(fornecedores)
    } catch (_) {}
  },
)
