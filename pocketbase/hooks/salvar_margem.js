// Candidate atomic margin editor; NOT connected to UI and kept disabled.
routerAdd(
  'POST',
  '/backend/v1/cotacoes/salvar-margem',
  (e) => {
    return e.json(503, { error: 'confirmacao_em_validacao' })

    const info = e.requestInfo()
    const b = info.body || {}
    const auth = info.auth
    const fail = (status, code) => {
      throw new Error('C2:' + status + ':' + code)
    }
    try {
      if (!auth || auth.collection().name !== 'users' || auth.id === 'meiqw9s6c4r2t8a')
        fail(403, 'acesso_negado')
      const allowed = [
        'cotacao_iten_id',
        'versao',
        'margem_versao_esperada',
        'margem_negociada',
        'precisao_negociada',
      ]
      if (
        Object.keys(b).some((k) => allowed.indexOf(k) < 0) ||
        typeof b.cotacao_iten_id !== 'string' ||
        !/^[a-z0-9]{15}$/.test(b.cotacao_iten_id) ||
        typeof b.versao !== 'string'
      )
        fail(400, 'payload_invalido')
      if (
        typeof b.margem_negociada !== 'number' ||
        !isFinite(b.margem_negociada) ||
        b.margem_negociada < 0 ||
        b.margem_negociada >= 100 ||
        !Number.isSafeInteger(b.margem_versao_esperada) ||
        b.margem_versao_esperada < 0 ||
        [2, 3].indexOf(b.precisao_negociada) < 0
      )
        fail(422, 'margem_invalida')
      let result = null
      $app.runInTransaction((tx) => {
        const actor = tx.findRecordById('users', auth.id)
        if (!actor.getBool('pode_confirmar_compra') || actor.tokenKey() !== auth.tokenKey())
          fail(403, 'acesso_negado')
        const row = tx.findRecordById('cotacoes_itens', b.cotacao_iten_id)
        const cf = tx.findRecordById('cotacoes_fornecedor', row.getString('cotacao_fornecedor_id'))
        const potential = tx.findRecordById('potenciais', cf.getString('potencial_id'))
        const requestInfo = e.requestInfo()
        requestInfo.auth = actor
        for (const r of [row, cf, potential]) {
          const rule = r.collection().viewRule
          if (rule === null || rule === undefined || !tx.canAccessRecord(r, requestInfo, rule))
            fail(403, 'acesso_negado')
        }
        if (
          row.getString('updated') !== b.versao ||
          row.getInt('margem_versao') !== b.margem_versao_esperada
        )
          fail(409, 'conflito_margem')
        row.set('margem_negociada', b.margem_negociada)
        row.set('precisao_negociada', b.precisao_negociada)
        row.set('margem_versao', b.margem_versao_esperada + 1)
        requestInfo.body = row.publicExport()
        const rule = row.collection().updateRule
        if (rule === null || rule === undefined || !tx.canAccessRecord(row, requestInfo, rule))
          fail(403, 'acesso_negado')
        tx.save(row)
        result = {
          cotacao_iten_id: row.id,
          versao: row.getString('updated'),
          margem_negociada: row.getFloat('margem_negociada'),
          precisao_negociada: row.getInt('precisao_negociada'),
          margem_versao: row.getInt('margem_versao'),
        }
      })
      return e.json(200, result)
    } catch (err) {
      const m = /C2:(\d+):([a-z0-9_]+)/.exec(String(err.message || err))
      return e.json(m ? Number(m[1]) : 500, { error: m ? m[2] : 'falha_edicao_margem' })
    }
  },
  $apis.requireAuth(),
)
