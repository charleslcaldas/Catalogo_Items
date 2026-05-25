migrate(
  (app) => {
    const categorias = new Collection({
      name: 'categorias',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome_pt', type: 'text', required: true },
        { name: 'nome_en', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(categorias)

    const linhas = new Collection({
      name: 'linhas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'categoria_id',
          type: 'relation',
          required: true,
          collectionId: categorias.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'nome_pt', type: 'text', required: true },
        { name: 'nome_en', type: 'text' },
        { name: 'superlinha_pt', type: 'text' },
        { name: 'superlinha_en', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_linhas_categoria_id ON linhas (categoria_id)'],
    })
    app.save(linhas)

    const acabamentos = new Collection({
      name: 'acabamentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'codigo', type: 'text', required: true },
        { name: 'nome_pt', type: 'text', required: true },
        { name: 'nome_en', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_acabamentos_codigo ON acabamentos (codigo)'],
    })
    app.save(acabamentos)

    const ncm = new Collection({
      name: 'ncm',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'codigo', type: 'text', required: true },
        { name: 'ii', type: 'number' },
        { name: 'ipi', type: 'number' },
        { name: 'pis', type: 'number' },
        { name: 'cofins', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_ncm_codigo ON ncm (codigo)'],
    })
    app.save(ncm)

    const itens = new Collection({
      name: 'itens',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'sku', type: 'text', required: true },
        {
          name: 'linha_id',
          type: 'relation',
          required: true,
          collectionId: linhas.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'descr_pt', type: 'text', required: true },
        { name: 'descr_en', type: 'text' },
        { name: 'tamanho', type: 'text' },
        {
          name: 'acabamento_id',
          type: 'relation',
          collectionId: acabamentos.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'ncm_id',
          type: 'relation',
          collectionId: ncm.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'material', type: 'text' },
        { name: 'preco_compra', type: 'number' },
        { name: 'preco_venda', type: 'number' },
        { name: 'item_id_books', type: 'text' },
        { name: 'foto_url', type: 'url', exceptDomains: [], onlyDomains: [] },
        { name: 'ativo', type: 'bool' },
        { name: 'sincronizado_com_zoho', type: 'bool' },
        { name: 'data_sincronizacao', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_itens_sku ON itens (sku)',
        'CREATE INDEX idx_itens_linha_id ON itens (linha_id)',
        'CREATE INDEX idx_itens_acabamento_id ON itens (acabamento_id)',
        'CREATE INDEX idx_itens_ncm_id ON itens (ncm_id)',
      ],
    })
    app.save(itens)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('itens'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('ncm'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('acabamentos'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('linhas'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('categorias'))
    } catch (_) {}
  },
)
