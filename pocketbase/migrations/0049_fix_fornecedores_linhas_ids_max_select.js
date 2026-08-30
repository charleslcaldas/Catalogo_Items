/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const fornecedores = app.findCollectionByNameOrId('fornecedores')
    const linhasField = fornecedores.fields.getByName('linhas_ids')

    if (linhasField) {
      linhasField.maxSelect = 999
      app.save(fornecedores)
    }
  },
  (app) => {
    const fornecedores = app.findCollectionByNameOrId('fornecedores')
    const linhasField = fornecedores.fields.getByName('linhas_ids')

    if (linhasField) {
      linhasField.maxSelect = 1
      app.save(fornecedores)
    }
  },
)
