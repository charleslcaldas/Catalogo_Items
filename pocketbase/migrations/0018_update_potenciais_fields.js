migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('potenciais')
    col.fields.add(new TextField({ name: 'nome_comprador' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('potenciais')
    col.fields.removeByName('nome_comprador')
    app.save(col)
  },
)
