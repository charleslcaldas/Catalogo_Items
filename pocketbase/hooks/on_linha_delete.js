onRecordDeleteRequest((e) => {
  try {
    $app.findFirstRecordByData('itens', 'linha_id', e.record.id)
    throw new BadRequestError(
      'Cannot delete a line that contains items. Please move or delete the items first.',
    )
  } catch (err) {
    if (err instanceof BadRequestError) {
      throw err
    }
  }
}, 'linhas')
