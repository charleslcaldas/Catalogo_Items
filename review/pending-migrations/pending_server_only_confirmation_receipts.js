// PROPOSAL ONLY: not in pocketbase/migrations; never auto-apply during local tests.
// No deployment number assigned. 0067 is already used by descricoes_base_conferida.
// Reconcile the live ledger before assigning a future number.
// Receipts are internal. Public CRUD would allow forged or deleted receipts.
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
