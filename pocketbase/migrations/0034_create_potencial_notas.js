/// <reference path="../pb_data/types.d.ts" />

// RECONSTRUCTED from a read-only export of the live schema because the original
// migration source is unavailable. This reproduces the observable pre-0038
// structure; relation options not exposed by the export are intentionally omitted.
migrate(
  (app) => {
    const collection = new Collection({
      id: 'pbc_1767808957',
      name: 'potencial_notas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'potencial_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('potenciais').id,
        },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('users').id,
        },
        { name: 'conteudo', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })

    app.save(collection)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('potencial_notas'))
  },
)
