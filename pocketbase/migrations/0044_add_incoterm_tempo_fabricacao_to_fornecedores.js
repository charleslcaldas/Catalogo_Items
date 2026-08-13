/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const fornecedores = app.findCollectionByNameOrId('fornecedores')
    if (!fornecedores.fields.getByName('incoterm')) {
      fornecedores.fields.add(new TextField({ name: 'incoterm' }))
    }
    if (!fornecedores.fields.getByName('tempo_fabricacao')) {
      fornecedores.fields.add(new TextField({ name: 'tempo_fabricacao' }))
    }
    app.save(fornecedores)
  },
  (app) => {
    const fornecedores = app.findCollectionByNameOrId('fornecedores')
    fornecedores.fields.removeByName('incoterm')
    fornecedores.fields.removeByName('tempo_fabricacao')
    app.save(fornecedores)
  },
)
