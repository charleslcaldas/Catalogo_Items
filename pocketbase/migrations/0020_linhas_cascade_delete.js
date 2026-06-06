migrate(
  (app) => {
    const atributos = app.findCollectionByNameOrId('atributos_linha')
    const f1 = atributos.fields.getByName('linha_id')
    if (f1) {
      f1.cascadeDelete = true
      app.save(atributos)
    }

    const descricoes = app.findCollectionByNameOrId('descricoes_base')
    const f2 = descricoes.fields.getByName('linha_id')
    if (f2) {
      f2.cascadeDelete = true
      app.save(descricoes)
    }
  },
  (app) => {
    const atributos = app.findCollectionByNameOrId('atributos_linha')
    const f1 = atributos.fields.getByName('linha_id')
    if (f1) {
      f1.cascadeDelete = false
      app.save(atributos)
    }

    const descricoes = app.findCollectionByNameOrId('descricoes_base')
    const f2 = descricoes.fields.getByName('linha_id')
    if (f2) {
      f2.cascadeDelete = false
      app.save(descricoes)
    }
  },
)
