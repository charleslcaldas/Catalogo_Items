onRecordUpdate((e) => {
  try {
    const descBaseId = e.record.getString('descricao_base_id')
    let descBasePt = e.record.getString('descricao_base_pt') || ''
    let descBaseEn = e.record.getString('descricao_base_en') || ''

    if (descBaseId) {
      try {
        const d = $app.findRecordById('descricoes_base', descBaseId)
        descBasePt = d.getString('nome_pt') || descBasePt
        descBaseEn = d.getString('nome_en') || descBaseEn
      } catch (_) {}
    }

    const norma = e.record.getString('norma')
    const classeMaterial =
      e.record.getString('classe_material') ||
      e.record.getString('classe') ||
      e.record.getString('material')
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

    const buildDesc = (base, nrm, mat, tam, aca) => {
      return [base, nrm, mat, tam, aca].filter(Boolean).join(' ').trim()
    }

    const descrPt = buildDesc(descBasePt, norma, classeMaterial, tamanho, acabamentoPt)
    if (descrPt) {
      e.record.set('descr_pt', descrPt)
      e.record.set('descricao_catalogo_pt', descrPt)
    }

    const descrEn = buildDesc(descBaseEn, norma, classeMaterial, tamanho, acabamentoEn)
    if (descrEn) {
      e.record.set('descr_en', descrEn)
      e.record.set('descricao_catalogo_en', descrEn)
    }
  } catch (err) {
    $app.logger().error('Failed to format descriptions', 'error', err.message)
  }
  return e.next()
}, 'itens')
