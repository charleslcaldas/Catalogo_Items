migrate(
  (app) => {
    let offset = 0
    const limit = 1000
    while (true) {
      const items = app.findRecordsByFilter('itens', '1=1', 'created', limit, offset)
      if (items.length === 0) break

      for (const item of items) {
        const descPt = item.getString('descricao_curta')
        const descEn = item.getString('descricao_curta_en')
        const tamanho = item.getString('tamanho')
        const acabamentoId = item.getString('acabamento_id')

        let acabamentoNomePt = ''
        let acabamentoNomeEn = ''
        if (acabamentoId) {
          try {
            const a = app.findRecordById('acabamentos', acabamentoId)
            acabamentoNomePt = a.getString('nome_pt')
            acabamentoNomeEn = a.getString('nome_en') || acabamentoNomePt
          } catch (_) {}
        }

        const basePt = descPt || ''
        const fullPt =
          basePt +
          (tamanho ? ' - ' + tamanho : '') +
          (acabamentoNomePt ? ' /' + acabamentoNomePt : '')
        if (fullPt) {
          item.set('descr_pt', fullPt)
          item.set('descricao_catalogo_pt', fullPt)
        }

        const baseEn = descEn || ''
        const fullEn =
          baseEn +
          (tamanho ? ' - ' + tamanho : '') +
          (acabamentoNomeEn ? ' /' + acabamentoNomeEn : '')
        if (fullEn) {
          item.set('descr_en', fullEn)
          item.set('descricao_catalogo_en', fullEn)
        }

        app.save(item)
      }
      offset += limit
    }
  },
  (app) => {
    // Upwards formatting logic applied; down migration is a no-op as raw unformatted data wasn't preserved natively.
  },
)
