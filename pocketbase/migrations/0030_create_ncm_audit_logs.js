migrate(
  (app) => {
    const collection = new Collection({
      name: 'ncm_audit_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'ncm_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('ncm').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'user_id',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'action', type: 'text', required: true },
        { name: 'previous_values', type: 'json', required: false },
        { name: 'new_values', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ncm_audit_ncm_id ON ncm_audit_logs (ncm_id)',
        'CREATE INDEX idx_ncm_audit_created ON ncm_audit_logs (created)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('ncm_audit_logs')
    app.delete(collection)
  },
)
