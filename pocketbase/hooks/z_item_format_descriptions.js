// @deps
onRecordCreate((e) => {
  try {
    const descPt = e.record.getString('descricao_curta')
    const descEn = e.record.getString('descricao_curta_en')
    const tamanho = e.record.getString('tamanho')
    const acabamentoId = e.record.getString('acabamento_id')

    let acabamentoNomePt = ''
    let acabamentoNomeEn = ''
    if (acabamentoId) {
      try {
        const a = $app.findRecordById('acabamentos', acabamentoId)
        acabamentoNomePt = a.getString('nome_pt')
        acabamentoNomeEn = a.getString('nome_en') || acabamentoNomePt
      } catch (_) {}
    }

    const basePt = descPt || ''
    const fullPt =
      basePt + (tamanho ? ' - ' + tamanho : '') + (acabamentoNomePt ? ' /' + acabamentoNomePt : '')
    if (fullPt) {
      e.record.set('descr_pt', fullPt)
      e.record.set('descricao_catalogo_pt', fullPt)
    }

    const baseEn = descEn || ''
    const fullEn =
      baseEn + (tamanho ? ' - ' + tamanho : '') + (acabamentoNomeEn ? ' /' + acabamentoNomeEn : '')
    if (fullEn) {
      e.record.set('descr_en', fullEn)
      e.record.set('descricao_catalogo_en', fullEn)
    }
  } catch (err) {
    $app.logger().error('Failed to format descriptions', 'error', err.message)
  }
}, 'itens')

onRecordUpdate((e) => {
  try {
    const descPt = e.record.getString('descricao_curta')
    const descEn = e.record.getString('descricao_curta_en')
    const tamanho = e.record.getString('tamanho')
    const acabamentoId = e.record.getString('acabamento_id')

    let acabamentoNomePt = ''
    let acabamentoNomeEn = ''
    if (acabamentoId) {
      try {
        const a = $app.findRecordById('acabamentos', acabamentoId)
        acabamentoNomePt = a.getString('nome_pt')
        acabamentoNomeEn = a.getString('nome_en') || acabamentoNomePt
      } catch (_) {}
    }

    const basePt = descPt || ''
    const fullPt =
      basePt + (tamanho ? ' - ' + tamanho : '') + (acabamentoNomePt ? ' /' + acabamentoNomePt : '')
    if (fullPt) {
      e.record.set('descr_pt', fullPt)
      e.record.set('descricao_catalogo_pt', fullPt)
    }

    const baseEn = descEn || ''
    const fullEn =
      baseEn + (tamanho ? ' - ' + tamanho : '') + (acabamentoNomeEn ? ' /' + acabamentoNomeEn : '')
    if (fullEn) {
      e.record.set('descr_en', fullEn)
      e.record.set('descricao_catalogo_en', fullEn)
    }
  } catch (err) {
    $app.logger().error('Failed to format descriptions', 'error', err.message)
  }
}, 'itens')
