onRecordUpdate((e) => {
  try {
    const tamanho = e.record.getString('tamanho')
    const acabamentoId = e.record.getString('acabamento_id')

    let acabamentoPt = ''
    let acabamentoEn = ''
    if (acabamentoId) {
      try {
        const a = $app.findRecordById('acabamentos', acabamentoId)
        acabamentoPt = a.getString('nome_pt')
        acabamentoEn = a.getString('nome_en') || acabamentoPt
      } catch (_) {}
    }

    const descCurtaPt = e.record.getString('descricao_curta') || ''
    const descCurtaEn = e.record.getString('descricao_curta_en') || ''

    let descrPt = descCurtaPt
    if (tamanho) descrPt += ` - ${tamanho}`
    if (acabamentoPt) descrPt += ` /${acabamentoPt}`

    if (descrPt) {
      e.record.set('descr_pt', descrPt.trim())
      e.record.set('descricao_catalogo_pt', descrPt.trim())
    }

    let descrEn = descCurtaEn
    if (tamanho) descrEn += ` - ${tamanho}`
    if (acabamentoEn) descrEn += ` /${acabamentoEn}`

    if (descrEn) {
      e.record.set('descr_en', descrEn.trim())
      e.record.set('descricao_catalogo_en', descrEn.trim())
    }
  } catch (err) {
    $app.logger().error('Failed to format descriptions', 'error', err.message)
  }
  return e.next()
}, 'itens')
