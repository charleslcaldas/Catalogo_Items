/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const potenciais = app.findCollectionByNameOrId('potenciais')

    if (!potenciais.fields.getByName('incoterm_cliente')) {
      potenciais.fields.add(new TextField({ name: 'incoterm_cliente' }))
    }
    if (!potenciais.fields.getByName('condicao_pagamento_cliente')) {
      potenciais.fields.add(new TextField({ name: 'condicao_pagamento_cliente' }))
    }
    if (!potenciais.fields.getByName('tempo_fabricacao_cliente')) {
      potenciais.fields.add(new TextField({ name: 'tempo_fabricacao_cliente' }))
    }

    app.save(potenciais)
  },
  (app) => {
    const potenciais = app.findCollectionByNameOrId('potenciais')
    try {
      potenciais.fields.removeByName('incoterm_cliente')
      potenciais.fields.removeByName('condicao_pagamento_cliente')
      potenciais.fields.removeByName('tempo_fabricacao_cliente')
      app.save(potenciais)
    } catch (_) {}
  },
)
