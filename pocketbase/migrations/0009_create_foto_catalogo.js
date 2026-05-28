migrate(
  (app) => {
    const collection = new Collection({
      name: 'foto_catalogo',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'tipo', type: 'text', required: true },
        { name: 'subtipo', type: 'text' },
        { name: 'tamanho', type: 'text', required: true },
        {
          name: 'acabamento_id',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('acabamentos').id,
          required: true,
          maxSelect: 1,
        },
        { name: 'url_foto', type: 'url', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_foto_catalogo_lookup ON foto_catalogo (tipo, subtipo, tamanho, acabamento_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('foto_catalogo')
    app.delete(collection)
  },
)
