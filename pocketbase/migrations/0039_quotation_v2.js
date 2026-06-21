/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const fornecedores = app.findCollectionByNameOrId('fornecedores')
    if (!fornecedores.fields.getByName('auditado')) {
      fornecedores.fields.add(new BoolField({ name: 'auditado' }))
      app.save(fornecedores)
    }

    const cotacoesFornecedor = app.findCollectionByNameOrId('cotacoes_fornecedor')
    if (!cotacoesFornecedor.fields.getByName('incoterm')) {
      cotacoesFornecedor.fields.add(new TextField({ name: 'incoterm' }))
    }
    if (!cotacoesFornecedor.fields.getByName('tempo_fabricacao')) {
      cotacoesFornecedor.fields.add(new TextField({ name: 'tempo_fabricacao' }))
    }
    app.save(cotacoesFornecedor)

    const cotacoesItens = app.findCollectionByNameOrId('cotacoes_itens')
    if (!cotacoesItens.fields.getByName('preco_contraproposta')) {
      cotacoesItens.fields.add(new NumberField({ name: 'preco_contraproposta' }))
      app.save(cotacoesItens)
    }

    const potencialNotas = app.findCollectionByNameOrId('potencial_notas')
    if (!potencialNotas.fields.getByName('fornecedor_id')) {
      potencialNotas.fields.add(
        new RelationField({ name: 'fornecedor_id', collectionId: fornecedores.id, maxSelect: 1 }),
      )
      app.save(potencialNotas)
    }
  },
  (app) => {
    const fornecedores = app.findCollectionByNameOrId('fornecedores')
    fornecedores.fields.removeByName('auditado')
    app.save(fornecedores)

    const cotacoesFornecedor = app.findCollectionByNameOrId('cotacoes_fornecedor')
    cotacoesFornecedor.fields.removeByName('incoterm')
    cotacoesFornecedor.fields.removeByName('tempo_fabricacao')
    app.save(cotacoesFornecedor)

    const cotacoesItens = app.findCollectionByNameOrId('cotacoes_itens')
    cotacoesItens.fields.removeByName('preco_contraproposta')
    app.save(cotacoesItens)

    const potencialNotas = app.findCollectionByNameOrId('potencial_notas')
    potencialNotas.fields.removeByName('fornecedor_id')
    app.save(potencialNotas)
  },
)
