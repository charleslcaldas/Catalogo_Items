migrate(
  (app) => {
    const collection = new Collection({
      name: 'historico_precos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'item_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('itens').id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'preco', type: 'number', required: false },
        { name: 'fornecedor', type: 'text', required: false },
        { name: 'data_cotacao', type: 'date', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_historico_precos_item_id ON historico_precos (item_id)',
        'CREATE INDEX idx_historico_precos_data ON historico_precos (data_cotacao DESC)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('historico_precos')
    app.delete(collection)
  },
)
