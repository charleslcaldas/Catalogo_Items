/// <reference path="../../pocketbase/pb_data/types.d.ts" />
migrate(
  (app) => {
    for (const definition of [
      {
        name: 'itens',
        type: 'base',
        fields: [
          { name: 'sku', type: 'text', required: true },
          { name: 'descr_pt', type: 'text' },
        ],
      },
      {
        name: 'fornecedores',
        type: 'base',
        fields: [{ name: 'nome', type: 'text', required: true }],
      },
      {
        name: 'potenciais',
        type: 'base',
        fields: [{ name: 'numero_potencial', type: 'text' }],
      },
    ]) {
      app.save(new Collection(definition))
    }
  },
  (app) => {
    for (const name of ['potenciais', 'fornecedores', 'itens']) {
      app.delete(app.findCollectionByNameOrId(name))
    }
  },
)
