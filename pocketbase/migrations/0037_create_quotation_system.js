/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const fornecedores = new Collection({
      name: 'fornecedores',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'contato', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(fornecedores)

    const cotacoes_fornecedor = new Collection({
      name: 'cotacoes_fornecedor',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'potencial_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('potenciais').id,
        },
        { name: 'fornecedor_id', type: 'relation', required: true, collectionId: fornecedores.id },
        { name: 'status', type: 'text' },
        { name: 'data_solicitacao', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(cotacoes_fornecedor)

    const cotacoes_itens = new Collection({
      name: 'cotacoes_itens',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'cotacao_fornecedor_id',
          type: 'relation',
          required: true,
          collectionId: cotacoes_fornecedor.id,
        },
        {
          name: 'item_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('itens').id,
        },
        { name: 'preco_ofertado', type: 'number' },
        { name: 'vencedor', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(cotacoes_itens)

    // Seed Data
    const f1 = new Record(fornecedores)
    f1.set('nome', 'Metalúrgica Apex')
    f1.set('contato', 'João Silva')
    f1.set('email', 'vendas@apex.com.br')
    f1.set('ativo', true)
    app.save(f1)

    const f2 = new Record(fornecedores)
    f2.set('nome', 'Fixadores Brasil')
    f2.set('contato', 'Maria Oliveira')
    f2.set('email', 'comercial@fixadoresbrasil.com.br')
    f2.set('ativo', true)
    app.save(f2)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('cotacoes_itens'))
    app.delete(app.findCollectionByNameOrId('cotacoes_fornecedor'))
    app.delete(app.findCollectionByNameOrId('fornecedores'))
  },
)
