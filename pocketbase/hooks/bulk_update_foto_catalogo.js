routerAdd(
  'POST',
  '/backend/v1/foto-catalogo/bulk-update',
  (e) => {
    const body = e.requestInfo().body || {}
    const itemIds = body.itemIds || []
    const fotoCatalogoId = body.fotoCatalogoId

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return e.badRequestError('itemIds é obrigatório e deve conter pelo menos um ID')
    }
    if (!fotoCatalogoId) {
      return e.badRequestError('fotoCatalogoId é obrigatório')
    }

    try {
      $app.findRecordById('foto_catalogo', fotoCatalogoId)
    } catch (err) {
      return e.badRequestError('Foto de catálogo não encontrada')
    }

    let updated = 0
    const errors = []
    itemIds.forEach((id) => {
      try {
        const record = $app.findRecordById('itens', id)
        record.set('foto_catalogo_id', fotoCatalogoId)
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
