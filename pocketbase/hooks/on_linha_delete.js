onRecordDeleteRequest((e) => {
  try {
    $app.findFirstRecordByData('itens', 'linha_id', e.record.id)
    return e.badRequestError(
      'Cannot delete a line that contains items. Please move or delete the items first.',
    )
  } catch (_) {
    return e.next()
  }
}, 'linhas')
