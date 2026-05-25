migrate(
  (app) => {
    const itens = app.findCollectionByNameOrId('itens')
    itens.fields.add(new TextField({ name: 'classe' }))
    itens.fields.add(new TextField({ name: 'norma' }))
    app.save(itens)

    const potenciais = app.findCollectionByNameOrId('potenciais')
    potenciais.fields.add(new TextField({ name: 'observacoes' }))
    app.save(potenciais)

    const pItens = app.findCollectionByNameOrId('potencial_itens')
    pItens.fields.add(new TextField({ name: 'unidade_medida' }))
    app.save(pItens)
  },
  (app) => {
    const itens = app.findCollectionByNameOrId('itens')
    itens.fields.removeByName('classe')
    itens.fields.removeByName('norma')
    app.save(itens)

    const potenciais = app.findCollectionByNameOrId('potenciais')
    potenciais.fields.removeByName('observacoes')
    app.save(potenciais)

    const pItens = app.findCollectionByNameOrId('potencial_itens')
    pItens.fields.removeByName('unidade_medida')
    app.save(pItens)
  },
)
