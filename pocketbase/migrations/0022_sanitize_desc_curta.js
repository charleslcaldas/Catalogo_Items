migrate(
  (app) => {
    const records = app.findRecordsByFilter(
      'itens',
      "descricao_curta != '' || descricao_curta_en != ''",
      '',
      10000,
      0,
    )

    for (const record of records) {
      let dc = record.getString('descricao_curta') || ''
      let dce = record.getString('descricao_curta_en') || ''
      const tamanho = record.getString('tamanho')

      let acabamentoNomePt = ''
      let acabamentoNomeEn = ''
      const acId = record.getString('acabamento_id')

      if (acId) {
        try {
          const ac = app.findRecordById('acabamentos', acId)
          acabamentoNomePt = ac.getString('nome_pt') || ''
          acabamentoNomeEn = ac.getString('nome_en') || acabamentoNomePt
        } catch (_) {}
      }

      const cleanSuffix = (str, suffix) => {
        if (!suffix) return str
        const patterns = [` - ${suffix}`, ` /${suffix}`, ` / ${suffix}`, ` ${suffix}`]
        let res = str
        for (const p of patterns) {
          if (res.endsWith(p)) {
            res = res.substring(0, res.length - p.length)
          }
        }
        return res
      }

      const originalDc = dc
      const originalDce = dce

      // Clean finish first (often at the end)
      if (acabamentoNomePt) dc = cleanSuffix(dc, acabamentoNomePt)
      if (acabamentoNomeEn) dce = cleanSuffix(dce, acabamentoNomeEn)

      // Clean size
      if (tamanho) {
        dc = cleanSuffix(dc, tamanho)
        dce = cleanSuffix(dce, tamanho)
      }

      // Clean finish again in case of inverted order
      if (acabamentoNomePt) dc = cleanSuffix(dc, acabamentoNomePt)
      if (acabamentoNomeEn) dce = cleanSuffix(dce, acabamentoNomeEn)

      if (dc !== originalDc || dce !== originalDce) {
        record.set('descricao_curta', dc.trim())
        record.set('descricao_curta_en', dce.trim())
        app.saveNoValidate(record)
      }
    }
  },
  (app) => {
    // Reverting this migration is not safely possible as the original strings are lost.
  },
)
