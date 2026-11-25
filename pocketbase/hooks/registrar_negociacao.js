// Candidate manual supplier response / C2 target recorder. Kept disabled until validation.
routerAdd(
  'POST',
  '/backend/v1/cotacoes/registrar-negociacao',
  (e) => {
    return e.json(503, { error: 'confirmacao_em_validacao' })

    const body = e.requestInfo().body || {},
      auth = e.requestInfo().auth
    const fail = (s, c) => {
      throw new Error('C2:' + s + ':' + c)
    }
    const canonical = (v) => {
      if (v === null || typeof v !== 'object') return JSON.stringify(v)
      if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']'
      return (
        '{' +
        Object.keys(v)
          .sort()
          .map((k) => JSON.stringify(k) + ':' + canonical(v[k]))
          .join(',') +
        '}'
      )
    }
    const get = (app, c, id) => {
      if (typeof id !== 'string' || !/^[a-z0-9]{15}$/.test(id)) fail(400, 'payload_invalido')
      try {
        return app.findRecordById(c, id)
      } catch (_) {
        fail(404, 'registro_nao_encontrado')
      }
    }
    const authorize = (app, rec, op, actor) => {
      const rule = rec.collection()[op + 'Rule']
      if (rule === null || rule === undefined) fail(403, 'acesso_negado')
      const info = e.requestInfo()
      info.auth = actor
      if (op === 'update' || op === 'create') info.body = rec.publicExport()
      if (!app.canAccessRecord(rec, info, rule)) fail(403, 'acesso_negado')
    }
    try {
      if (!auth || auth.collection().name !== 'users' || auth.id === 'meiqw9s6c4r2t8a')
        fail(403, 'acesso_negado')
      const allowed = [
        'cotacao_iten_id',
        'potencial_iten_id',
        'versao',
        'versao_cotacao',
        'versao_item',
        'tipo',
        'preco',
        'moq',
        'moeda',
        'unidade',
        'validade_oferta',
        'data_oferta',
        'referencia_resposta',
        'incoterm',
        'condicao_pagamento',
        'tempo_fabricacao',
        'confirmo_resposta_fabricante',
        'idempotency_key',
      ]
      if (
        Object.keys(body).some((k) => allowed.indexOf(k) < 0) ||
        ['contraproposta_c2', 'resposta_fabricante'].indexOf(body.tipo) < 0 ||
        typeof body.preco !== 'number' ||
        !isFinite(body.preco) ||
        body.preco <= 0 ||
        body.preco > 1000000
      )
        fail(400, 'payload_invalido')
      if (
        typeof body.idempotency_key !== 'string' ||
        !/^[A-Za-z0-9:_-]{8,120}$/.test(body.idempotency_key)
      )
        fail(400, 'payload_invalido')
      const scope = 'registrar_negociacao:v1',
        key = $security.sha256(scope + '\n' + auth.id + '\n' + body.idempotency_key),
        hash = $security.sha256(canonical(body))
      let result = null
      $app.runInTransaction((tx) => {
        const actor = get(tx, 'users', auth.id)
        if (!actor.getBool('pode_confirmar_compra') || actor.tokenKey() !== auth.tokenKey())
          fail(403, 'acesso_negado')
        const col = tx.findCollectionByNameOrId('c2_idempotency_keys')
        if (
          ['createRule', 'updateRule', 'deleteRule'].some(
            (k) => col[k] !== null && col[k] !== undefined,
          )
        )
          fail(503, 'configuracao_recibos_insegura')
        const saved = tx.findRecordsByFilter(col.name, 'chave={:key}', '', 1, 0, { key })
        if (saved.length) {
          if (saved[0].getString('payload_hash') !== hash) fail(409, 'conflito_idempotencia')
          result = saved[0].get('recibo')
          return
        }
        const offer = get(tx, 'cotacoes_itens', body.cotacao_iten_id),
          cf = get(tx, 'cotacoes_fornecedor', offer.getString('cotacao_fornecedor_id')),
          pi = get(tx, 'potencial_itens', body.potencial_iten_id)
        const potential = get(tx, 'potenciais', cf.getString('potencial_id')),
          supplier = get(tx, 'fornecedores', cf.getString('fornecedor_id')),
          item = get(tx, 'itens', offer.getString('item_id'))
        for (const record of [offer, cf, pi, potential, supplier, item])
          authorize(tx, record, 'view', actor)
        if (pi.getString('item_id') !== item.id || pi.getString('potencial_id') !== potential.id)
          fail(409, 'relacoes_incoerentes')
        if (
          offer.getString('updated') !== body.versao ||
          cf.getString('updated') !== body.versao_cotacao ||
          pi.getString('updated') !== body.versao_item
        )
          fail(409, 'conflito_versao')
        const isResponse = body.tipo === 'resposta_fabricante',
          quantity = pi.getFloat('quantidade')
        if (!isFinite(quantity) || quantity <= 0 || quantity > 1000000)
          fail(422, 'quantidade_invalida')
        const price = body.preco,
          moq = isResponse ? body.moq : offer.getFloat('quantidade_minima')
        const currency = isResponse ? body.moeda : body.moeda || cf.getString('oferta_moeda'),
          unit = pi.getString('unidade_medida')
        if (!/^[A-Z]{3}$/.test(currency) || !unit) fail(422, 'moeda_ou_unidade_ausente')
        if (isResponse) {
          if (
            body.confirmo_resposta_fabricante !== true ||
            typeof body.referencia_resposta !== 'string' ||
            !body.referencia_resposta.trim() ||
            body.referencia_resposta.length > 1000
          )
            fail(422, 'resposta_nao_confirmada')
          if (
            body.unidade !== unit ||
            typeof moq !== 'number' ||
            !isFinite(moq) ||
            moq < 0 ||
            moq > 1000000
          )
            fail(422, 'unidade_ou_moq_invalido')
          if (
            !isFinite(Date.parse(body.validade_oferta)) ||
            Date.parse(body.validade_oferta) < Date.now()
          )
            fail(422, 'oferta_vencida_ou_ausente')
          if (
            !isFinite(Date.parse(body.data_oferta)) ||
            Date.parse(body.data_oferta) > Date.now() + 60000
          )
            fail(422, 'data_resposta_invalida')
          for (const name of ['incoterm', 'condicao_pagamento', 'tempo_fabricacao'])
            if (typeof body[name] !== 'string' || body[name].length > 500)
              fail(400, 'payload_invalido')
        } else {
          // A target changes only the C2 target. Never purchase price, sale, quantity or winners.
          offer.set('preco_contraproposta', price)
        }
        offer.set('rodada_atual', offer.getInt('rodada_atual') + 1)
        authorize(tx, offer, 'update', actor)
        tx.save(offer)
        const round = new Record(tx.findCollectionByNameOrId('cotacoes_rodadas'))
        round.load({
          cotacao_iten: offer.id,
          cotacao_iten_ref: offer.id,
          potencial: potential.id,
          fornecedor: supplier.id,
          item: item.id,
          numero_rodada: offer.getInt('rodada_atual'),
          tipo: body.tipo,
          preco: price,
          moeda: currency,
          unidade: unit,
          quantidade: quantity,
          moq,
          data_oferta: isResponse ? body.data_oferta : new Date().toISOString(),
          autor: actor.id,
          estado: isResponse ? 'recebida' : 'aguardando',
          observacoes: isResponse
            ? body.referencia_resposta
            : 'Alvo de negociação definido pela C2',
        })
        if (isResponse) {
          round.set('validade_oferta', body.validade_oferta)
          for (const n of ['incoterm', 'condicao_pagamento', 'tempo_fabricacao'])
            round.set(n, body[n])
        }
        tx.save(round)
        authorize(tx, round, 'create', actor)
        result = {
          ok: true,
          rodada_id: round.id,
          cotacao_iten_id: offer.id,
          tipo: body.tipo,
          versao: offer.getString('updated'),
        }
        const receipt = new Record(col)
        receipt.load({
          chave: key,
          escopo: scope,
          payload_hash: hash,
          criado_por: actor.id,
          recibo: result,
        })
        tx.save(receipt)
      })
      return e.json(200, result)
    } catch (err) {
      const m = /C2:(\d+):([a-z0-9_]+)/.exec(String(err.message || err))
      return e.json(m ? Number(m[1]) : 500, { error: m ? m[2] : 'falha_registro_negociacao' })
    }
  },
  $apis.requireAuth(),
)
