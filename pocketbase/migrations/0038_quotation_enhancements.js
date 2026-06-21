/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const cotacoesItens = app.findCollectionByNameOrId('cotacoes_itens')
    if (!cotacoesItens.fields.getByName('quantidade_minima')) {
      cotacoesItens.fields.add(new NumberField({ name: 'quantidade_minima' }))
      app.save(cotacoesItens)
    }

    const potencialNotas = app.findCollectionByNameOrId('potencial_notas')
    if (!potencialNotas.fields.getByName('categoria')) {
      potencialNotas.fields.add(new TextField({ name: 'categoria' }))
      app.save(potencialNotas)
    }
  },
  (app) => {
    const cotacoesItens = app.findCollectionByNameOrId('cotacoes_itens')
    cotacoesItens.fields.removeByName('quantidade_minima')
    app.save(cotacoesItens)

    const potencialNotas = app.findCollectionByNameOrId('potencial_notas')
    potencialNotas.fields.removeByName('categoria')
    app.save(potencialNotas)
  },
)
