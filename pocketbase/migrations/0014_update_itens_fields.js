migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('itens')

    col.fields.add(new DateField({ name: 'data_atualizacao' }))
    col.fields.add(new DateField({ name: 'validade_preco' }))
    col.fields.add(new TextField({ name: 'descricao_catalogo_pt' }))
    col.fields.add(new TextField({ name: 'descricao_catalogo_en' }))

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('itens')

    col.fields.removeByName('data_atualizacao')
    col.fields.removeByName('validade_preco')
    col.fields.removeByName('descricao_catalogo_pt')
    col.fields.removeByName('descricao_catalogo_en')

    app.save(col)
  },
)
