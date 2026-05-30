migrate(
  (app) => {
    const itens = app.findCollectionByNameOrId('itens')
    if (!itens.fields.getByName('descricao_curta')) {
      itens.fields.add(new TextField({ name: 'descricao_curta' }))
    }
    if (!itens.fields.getByName('descricao_curta_en')) {
      itens.fields.add(new TextField({ name: 'descricao_curta_en' }))
    }
    if (!itens.fields.getByName('informacao_extra_en')) {
      itens.fields.add(new TextField({ name: 'informacao_extra_en' }))
    }
    if (!itens.fields.getByName('descricao_extra_en')) {
      itens.fields.add(new TextField({ name: 'descricao_extra_en' }))
    }
    app.save(itens)

    const fotos = app.findCollectionByNameOrId('foto_catalogo')
    if (!fotos.fields.getByName('descricao')) {
      fotos.fields.add(new TextField({ name: 'descricao' }))
    }
    if (!fotos.fields.getByName('arquivo')) {
      fotos.fields.add(
        new FileField({
          name: 'arquivo',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        }),
      )
    }

    ;['tipo', 'tamanho', 'acabamento_id', 'url_foto'].forEach((name) => {
      const f = fotos.fields.getByName(name)
      if (f) f.required = false
    })
    app.save(fotos)
  },
  (app) => {
    const itens = app.findCollectionByNameOrId('itens')
    itens.fields.removeByName('descricao_curta')
    itens.fields.removeByName('descricao_curta_en')
    itens.fields.removeByName('informacao_extra_en')
    itens.fields.removeByName('descricao_extra_en')
    app.save(itens)

    const fotos = app.findCollectionByNameOrId('foto_catalogo')
    fotos.fields.removeByName('descricao')
    fotos.fields.removeByName('arquivo')

    ;['tipo', 'tamanho', 'acabamento_id', 'url_foto'].forEach((name) => {
      const f = fotos.fields.getByName(name)
      if (f) f.required = true
    })
    app.save(fotos)
  },
)
