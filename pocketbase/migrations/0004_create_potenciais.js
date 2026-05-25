migrate(
  (app) => {
    const potenciais = new Collection({
      name: 'potenciais',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'numero_potencial', type: 'text', required: true },
        { name: 'cliente', type: 'text', required: true },
        { name: 'status', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_potenciais_numero ON potenciais (numero_potencial)'],
    })
    app.save(potenciais)

    const potencialItens = new Collection({
      name: 'potencial_itens',
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
          collectionId: potenciais.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'item_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('itens').id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'quantidade', type: 'number', required: true, min: 1, onlyInt: true },
        { name: 'preco_unitario', type: 'number', required: false },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(potencialItens)

    const p1 = new Record(potenciais)
    p1.set('numero_potencial', 'POT-2026-001')
    p1.set('cliente', 'Afonso Imports')
    p1.set('status', 'Em Negociação')
    app.save(p1)

    const p2 = new Record(potenciais)
    p2.set('numero_potencial', 'POT-2026-002')
    p2.set('cliente', 'Skip Tech Ltd')
    p2.set('status', 'Fechado')
    app.save(p2)
  },
  (app) => {
    try {
      const pItens = app.findCollectionByNameOrId('potencial_itens')
      app.delete(pItens)
    } catch (_) {}
    try {
      const pots = app.findCollectionByNameOrId('potenciais')
      app.delete(pots)
    } catch (_) {}
  },
)
