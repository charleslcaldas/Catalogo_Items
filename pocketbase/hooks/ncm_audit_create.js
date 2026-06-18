onRecordAfterCreateSuccess((e) => {
  const adminId = e.auth?.id || null
  const auditCol = $app.findCollectionByNameOrId('ncm_audit_logs')
  const record = new Record(auditCol)

  record.set('ncm_id', e.record.id)
  if (adminId) record.set('user_id', adminId)
  record.set('action', 'create')

  const newValues = {
    codigo: e.record.get('codigo'),
    ii: e.record.get('ii'),
    ipi: e.record.get('ipi'),
    pis: e.record.get('pis'),
    cofins: e.record.get('cofins'),
    observacoes: e.record.get('observacoes'),
  }
  record.set('new_values', newValues)

  $app.saveNoValidate(record)
  return e.next()
}, 'ncm')
