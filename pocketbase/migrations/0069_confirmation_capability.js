// 0069 — permissão dedicada de confirmação de compra em users, default falso.
// Fecha o cadastro público (createRule = null) e impede autoatribuição do flag no
// update, PRESERVANDO o updateRule existente. Nenhum grant a usuários reais aqui.
// Origem: review/pending-migrations/pending_confirmation_capability.js
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('pode_confirmar_compra'))
      users.fields.add(new BoolField({ name: 'pode_confirmar_compra' }))
    // Close public registration; do not equate a self-created account to the purchasing team.
    users.createRule = null
    if (users.updateRule !== null && users.updateRule !== undefined) {
      users.updateRule =
        '(' + users.updateRule + ') && @request.body.pode_confirmar_compra:changed = false'
    }
    app.save(users)
  },
  () => {
    /* Do not reopen public signup or remove permission protection automatically. */
  },
)
