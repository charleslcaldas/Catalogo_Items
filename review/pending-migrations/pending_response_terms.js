// PROPOSAL ONLY. Assign a live migration number only after reconciling the ledger.
// Legacy rows remain unvalidated; no inferred supplier response or backfill.
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
