// 0068 — fechamento do CRUD público de recibos: a coleção de recibos (chaves de
// idempotência da confirmação de compra) passa a ser somente interna (superusers e hooks).
// Origem: review/pending-migrations/pending_server_only_confirmation_receipts.js
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('c2_idempotency_keys')
    c.listRule = null
    c.viewRule = null
    c.createRule = null
    c.updateRule = null
    c.deleteRule = null
    app.save(c)
  },
  () => {
    /* No automatic rollback that reopens receipt forgery. */
  },
)
