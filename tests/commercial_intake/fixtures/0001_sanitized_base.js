/// <reference path="../../pb_data/types.d.ts" />

migrate(
  (app) => {
    const items = new Collection({
      name: 'itens',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'sku', type: 'text', required: true },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_itens_sku ON itens (sku)'],
    })
    app.save(items)

    const stages = new Collection({
      name: 'estagios_potencial',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [{ name: 'nome', type: 'text', required: true }],
    })
    app.save(stages)

    const potentials = new Collection({
      name: 'potenciais',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'numero_potencial', type: 'text', required: true },
        { name: 'cliente', type: 'text', required: true },
        { name: 'status', type: 'text', required: true },
        { name: 'nome_potencial', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'proprietario', type: 'text' },
        { name: 'nome_comprador', type: 'text' },
        { name: 'notas', type: 'text' },
        {
          name: 'estagio_id',
          type: 'relation',
          collectionId: stages.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'anexos', type: 'file', maxSelect: 10, maxSize: 5242880 },
        { name: 'incoterm_cliente', type: 'text' },
        { name: 'condicao_pagamento_cliente', type: 'text' },
        { name: 'tempo_fabricacao_cliente', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_potenciais_numero ON potenciais (numero_potencial)'],
    })
    app.save(potentials)

    const potentialItems = new Collection({
      name: 'potencial_itens',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'potencial_id',
          type: 'relation',
          required: true,
          collectionId: potentials.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'item_id',
          type: 'relation',
          required: true,
          collectionId: items.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'quantidade', type: 'number', required: true, min: 1, onlyInt: true },
        { name: 'unidade_medida', type: 'text' },
        { name: 'ordem', type: 'number', min: 1 },
        { name: 'preco_unitario', type: 'number' },
        { name: 'observacoes', type: 'text' },
        { name: 'referencia_preco', type: 'number' },
        { name: 'referencia_fornecedor', type: 'text' },
        { name: 'referencia_data', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_potencial_itens_potencial ON potencial_itens (potencial_id)',
      ],
    })
    app.save(potentialItems)

    const priceHistory = new Collection({
      name: 'historico_precos',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'item_id',
          type: 'relation',
          required: true,
          collectionId: items.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'potencial_id',
          type: 'relation',
          collectionId: potentials.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'preco', type: 'number' },
        { name: 'fornecedor', type: 'text' },
        { name: 'data_cotacao', type: 'date' },
        { name: 'tipo', type: 'text' },
        { name: 'cliente', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_historico_precos_item_id ON historico_precos (item_id)',
        'CREATE INDEX idx_historico_precos_potencial_id ON historico_precos (potencial_id)',
      ],
    })
    app.save(priceHistory)

    const item1 = new Record(items)
    item1.set('id', 'itm000000000001')
    item1.set('sku', 'FIXTURE-ONE')
    item1.set('ativo', true)
    app.save(item1)

    const item2 = new Record(items)
    item2.set('id', 'itm000000000002')
    item2.set('sku', 'FIXTURE-TWO')
    item2.set('ativo', true)
    app.save(item2)

    const inactiveItem = new Record(items)
    inactiveItem.set('id', 'itm000000000003')
    inactiveItem.set('sku', 'FIXTURE-OFF')
    inactiveItem.set('ativo', false)
    app.save(inactiveItem)

    const stage = new Record(stages)
    stage.set('id', 'stg000000000001')
    stage.set('nome', 'Sanitized Stage')
    app.save(stage)

    const history = new Record(priceHistory)
    history.set('item_id', item1.id)
    history.set('preco', 100)
    history.set('fornecedor', 'Sanitized Supplier')
    history.set('data_cotacao', '2026-01-01 00:00:00.000Z')
    history.set('tipo', 'compra')
    app.save(history)
  },
  (app) => {
    for (const name of [
      'historico_precos',
      'potencial_itens',
      'potenciais',
      'estagios_potencial',
      'itens',
    ]) {
      try {
        app.delete(app.findCollectionByNameOrId(name))
      } catch (_) {}
    }
  },
)
