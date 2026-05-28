migrate(
  (app) => {
    const col = new Collection({
      name: 'unidades_medida',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_unidades_medida_nome ON unidades_medida (nome)'],
    })
    app.save(col)

    const units = ['Pcs', 'MPC', 'kg', 'm']
    units.forEach((nome) => {
      const record = new Record(col)
      record.set('nome', nome)
      app.save(record)
    })
  },
  (app) => {
    const col = app.findCollectionByNameOrId('unidades_medida')
    app.delete(col)
  },
)
