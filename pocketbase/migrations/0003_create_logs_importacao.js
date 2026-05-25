migrate(
  (app) => {
    const logs = new Collection({
      name: 'logs_importacao',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'arquivo_nome', type: 'text', required: true },
        { name: 'total_processado', type: 'number' },
        { name: 'sucessos', type: 'number' },
        { name: 'duplicados', type: 'number' },
        { name: 'erros', type: 'number' },
        { name: 'detalhes_erros', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(logs)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('logs_importacao'))
    } catch (_) {}
  },
)
