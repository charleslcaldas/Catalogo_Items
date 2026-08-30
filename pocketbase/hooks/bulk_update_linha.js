routerAdd(
  'POST',
  '/backend/v1/linha/bulk-update',
  (e) => {
    const body = e.requestInfo().body || {}
    const itemIds = body.itemIds || []
    const linhaId = body.linhaId

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return e.badRequestError('itemIds é obrigatório e deve conter pelo menos um ID')
    }
    if (!linhaId) {
      return e.badRequestError('linhaId é obrigatório')
    }

    try {
      $app.findRecordById('linhas', linhaId)
    } catch (err) {
      return e.badRequestError('Linha não encontrada')
    }

    let updated = 0
    const errors = []
    itemIds.forEach((id) => {
      try {
        const record = $app.findRecordById('itens', id)
        record.set('linha_id', linhaId)
        $app.save(record)
        updated++
      } catch (err) {
        errors.push({ id: id, error: String(err) })
      }
    })

    return e.json(200, { success: true, updated: updated, errors: errors })
  },
  $apis.requireAuth(),
)
