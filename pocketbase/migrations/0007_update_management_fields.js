migrate(
  (app) => {
    const categorias = app.findCollectionByNameOrId('categorias')
    if (!categorias.fields.getByName('color')) {
      categorias.fields.add(new TextField({ name: 'color' }))
      app.save(categorias)
    }

    const linhas = app.findCollectionByNameOrId('linhas')
    if (!linhas.fields.getByName('color')) {
      linhas.fields.add(new TextField({ name: 'color' }))
      app.save(linhas)
    }

    const ncm = app.findCollectionByNameOrId('ncm')
    if (!ncm.fields.getByName('observacoes')) {
      ncm.fields.add(new TextField({ name: 'observacoes' }))
      app.save(ncm)
    }
  },
  (app) => {
    const categorias = app.findCollectionByNameOrId('categorias')
    if (categorias.fields.getByName('color')) {
      categorias.fields.removeByName('color')
      app.save(categorias)
    }

    const linhas = app.findCollectionByNameOrId('linhas')
    if (linhas.fields.getByName('color')) {
      linhas.fields.removeByName('color')
      app.save(linhas)
    }

    const ncm = app.findCollectionByNameOrId('ncm')
    if (ncm.fields.getByName('observacoes')) {
      ncm.fields.removeByName('observacoes')
      app.save(ncm)
    }
  },
)
