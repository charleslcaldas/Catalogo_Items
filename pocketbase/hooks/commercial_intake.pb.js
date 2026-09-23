/// <reference path="../pb_data/types.d.ts" />

routerAdd('POST', '/api/c2/v1/commercial-intakes', (e) => {
  const respond = (status, code, data) => e.json(status, data ? { code, ...data } : { code })
  const fail = (kind) => {
    const error = new Error('commercial intake rejected')
    error.kind = kind
    throw error
  }
  const dateMillis = (value) => Date.parse(String(value).replace(' ', 'T'))
  const sameKeys = (value, keys) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
    const actual = Object.keys(value).sort()
    const expected = keys.slice().sort()
    return (
      actual.length === expected.length && actual.every((key, index) => key === expected[index])
    )
  }
  const canonicalize = (value) => {
    if (Array.isArray(value)) return value.map(canonicalize)
    if (value !== null && typeof value === 'object') {
      const result = {}
      for (const key of Object.keys(value).sort()) result[key] = canonicalize(value[key])
      return result
    }
    return value
  }
  const validNfcText = (value, min, max) =>
    typeof value === 'string' &&
    value.length >= min &&
    value.length <= max &&
    value === value.normalize('NFC') &&
    value === value.trim() &&
    !/[\u0000-\u001f\u007f-\u009f]/.test(value)
  const validDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }
  const validManifest = (body) => {
    if (
      !sameKeys(body, [
        'approval',
        'customer',
        'operation',
        'operation_key',
        'runtime',
        'schema_version',
        'skip',
      ])
    )
      return false
    if (!sameKeys(body.approval, ['approved_payload_sha256', 'reference'])) return false
    if (!sameKeys(body.customer, ['crm_account_id', 'name'])) return false
    if (!sameKeys(body.runtime, ['crm_deal_id'])) return false
    if (!sameKeys(body.skip, ['closing_date', 'items', 'potential_name', 'request_date', 'status']))
      return false
    if (body.operation !== 'create_commercial_intake' || body.schema_version !== 1) return false
    if (!/^[a-z0-9][a-z0-9-]{7,79}$/.test(body.operation_key)) return false
    if (!/^[a-f0-9]{64}$/.test(body.approval.approved_payload_sha256)) return false
    if (!/^[A-Za-z0-9][A-Za-z0-9:._/-]{0,199}$/.test(body.approval.reference)) return false
    if (!/^[0-9]{17,20}$/.test(body.customer.crm_account_id)) return false
    if (!/^[0-9]{17,20}$/.test(body.runtime.crm_deal_id)) return false
    if (!validNfcText(body.customer.name, 1, 120)) return false
    if (!validNfcText(body.skip.potential_name, 1, 200)) return false
    if (!validDate(body.skip.request_date) || !validDate(body.skip.closing_date)) return false
    if (body.skip.status !== 'Solicitado Cotação') return false
    if (!Array.isArray(body.skip.items) || body.skip.items.length !== 2) return false
    for (let index = 0; index < body.skip.items.length; index++) {
      const item = body.skip.items[index]
      if (!sameKeys(item, ['item_id', 'order', 'quantity', 'sku', 'unit'])) return false
      if (!/^[a-z0-9]{15}$/.test(item.item_id)) return false
      if (!/^[A-Z0-9][A-Z0-9.-]{0,63}$/.test(item.sku)) return false
      if (item.order !== index + 1) return false
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000000)
        return false
      if (item.unit !== 'KPC') return false
    }
    return true
  }
  const observationsFor = (body) =>
    [
      `Solicitação: ${body.skip.request_date}`,
      `Fechamento previsto: ${body.skip.closing_date}`,
      `CRM Account ID: ${body.customer.crm_account_id}`,
      `CRM Deal ID: ${body.runtime.crm_deal_id}`,
      `Operação: ${body.operation_key}`,
      `Aprovação: ${body.approval.reference}`,
      `Payload aprovado SHA-256: ${body.approval.approved_payload_sha256}`,
    ].join('\n')
  const operationMatches = (record, body, observations) =>
    record.getString('operation_key') === body.operation_key &&
    record.getString('approval_ref') === body.approval.reference &&
    record.getString('approved_payload_sha256') === body.approval.approved_payload_sha256 &&
    record.getString('customer_name') === body.customer.name &&
    record.getString('crm_account_id') === body.customer.crm_account_id &&
    record.getString('crm_deal_id') === body.runtime.crm_deal_id &&
    record.getString('request_date') === body.skip.request_date &&
    record.getString('closing_date') === body.skip.closing_date &&
    record.getString('potential_name') === body.skip.potential_name &&
    record.getString('status') === body.skip.status &&
    record.getString('potential_observations') === observations &&
    record.getInt('expected_item_count') === 2
  const assertField = (collection, name, type, required) => {
    const field = collection.fields.getByName(name)
    if (
      !field ||
      field.type() !== type ||
      (required !== undefined && field.required !== required)
    ) {
      fail('internal_error')
    }
    return field
  }
  const assertCreatedAutodate = (collection) => {
    const field = assertField(collection, 'created', 'autodate')
    if (field.onCreate !== true || field.onUpdate !== false) fail('internal_error')
  }
  const normalizedIndex = (collection, name) =>
    collection
      .getIndex(name)
      .toLowerCase()
      .replace(/[`"\s]/g, '')
  const preflight = (app) => {
    const specs = {
      commercial_intake_operations: [
        ['operation_key', 'text', true],
        ['approval_ref', 'text', true],
        ['approved_payload_sha256', 'text', true],
        ['customer_name', 'text', true],
        ['crm_account_id', 'text', true],
        ['crm_deal_id', 'text', true],
        ['request_date', 'text', true],
        ['closing_date', 'text', true],
        ['potential_name', 'text', true],
        ['status', 'text', true],
        ['potential_observations', 'text', true],
        ['expected_item_count', 'number', true],
        ['created', 'autodate'],
      ],
      commercial_intake_approvals: [
        ['operation_id', 'relation', true],
        ['attempt_no', 'number', true],
        ['request_sha256', 'text', true],
        ['capability_sha256', 'text', true],
        ['environment', 'text', true],
        ['write_expires_at', 'date', true],
        ['recovery_expires_at', 'date', true],
        ['created', 'autodate'],
      ],
      commercial_intake_results: [
        ['operation_id', 'relation', true],
        ['request_sha256', 'text', true],
        ['approval_id', 'relation', true],
        ['potential_id', 'relation', true],
        ['line_1_id', 'relation', true],
        ['line_2_id', 'relation', true],
        ['crm_deal_id', 'text', true],
        ['created', 'autodate'],
      ],
      potenciais: [
        ['numero_potencial', 'text', true],
        ['cliente', 'text', true],
        ['status', 'text', true],
        ['nome_potencial', 'text', false],
        ['observacoes', 'text', false],
        ['proprietario', 'text', false],
        ['nome_comprador', 'text', false],
        ['notas', 'text', false],
        ['estagio_id', 'relation', false],
        ['anexos', 'file', false],
        ['incoterm_cliente', 'text', false],
        ['condicao_pagamento_cliente', 'text', false],
        ['tempo_fabricacao_cliente', 'text', false],
      ],
      potencial_itens: [
        ['potencial_id', 'relation', true],
        ['item_id', 'relation', true],
        ['quantidade', 'number', true],
        ['unidade_medida', 'text', false],
        ['ordem', 'number', false],
        ['preco_unitario', 'number', false],
        ['observacoes', 'text', false],
        ['referencia_preco', 'number', false],
        ['referencia_fornecedor', 'text', false],
        ['referencia_data', 'date', false],
      ],
      itens: [
        ['sku', 'text', true],
        ['ativo', 'bool', false],
      ],
      historico_precos: [['potencial_id', 'relation', false]],
      estagios_potencial: [['nome', 'text', true]],
    }
    const collections = {}
    for (const [name, fields] of Object.entries(specs)) {
      const collection = app.findCollectionByNameOrId(name)
      if (!collection.isBase()) fail('internal_error')
      for (const spec of fields) assertField(collection, spec[0], spec[1], spec[2])
      collections[name] = collection
    }
    for (const name of [
      'commercial_intake_operations',
      'commercial_intake_approvals',
      'commercial_intake_results',
    ]) {
      const collection = collections[name]
      if (
        collection.listRule !== null ||
        collection.viewRule !== null ||
        collection.createRule !== null ||
        collection.updateRule !== null ||
        collection.deleteRule !== null
      )
        fail('internal_error')
    }
    const expectedIndexes = [
      [
        'commercial_intake_operations',
        'idx_commercial_intake_operations_operation_key',
        'createuniqueindexidx_commercial_intake_operations_operation_keyoncommercial_intake_operations(operation_key)',
      ],
      [
        'commercial_intake_approvals',
        'idx_commercial_intake_approvals_capability_sha256',
        'createuniqueindexidx_commercial_intake_approvals_capability_sha256oncommercial_intake_approvals(capability_sha256)',
      ],
      [
        'commercial_intake_approvals',
        'idx_commercial_intake_approvals_operation_attempt',
        'createuniqueindexidx_commercial_intake_approvals_operation_attemptoncommercial_intake_approvals(operation_id,attempt_no)',
      ],
      [
        'commercial_intake_results',
        'idx_commercial_intake_results_operation_id',
        'createuniqueindexidx_commercial_intake_results_operation_idoncommercial_intake_results(operation_id)',
      ],
      [
        'potenciais',
        'idx_potenciais_numero',
        'createuniqueindexidx_potenciais_numeroonpotenciais(numero_potencial)',
      ],
      ['itens', 'idx_itens_sku', 'createuniqueindexidx_itens_skuonitens(sku)'],
    ]
    for (const spec of expectedIndexes) {
      if (normalizedIndex(collections[spec[0]], spec[1]) !== spec[2]) fail('internal_error')
    }
    const relationSpecs = [
      ['commercial_intake_approvals', 'operation_id', 'commercial_intake_operations', false],
      ['commercial_intake_results', 'operation_id', 'commercial_intake_operations', false],
      ['commercial_intake_results', 'approval_id', 'commercial_intake_approvals', false],
      ['commercial_intake_results', 'potential_id', 'potenciais', false],
      ['commercial_intake_results', 'line_1_id', 'potencial_itens', false],
      ['commercial_intake_results', 'line_2_id', 'potencial_itens', false],
      ['potencial_itens', 'potencial_id', 'potenciais', true],
      ['potencial_itens', 'item_id', 'itens', true],
      ['historico_precos', 'potencial_id', 'potenciais', false],
      ['potenciais', 'estagio_id', 'estagios_potencial', false],
    ]
    for (const spec of relationSpecs) {
      const field = collections[spec[0]].fields.getByName(spec[1])
      if (
        field.collectionId !== collections[spec[2]].id ||
        field.maxSelect !== 1 ||
        field.cascadeDelete !== spec[3]
      )
        fail('internal_error')
    }
    const integerSpecs = [
      ['commercial_intake_operations', 'expected_item_count'],
      ['commercial_intake_approvals', 'attempt_no'],
      ['potencial_itens', 'quantidade'],
    ]
    for (const spec of integerSpecs) {
      if (collections[spec[0]].fields.getByName(spec[1]).onlyInt !== true) {
        fail('internal_error')
      }
    }
    for (const name of [
      'commercial_intake_operations',
      'commercial_intake_approvals',
      'commercial_intake_results',
    ])
      assertCreatedAutodate(collections[name])

    const expectedTriggerHashes = {
      trg_commercial_intake_approval_delete:
        '374a24840f3af999e31fdc33f0a50d3456479739898adb85908aa9eb3d8c7018',
      trg_commercial_intake_approval_update:
        '574356722a8e382ec4325b058c39b314417e5ffc259b8077bd42b01e1b65e88b',
      trg_commercial_intake_history_insert:
        'bf61c0c7d02c5d337539cfec4581586a91bead022d81268b69ad6a75b57e3c4a',
      trg_commercial_intake_history_update:
        '7acc46a87d675b5279ec9faa9e34d227c6b2f88cda7ddfa172f770c0857daab8',
      trg_commercial_intake_line_delete:
        '276647f31b511f258c45c4534948f789dd734e646387b717414d7216d09f3ace',
      trg_commercial_intake_line_insert_terminal:
        '8e59219987f60c46fe8bee48485352afa155b7d27d12e73a20ee7f75bf2591fe',
      trg_commercial_intake_line_order_insert:
        '070128c680f86a8e3508d9fb06654543889f68421b43540657c41abb8145b5f5',
      trg_commercial_intake_line_order_update:
        'f30099c9c63b7b16643b30118db94bd632e0a657f2d3e89fac27bf8ce342cae6',
      trg_commercial_intake_line_update:
        'b9f0d820202a8019a0415894f4827d6f5877fd886721cfe39cdcf2d2962d0c9f',
      trg_commercial_intake_operation_delete:
        '5bc67138d1c1f2ec262779c9ec7ef55f31c5079cb9f14643566e42953a5bc834',
      trg_commercial_intake_operation_update:
        'b84e381eeb3f8c647e869eeb6be9127724f7ead0353f421e35da46c14a66375c',
      trg_commercial_intake_potential_delete:
        'b686efc28e664b83a8d06f905e32406bd543c5f6b5b1e0b53bb9424a5b4efbf7',
      trg_commercial_intake_potential_update:
        'b6ccf04ab489bc90a4164ff73517cc77278216462f2a81db0ee98ef07b937279',
      trg_commercial_intake_result_delete:
        '86d81d69e0b49a9d130fdfc5e9086c9faf490e3c456b353b71d6cafae3373ef1',
      trg_commercial_intake_result_update:
        '09e49c759af8136900d933c447a255f3cd837c99f4dfba8d3dc75e6bcfc88fc8',
    }
    const expectedTriggerNames = Object.keys(expectedTriggerHashes).sort()
    const triggerProjection = new DynamicModel({ names: '' })
    app
      .db()
      .newQuery(
        "SELECT COALESCE(group_concat(name, ','), '') AS names FROM (" +
          "SELECT name FROM sqlite_master WHERE type = 'trigger' " +
          "AND name LIKE 'trg_commercial_intake_%' ORDER BY name" +
          ')',
      )
      .one(triggerProjection)
    if (triggerProjection.names !== expectedTriggerNames.join(',')) fail('internal_error')
    for (const name of expectedTriggerNames) {
      const definition = new DynamicModel({ sql: '' })
      app
        .db()
        .newQuery(
          "SELECT COALESCE(sql, '') AS sql FROM sqlite_master " +
            "WHERE type = 'trigger' AND name = {:name}",
        )
        .bind({ name })
        .one(definition)
      const normalizedSql = definition.sql.toLowerCase().replace(/[`"\s]/g, '')
      if ($security.sha256(normalizedSql) !== expectedTriggerHashes[name]) fail('internal_error')
    }
    return collections
  }
  const reconcile = (app, operation, approval, result, body, requestHash, observations) => {
    try {
      const reconciliationExpiry = dateMillis(approval.getString('recovery_expires_at'))
      if (
        !operationMatches(operation, body, observations) ||
        approval.getString('operation_id') !== operation.id ||
        approval.getString('capability_sha256') !== capabilityHash ||
        approval.getString('request_sha256') !== requestHash ||
        approval.getString('environment') !== 'production' ||
        approval.getInt('attempt_no') < 1 ||
        !Number.isFinite(reconciliationExpiry) ||
        Date.now() >= reconciliationExpiry ||
        result.getString('operation_id') !== operation.id ||
        result.getString('approval_id') !== approval.id ||
        result.getString('request_sha256') !== requestHash ||
        result.getString('crm_deal_id') !== body.runtime.crm_deal_id
      )
        fail('recovery_required')

      const potential = app.findRecordById('potenciais', result.getString('potential_id'))
      if (
        potential.getString('numero_potencial') !== body.operation_key ||
        potential.getString('cliente') !== body.customer.name ||
        potential.getString('status') !== body.skip.status ||
        potential.getString('nome_potencial') !== body.skip.potential_name ||
        potential.getString('observacoes') !== observations ||
        potential.getString('proprietario') !== '' ||
        potential.getString('nome_comprador') !== '' ||
        potential.getString('notas') !== '' ||
        potential.getString('estagio_id') !== '' ||
        potential.getString('incoterm_cliente') !== '' ||
        potential.getString('condicao_pagamento_cliente') !== '' ||
        potential.getString('tempo_fabricacao_cliente') !== '' ||
        potential.getStringSlice('anexos').length !== 0
      )
        fail('recovery_required')

      const lines = app.findRecordsByFilter(
        'potencial_itens',
        'potencial_id = {:potential}',
        'ordem',
        3,
        0,
        { potential: potential.id },
      )
      if (
        lines.length !== 2 ||
        lines[0].id !== result.getString('line_1_id') ||
        lines[1].id !== result.getString('line_2_id')
      )
        fail('recovery_required')

      for (let index = 0; index < lines.length; index++) {
        const line = lines[index]
        const expected = body.skip.items[index]
        const liveItem = app.findRecordById('itens', expected.item_id)
        if (
          !liveItem.getBool('ativo') ||
          liveItem.getString('sku') !== expected.sku ||
          line.getString('potencial_id') !== potential.id ||
          line.getString('item_id') !== expected.item_id ||
          line.getInt('quantidade') !== expected.quantity ||
          line.getString('unidade_medida') !== expected.unit ||
          line.getFloat('ordem') !== expected.order ||
          line.getFloat('preco_unitario') !== 0 ||
          line.getString('observacoes') !== '' ||
          line.getFloat('referencia_preco') !== 0 ||
          line.getString('referencia_fornecedor') !== '' ||
          line.getString('referencia_data') !== ''
        )
          fail('recovery_required')
      }

      const history = app.findRecordsByFilter(
        'historico_precos',
        'potencial_id = {:potential}',
        '',
        1,
        0,
        { potential: potential.id },
      )
      if (history.length !== 0) fail('recovery_required')

      return {
        operation_key: body.operation_key,
        potential_id: potential.id,
        line_1_id: lines[0].id,
        line_2_id: lines[1].id,
      }
    } catch (error) {
      if (error && error.kind) throw error
      fail('recovery_required')
    }
  }

  let bytes
  try {
    bytes = toBytes(e.request.body, 8193)
    if (bytes.length > 8192) return respond(413, 'invalid_request')
  } catch (_) {
    return respond(413, 'invalid_request')
  }

  const authorization = e.request.header.values('Authorization')
  if (authorization.length !== 1) return respond(401, 'unauthorized')
  const match = /^C2Capability ([A-Za-z0-9_-]{43})$/.exec(authorization[0])
  if (!match) return respond(401, 'unauthorized')
  const capabilityHash = $security.sha256(match[1])

  let approval
  try {
    approval = e.app.findFirstRecordByFilter(
      'commercial_intake_approvals',
      'capability_sha256 = {:hash}',
      { hash: capabilityHash },
    )
  } catch (_) {
    return respond(401, 'unauthorized')
  }

  const recoveryExpiry = dateMillis(approval.getString('recovery_expires_at'))
  if (
    approval.getString('environment') !== 'production' ||
    !Number.isFinite(recoveryExpiry) ||
    Date.now() >= recoveryExpiry
  )
    return respond(401, 'unauthorized')

  if (
    e.request.header.values('Content-Type').length !== 1 ||
    e.request.header.values('Content-Type')[0] !== 'application/json' ||
    e.request.header.values('Content-Encoding').length !== 0
  )
    return respond(400, 'invalid_request')

  let raw
  let body
  try {
    raw = toString(bytes)
    const roundTrip = toBytes(raw)
    if (
      roundTrip.length !== bytes.length ||
      roundTrip.some((value, index) => value !== bytes[index])
    )
      return respond(400, 'invalid_request')
    body = JSON.parse(raw)
    if (JSON.stringify(canonicalize(body)) !== raw || !validManifest(body)) {
      return respond(400, 'invalid_request')
    }
  } catch (_) {
    return respond(400, 'invalid_request')
  }

  const requestHash = $security.sha256(raw)
  if (approval.getString('request_sha256') !== requestHash) {
    return respond(409, 'idempotency_conflict')
  }

  const observations = observationsFor(body)
  let responseData
  let reconciled = false
  let createdNow = false
  try {
    e.app.runInTransaction((txApp) => {
      const collections = preflight(txApp)
      const txApproval = txApp.findRecordById('commercial_intake_approvals', approval.id)
      const txRecoveryExpiry = dateMillis(txApproval.getString('recovery_expires_at'))
      if (
        txApproval.getString('capability_sha256') !== capabilityHash ||
        txApproval.getString('request_sha256') !== requestHash ||
        txApproval.getString('environment') !== 'production' ||
        txApproval.getInt('attempt_no') < 1 ||
        !Number.isFinite(txRecoveryExpiry) ||
        Date.now() >= txRecoveryExpiry
      )
        fail('unauthorized')

      const operation = txApp.findRecordById(
        'commercial_intake_operations',
        txApproval.getString('operation_id'),
      )
      if (!operationMatches(operation, body, observations)) fail('idempotency_conflict')

      let existingResult = null
      try {
        existingResult = txApp.findFirstRecordByFilter(
          'commercial_intake_results',
          'operation_id = {:operation}',
          { operation: operation.id },
        )
      } catch (_) {}
      if (existingResult) {
        responseData = reconcile(
          txApp,
          operation,
          txApproval,
          existingResult,
          body,
          requestHash,
          observations,
        )
        reconciled = true
        return
      }

      try {
        txApp.findFirstRecordByFilter('potenciais', 'numero_potencial = {:operationKey}', {
          operationKey: body.operation_key,
        })
        fail('recovery_required')
      } catch (error) {
        if (error && error.kind) throw error
      }

      const writeExpiry = dateMillis(txApproval.getString('write_expires_at'))
      if (!Number.isFinite(writeExpiry) || Date.now() >= writeExpiry) fail('unauthorized')

      const items = []
      for (const requested of body.skip.items) {
        let item
        try {
          item = txApp.findRecordById('itens', requested.item_id)
        } catch (_) {
          fail('invalid_request')
        }
        if (!item.getBool('ativo') || item.getString('sku') !== requested.sku) {
          fail('invalid_request')
        }
        items.push(item)
      }

      const potential = new Record(collections.potenciais)
      potential.set('numero_potencial', body.operation_key)
      potential.set('cliente', body.customer.name)
      potential.set('status', body.skip.status)
      potential.set('nome_potencial', body.skip.potential_name)
      potential.set('observacoes', observations)
      txApp.save(potential)
      if (
        potential.getString('numero_potencial') !== body.operation_key ||
        potential.getString('cliente') !== body.customer.name ||
        potential.getString('status') !== body.skip.status ||
        potential.getString('nome_potencial') !== body.skip.potential_name ||
        potential.getString('observacoes') !== observations ||
        potential.getString('proprietario') !== '' ||
        potential.getString('nome_comprador') !== '' ||
        potential.getString('notas') !== '' ||
        potential.getString('estagio_id') !== '' ||
        potential.getString('incoterm_cliente') !== '' ||
        potential.getString('condicao_pagamento_cliente') !== '' ||
        potential.getString('tempo_fabricacao_cliente') !== '' ||
        potential.getStringSlice('anexos').length !== 0
      )
        fail('internal_error')

      const context = new Context(null, 'c2.commercialIntake.skipPriceReference', true)
      const lines = []
      for (let index = 0; index < body.skip.items.length; index++) {
        const requested = body.skip.items[index]
        const line = new Record(collections.potencial_itens)
        line.set('potencial_id', potential.id)
        line.set('item_id', items[index].id)
        line.set('quantidade', requested.quantity)
        line.set('unidade_medida', requested.unit)
        line.set('ordem', requested.order)
        txApp.saveWithContext(context, line)
        if (
          line.getString('potencial_id') !== potential.id ||
          line.getString('item_id') !== items[index].id ||
          line.getInt('quantidade') !== requested.quantity ||
          line.getString('unidade_medida') !== requested.unit ||
          line.getFloat('ordem') !== requested.order ||
          line.getFloat('preco_unitario') !== 0 ||
          line.getString('observacoes') !== '' ||
          line.getFloat('referencia_preco') !== 0 ||
          line.getString('referencia_fornecedor') !== '' ||
          line.getString('referencia_data') !== ''
        )
          fail('internal_error')
        lines.push(line)
      }

      const result = new Record(collections.commercial_intake_results)
      result.set('operation_id', operation.id)
      result.set('request_sha256', requestHash)
      result.set('approval_id', txApproval.id)
      result.set('potential_id', potential.id)
      result.set('line_1_id', lines[0].id)
      result.set('line_2_id', lines[1].id)
      result.set('crm_deal_id', body.runtime.crm_deal_id)
      txApp.save(result)
      createdNow = true
      if (
        result.getString('operation_id') !== operation.id ||
        result.getString('request_sha256') !== requestHash ||
        result.getString('approval_id') !== txApproval.id ||
        result.getString('potential_id') !== potential.id ||
        result.getString('line_1_id') !== lines[0].id ||
        result.getString('line_2_id') !== lines[1].id ||
        result.getString('crm_deal_id') !== body.runtime.crm_deal_id
      )
        fail('internal_error')

      try {
        const finalApproval = txApp.findRecordById('commercial_intake_approvals', txApproval.id)
        const finalOperation = txApp.findRecordById('commercial_intake_operations', operation.id)
        const finalResult = txApp.findRecordById('commercial_intake_results', result.id)
        responseData = reconcile(
          txApp,
          finalOperation,
          finalApproval,
          finalResult,
          body,
          requestHash,
          observations,
        )
      } catch (_) {
        fail('internal_error')
      }
    })

    const postCommitApproval = e.app.findRecordById('commercial_intake_approvals', approval.id)
    const postCommitOperation = e.app.findRecordById(
      'commercial_intake_operations',
      postCommitApproval.getString('operation_id'),
    )
    const postCommitResult = e.app.findFirstRecordByFilter(
      'commercial_intake_results',
      'operation_id = {:operation}',
      { operation: postCommitOperation.id },
    )
    preflight(e.app)
    responseData = reconcile(
      e.app,
      postCommitOperation,
      postCommitApproval,
      postCommitResult,
      body,
      requestHash,
      observations,
    )
  } catch (error) {
    if (error && error.kind === 'unauthorized') return respond(401, 'unauthorized')
    if (error && error.kind === 'invalid_request') return respond(400, 'invalid_request')
    if (error && error.kind === 'idempotency_conflict') return respond(409, 'idempotency_conflict')
    if (error && error.kind === 'recovery_required') {
      return createdNow ? respond(500, 'internal_error') : respond(409, 'recovery_required')
    }
    return respond(500, 'internal_error')
  }

  return reconciled
    ? respond(200, 'reconciled', responseData)
    : respond(201, 'created', responseData)
})
