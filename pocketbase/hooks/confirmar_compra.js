// LOCAL CANDIDATE ONLY. The public handler remains unconditionally disabled.
// Do not deploy/reactivate without isolated integration tests and owner approval.
routerAdd(
  'POST',
  '/backend/v1/cotacoes/confirmar-compra',
  (e) => {
    return e.json(503, { error: 'confirmacao_em_validacao' })

    const fail = (status, code) => {
      throw new Error('C2:' + status + ':' + code)
    }
    const finite = (n) => typeof n === 'number' && isFinite(n)
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
    const info = e.requestInfo()
    const body = info.body || {}
    const actor = info.auth
    const MEI = 'meiqw9s6c4r2t8a'
    const get = (app, col, id) => {
      if (typeof id !== 'string' || !/^[a-z0-9]{15}$/.test(id)) fail(400, 'payload_invalido')
      try {
        return app.findRecordById(col, id)
      } catch (_) {
        fail(404, 'registro_nao_encontrado')
      }
    }
    const authorize = (app, rec, op, requestInfo) => {
      // Evaluate the actual collection rule, including future ownership constraints.
      const rule = rec.collection()[op + 'Rule']
      if (rule === null || rule === undefined) fail(403, 'acesso_negado')
      try {
        const checkInfo = e.requestInfo()
        checkInfo.auth = requestInfo.auth
        if (op === 'update' || op === 'create') checkInfo.body = rec.publicExport()
        if (!app.canAccessRecord(rec, checkInfo, rule)) fail(403, 'acesso_negado')
      } catch (_) {
        fail(403, 'acesso_negado')
      }
    }
    const validateActor = (app) => {
      if (!actor || actor.collection().name !== 'users' || actor.id === MEI)
        fail(403, 'acesso_negado')
      const fresh = get(app, 'users', actor.id)
      // Token rotation/revocation since middleware execution must invalidate the operation.
      if (!fresh.getBool('pode_confirmar_compra') || fresh.tokenKey() !== actor.tokenKey())
        fail(403, 'acesso_negado')
      return fresh
    }
    const findReceipt = (app, key) => {
      const found = app.findRecordsByFilter('c2_idempotency_keys', 'chave = {:key}', '', 1, 0, {
        key,
      })
      return found.length ? found[0] : null
    }
    const scope = 'confirmar_compra:v2'
    let key = ''
    let hash = ''
    const replay = (rec) => {
      if (
        rec.getString('criado_por') !== actor.id ||
        rec.getString('escopo') !== scope ||
        rec.getString('payload_hash') !== hash
      )
        fail(409, 'conflito_idempotencia')
      return { repetido: true, recibo: rec.get('recibo') }
    }
    try {
      validateActor($app)
      const allowed = [
        'cotacao_iten_id',
        'potencial_iten_id',
        'rodada_resposta_id',
        'versao',
        'versoes_esperadas',
        'margem_versao_esperada',
        'idempotency_key',
        'ajustar_quantidade_para_moq',
      ]
      if (Object.keys(body).some((k) => allowed.indexOf(k) < 0)) fail(400, 'payload_invalido')
      if (
        typeof body.idempotency_key !== 'string' ||
        !/^[A-Za-z0-9:_-]{8,120}$/.test(body.idempotency_key)
      )
        fail(400, 'payload_invalido')
      if (typeof body.versao !== 'string' || !body.versao || !body.versoes_esperadas)
        fail(400, 'payload_invalido')
      if (!Number.isSafeInteger(body.margem_versao_esperada) || body.margem_versao_esperada < 1)
        fail(422, 'pendencia_margem')
      if (
        body.ajustar_quantidade_para_moq !== undefined &&
        typeof body.ajustar_quantidade_para_moq !== 'boolean'
      )
        fail(400, 'payload_invalido')
      key = $security.sha256(scope + '\n' + actor.id + '\n' + body.idempotency_key)
      hash = $security.sha256(canonical(body))
      // Receipt collections must be server-only, or a client could forge a successful receipt.
      const receipts = $app.findCollectionByNameOrId('c2_idempotency_keys')
      if (
        ['createRule', 'updateRule', 'deleteRule'].some(
          (k) => receipts[k] !== null && receipts[k] !== undefined,
        )
      )
        fail(503, 'configuracao_recibos_insegura')
      let outcome = null
      $app.runInTransaction((tx) => {
        const fresh = validateActor(tx)
        const requestInfo = e.requestInfo()
        requestInfo.auth = fresh
        // Recheck inside serialized writer transaction BEFORE any version checks.
        const previous = findReceipt(tx, key)
        if (previous) {
          outcome = replay(previous)
          return
        }
        const offer = get(tx, 'cotacoes_itens', body.cotacao_iten_id)
        const cf = get(tx, 'cotacoes_fornecedor', offer.getString('cotacao_fornecedor_id'))
        const potential = get(tx, 'potenciais', cf.getString('potencial_id'))
        const pi = get(tx, 'potencial_itens', body.potencial_iten_id)
        const item = get(tx, 'itens', offer.getString('item_id'))
        const supplier = get(tx, 'fornecedores', cf.getString('fornecedor_id'))
        const evidence = get(tx, 'cotacoes_rodadas', body.rodada_resposta_id)
        const reads = [offer, cf, potential, pi, item, supplier, evidence]
        reads.forEach((r) => authorize(tx, r, 'view', requestInfo))
        if (pi.getString('potencial_id') !== potential.id || pi.getString('item_id') !== item.id)
          fail(409, 'relacoes_incoerentes')
        if (offer.getString('updated') !== body.versao) fail(409, 'conflito_versao')
        // Every mutable dependency read by the buyer must still have its expected version.
        for (const r of [cf, pi, potential, supplier, item, evidence]) {
          if (body.versoes_esperadas[r.id] !== r.getString('updated')) fail(409, 'conflito_versao')
        }
        if (offer.getInt('margem_versao') !== body.margem_versao_esperada)
          fail(409, 'conflito_margem')
        const margin = offer.get('margem_negociada')
        const precision = offer.get('precisao_negociada')
        if (!finite(margin) || margin < 0 || margin >= 100) fail(422, 'margem_invalida')
        if (precision !== 2 && precision !== 3) fail(422, 'precisao_invalida')
        const price = evidence.getFloat('preco')
        const moq = evidence.getFloat('moq')
        const quantity = pi.getFloat('quantidade')
        if (!finite(price) || price <= 0 || price > 1000000) fail(422, 'preco_invalido')
        if (
          !finite(moq) ||
          moq < 0 ||
          moq > 1000000 ||
          !finite(quantity) ||
          quantity <= 0 ||
          quantity > 1000000
        )
          fail(422, 'quantidade_invalida')
        const currency = evidence.getString('moeda')
        const unit = evidence.getString('unidade')
        const validity = evidence.getString('validade_oferta')
        if (!/^[A-Z]{3}$/.test(currency)) fail(422, 'moeda_ausente')
        if (!unit || unit !== pi.getString('unidade_medida')) fail(422, 'unidade_incompativel')
        const expires = Date.parse(validity)
        if (!isFinite(expires) || expires < Date.now()) fail(422, 'oferta_vencida_ou_ausente')
        const peers = tx.findRecordsByFilter(
          'potencial_itens',
          'potencial_id={:pot} && id != {:pi} && referencia_preco > 0',
          '',
          0,
          0,
          { pot: potential.id, pi: pi.id },
        )
        for (const peer of peers) {
          authorize(tx, peer, 'view', requestInfo)
          const peerCurrency = peer.getString('moeda_compra') || 'USD'
          if (peerCurrency !== currency) fail(422, 'moedas_mistas_no_potencial')
        }
        const currentCurrency = pi.getString('moeda_compra')
        if (currentCurrency && currentCurrency !== currency) fail(422, 'moeda_incompativel')
        // A target is never evidence. Matching the target IS allowed with a recorded response.
        if (
          evidence.getString('cotacao_iten') !== offer.id ||
          evidence.getString('potencial') !== potential.id ||
          evidence.getString('fornecedor') !== supplier.id ||
          evidence.getString('item') !== item.id
        )
          fail(409, 'relacoes_incoerentes')
        if (
          ['oferta_original', 'resposta_fabricante', 'oferta_confirmada'].indexOf(
            evidence.getString('tipo'),
          ) < 0 ||
          ['recebida', 'confirmada'].indexOf(evidence.getString('estado')) < 0 ||
          !evidence.getString('autor') ||
          !evidence.getString('data_oferta')
        )
          fail(422, 'resposta_nao_confirmada')
        if (
          evidence.getFloat('preco') !== price ||
          evidence.getString('moeda') !== currency ||
          evidence.getString('unidade') !== unit ||
          evidence.getFloat('moq') !== moq ||
          evidence.getFloat('quantidade') !== quantity
        )
          fail(409, 'resposta_divergente')
        const finalQuantity = Math.max(quantity, moq)
        if (finalQuantity !== quantity && body.ajustar_quantidade_para_moq !== true)
          fail(422, 'quantidade_abaixo_moq')
        const factor = precision === 2 ? 100 : 1000
        const sale = Math.round((price / (1 - margin / 100)) * factor) / factor
        if (!finite(sale) || sale <= 0 || sale > 1000000) fail(422, 'venda_invalida')
        const consumed = tx.findRecordsByFilter(
          'c2_idempotency_keys',
          'escopo={:scope} && recibo.resposta_id={:response} && recibo.potencial_id={:potential} && recibo.item_id={:item}',
          '',
          1,
          0,
          { scope, response: evidence.id, potential: potential.id, item: item.id },
        )
        if (consumed.length) fail(409, 'resposta_ja_confirmada')
        const date = new Date().toISOString()
        const eventId = $security.sha256(key + '\n' + hash)
        // Scope winner changes to THIS potential; never unset another potential's winner.
        const winners = tx.findRecordsByFilter(
          'cotacoes_itens',
          'item_id = {:item} && vencedor = true && cotacao_fornecedor_id.potencial_id = {:pot}',
          '',
          0,
          0,
          { item: item.id, pot: potential.id },
        )
        for (const winner of winners) {
          if (winner.id === offer.id) continue
          winner.set('vencedor', false)
          authorize(tx, winner, 'update', requestInfo)
          tx.save(winner)
        }
        offer.set('vencedor', true)
        if (offer.getFloat('preco_original') === 0)
          offer.set(
            'preco_original',
            offer.getFloat('preco_ofertado') > 0 ? offer.getFloat('preco_ofertado') : price,
          )
        offer.set('preco_ofertado', price)
        offer.set('quantidade_minima', moq)
        offer.set('margem_versao', offer.getInt('margem_versao') + 1)
        offer.set('rodada_atual', offer.getInt('rodada_atual') + 1)
        authorize(tx, offer, 'update', requestInfo)
        tx.save(offer)
        pi.set('referencia_preco', price)
        pi.set('referencia_fornecedor', supplier.getString('nome'))
        pi.set('referencia_data', date)
        pi.set('preco_unitario', sale)
        pi.set('quantidade', finalQuantity)
        pi.set('precisao_preco', precision)
        pi.set('moeda_compra', currency)
        const signingKey = $app.store().get('c2_confirmation_signing_key')
        if (!signingKey) fail(503, 'assinatura_runtime_ausente')
        const message = 'c2-confirm-v1\n' + pi.id + '\n' + sale + '\n' + price + '\n' + eventId
        pi.set('__c2_confirmation_event', eventId)
        pi.set('__c2_confirmation_mac', $security.hs256(message, signingKey))
        authorize(tx, pi, 'update', requestInfo)
        tx.save(pi)
        // Commercial terms come from the same immutable response the user reviewed.
        for (const n of ['incoterm', 'condicao_pagamento', 'tempo_fabricacao'])
          cf.set(n, evidence.getString(n))
        cf.set('oferta_moeda', currency)
        cf.set('oferta_unidade', unit)
        cf.set('oferta_validade', validity)
        authorize(tx, cf, 'update', requestInfo)
        tx.save(cf)
        // All intentional histories are saved in the transaction, never deferred outside it.
        const historyIds = []
        for (const kind of ['compra', 'venda']) {
          const h = new Record(tx.findCollectionByNameOrId('historico_precos'))
          h.set('item_id', item.id)
          h.set('preco', kind === 'compra' ? price : sale)
          h.set('fornecedor', supplier.getString('nome'))
          h.set('data_cotacao', date)
          h.set('tipo', kind)
          h.set('cliente', potential.getString('cliente'))
          h.set('potencial_id', potential.id)
          tx.save(h)
          // canAccessRecord queries a saved row; denial here still rolls back the transaction.
          const createInfo = e.requestInfo()
          createInfo.auth = fresh
          createInfo.body = h.publicExport()
          authorize(tx, h, 'create', createInfo)
          historyIds.push(h.id)
        }
        const round = new Record(tx.findCollectionByNameOrId('cotacoes_rodadas'))
        round.load({
          cotacao_iten: offer.id,
          cotacao_iten_ref: offer.id,
          potencial: potential.id,
          fornecedor: supplier.id,
          item: item.id,
          numero_rodada: offer.getInt('rodada_atual'),
          tipo: 'selecao',
          preco: price,
          moeda: currency,
          unidade: unit,
          quantidade: finalQuantity,
          moq,
          data_oferta: date,
          autor: fresh.id,
          estado: 'confirmada',
          observacoes: 'Resposta de origem: ' + evidence.id,
        })
        tx.save(round)
        const roundInfo = e.requestInfo()
        roundInfo.auth = fresh
        roundInfo.body = round.publicExport()
        authorize(tx, round, 'create', roundInfo)
        const receipt = {
          ok: true,
          evento_id: eventId,
          cotacao_iten_id: offer.id,
          potencial_iten_id: pi.id,
          item_id: item.id,
          potencial_id: potential.id,
          fornecedor_id: supplier.id,
          preco_compra: price,
          preco_unitario: sale,
          margem: margin,
          margem_versao: offer.getInt('margem_versao'),
          precisao: precision,
          moeda: currency,
          unidade: unit,
          quantidade: finalQuantity,
          moq,
          quantidade_ajustada_para_moq: finalQuantity !== quantity,
          preco_original_preservado: offer.getFloat('preco_original'),
          rodada: {
            id: round.id,
            numero_rodada: round.getInt('numero_rodada'),
            tipo: 'selecao',
            estado: 'confirmada',
          },
          resposta_id: evidence.id,
          historico_ids: historyIds,
          autor: fresh.id,
          data_confirmacao: date,
        }
        const idem = new Record(receipts)
        idem.load({
          chave: key,
          escopo: scope,
          payload_hash: hash,
          criado_por: fresh.id,
          recibo: receipt,
        })
        tx.save(idem)
        outcome = { repetido: false, recibo: receipt }
      })
      return e.json(200, outcome)
    } catch (err) {
      const match = /C2:(\d+):([a-z0-9_]+)/.exec(String((err && err.message) || err))
      if (match) return e.json(Number(match[1]), { error: match[2] })
      // SQLite serializes writers. Re-read a receipt on a competing transaction failure.
      if (key && hash) {
        try {
          const saved = findReceipt($app, key)
          if (saved) return e.json(200, replay(saved))
        } catch (_) {}
      }
      return e.json(500, { error: 'falha_transacao' })
    }
  },
  $apis.requireAuth(),
)
