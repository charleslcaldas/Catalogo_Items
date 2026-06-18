routerAdd(
  'POST',
  '/backend/v1/zoho/force-sync',
  (e) => {
    const body = e.requestInfo().body || {}
    const itemIds = body.itemIds || []

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return e.badRequestError('itemIds required')
    }

    let synced = 0
    itemIds.forEach((id) => {
      try {
        const record = $app.findRecordById('itens', id)
        const hasZohoId = !!record.getString('item_id_books')

        record.set('sincronizado_com_zoho', true)
        record.set('data_sincronizacao', new Date().toISOString())
        if (!hasZohoId) {
          record.set('item_id_books', 'zoho_' + $security.randomString(8))
        }
        $app.save(record)
        synced++
      } catch (err) {
        console.log('Error syncing item ' + id, err)
      }
    })

    return e.json(200, { success: true, synced })
  },
  $apis.requireAuth(),
)
