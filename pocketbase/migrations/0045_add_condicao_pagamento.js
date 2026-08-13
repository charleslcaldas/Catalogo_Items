/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const fornecedores = app.findCollectionByNameOrId('fornecedores')
    if (!fornecedores.fields.getByName('condicao_pagamento')) {
      fornecedores.fields.add(new TextField({ name: 'condicao_pagamento' }))
    }
    app.save(fornecedores)

    const cotacoesFornecedor = app.findCollectionByNameOrId('cotacoes_fornecedor')
    if (!cotacoesFornecedor.fields.getByName('condicao_pagamento')) {
      cotacoesFornecedor.fields.add(new TextField({ name: 'condicao_pagamento' }))
    }
    app.save(cotacoesFornecedor)
  },
  (app) => {
    const fornecedores = app.findCollectionByNameOrId('fornecedores')
    fornecedores.fields.removeByName('condicao_pagamento')
    app.save(fornecedores)

    const cotacoesFornecedor = app.findCollectionByNameOrId('cotacoes_fornecedor')
    cotacoesFornecedor.fields.removeByName('condicao_pagamento')
    app.save(cotacoesFornecedor)
  },
)
