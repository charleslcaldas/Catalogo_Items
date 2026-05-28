migrate(
  (app) => {
    const categoriasId = app.findCollectionByNameOrId('categorias').id
    const linhasId = app.findCollectionByNameOrId('linhas').id
    const ncmId = app.findCollectionByNameOrId('ncm').id

    const col = new Collection({
      name: 'descricoes_base',
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
        {
          name: 'categoria_id',
          type: 'relation',
          required: true,
          collectionId: categoriasId,
          maxSelect: 1,
        },
        {
          name: 'linha_id',
          type: 'relation',
          required: true,
          collectionId: linhasId,
          maxSelect: 1,
        },
        { name: 'ncm_id', type: 'relation', required: false, collectionId: ncmId, maxSelect: 1 },
        { name: 'ativo', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_descricoes_base_codigo ON descricoes_base (codigo)'],
    })
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('descricoes_base')
    app.delete(col)
  },
)
