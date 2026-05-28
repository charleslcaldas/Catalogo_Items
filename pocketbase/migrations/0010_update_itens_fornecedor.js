migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    col.fields.add(new TextField({ name: 'fornecedor_ultima_atualizacao' }))
    col.fields.add(
      new SelectField({ name: 'unidade', values: ['Pcs', 'MPC', 'kg', 'm'], maxSelect: 1 }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    col.fields.removeByName('fornecedor_ultima_atualizacao')
    col.fields.removeByName('unidade')
    app.save(col)
  },
)
