onRecordAfterUpdateSuccess((e) => {
  const adminId = e.auth?.id || null
  const oldRec = e.record.original()
  const fields = ['codigo', 'ii', 'ipi', 'pis', 'cofins', 'observacoes']

  let changed = false
  const prevValues = {}
  const newValues = {}

  for (const f of fields) {
    const oldV = oldRec.get(f)
    const newV = e.record.get(f)
    if (oldV !== newV) {
      changed = true
      prevValues[f] = oldV
      newValues[f] = newV
    }
  }

  if (!changed) return e.next()

  const auditCol = $app.findCollectionByNameOrId('ncm_audit_logs')
  const record = new Record(auditCol)

  record.set('ncm_id', e.record.id)
  if (adminId) record.set('user_id', adminId)
  record.set('action', 'update')
  record.set('previous_values', prevValues)
  record.set('new_values', newValues)

  $app.saveNoValidate(record)
  return e.next()
}, 'ncm')
