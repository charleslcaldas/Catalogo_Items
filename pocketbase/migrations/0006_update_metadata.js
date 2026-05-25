migrate(
  (app) => {
    // Update categorias
    const categorias = app.findCollectionByNameOrId('categorias')
    if (!categorias.fields.getByName('nome_en')) {
      categorias.fields.add(new TextField({ name: 'nome_en' }))
    }
    app.save(categorias)

    // Update linhas
    const linhas = app.findCollectionByNameOrId('linhas')
    if (!linhas.fields.getByName('superlinha_en')) {
      linhas.fields.add(new TextField({ name: 'superlinha_en' }))
    }
    if (!linhas.fields.getByName('ncm_id')) {
      linhas.fields.add(
        new RelationField({
          name: 'ncm_id',
          collectionId: app.findCollectionByNameOrId('ncm').id,
          maxSelect: 1,
        }),
      )
    }
    app.save(linhas)

    // Update acabamentos
    const acabamentos = app.findCollectionByNameOrId('acabamentos')
    if (!acabamentos.fields.getByName('cor_hex')) {
      acabamentos.fields.add(new TextField({ name: 'cor_hex' }))
    }
    app.save(acabamentos)

    // Create atributos_linha
    let atributos_linha
    try {
      atributos_linha = app.findCollectionByNameOrId('atributos_linha')
    } catch (_) {
      atributos_linha = new Collection({
        name: 'atributos_linha',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'linha_id',
            type: 'relation',
            required: true,
            collectionId: app.findCollectionByNameOrId('linhas').id,
            maxSelect: 1,
          },
          { name: 'tipo_atributo', type: 'text', required: true },
          { name: 'nome_campo_customizado', type: 'text', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(atributos_linha)
    }

    // Seed default hex colors for acabamentos
    app
      .db()
      .newQuery("UPDATE acabamentos SET cor_hex = '#C0C0C0' WHERE nome_pt LIKE '%Zincado Branco%'")
      .execute()
    app
      .db()
      .newQuery("UPDATE acabamentos SET cor_hex = '#000000' WHERE nome_pt LIKE '%Preto%'")
      .execute()
    app
      .db()
      .newQuery("UPDATE acabamentos SET cor_hex = '#A8A9AD' WHERE nome_pt LIKE '%Inox%'")
      .execute()
    app
      .db()
      .newQuery("UPDATE acabamentos SET cor_hex = '#FFD700' WHERE nome_pt LIKE '%Zincado Amarelo%'")
      .execute()
    app
      .db()
      .newQuery("UPDATE acabamentos SET cor_hex = '#808080' WHERE nome_pt LIKE '%Geomet%'")
      .execute()
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('atributos_linha')
      app.delete(col)
    } catch (_) {}

    try {
      const acabamentos = app.findCollectionByNameOrId('acabamentos')
      acabamentos.fields.removeByName('cor_hex')
      app.save(acabamentos)
    } catch (_) {}

    try {
      const linhas = app.findCollectionByNameOrId('linhas')
      linhas.fields.removeByName('superlinha_en')
      linhas.fields.removeByName('ncm_id')
      app.save(linhas)
    } catch (_) {}
  },
)
