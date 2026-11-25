// 0070 — validade e termos da resposta em cotacoes_rodadas.
// Linhas antigas permanecem sem esses campos preenchidos; sem backfill nem valores inferidos.
// Origem: review/pending-migrations/pending_response_terms.js
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('cotacoes_rodadas')
    if (!c.fields.getByName('validade_oferta'))
      c.fields.add(new DateField({ name: 'validade_oferta' }))
    for (const name of ['incoterm', 'condicao_pagamento', 'tempo_fabricacao']) {
      if (!c.fields.getByName(name)) c.fields.add(new TextField({ name, max: 500 }))
    }
    app.save(c)
  },
  () => {
    /* Preserve recorded response terms. */
  },
)
