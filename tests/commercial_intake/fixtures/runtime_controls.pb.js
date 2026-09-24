/// <reference path="../../pb_data/types.d.ts" />

routerAdd('POST', '/__test/normal-potential-item', (e) => {
  const potential = new Record(e.app.findCollectionByNameOrId('potenciais'))
  potential.set('numero_potencial', 'normal-flow-fixture')
  potential.set('cliente', 'Sanitized Customer')
  potential.set('status', 'Solicitado Cotação')
  e.app.save(potential)

  const line = new Record(e.app.findCollectionByNameOrId('potencial_itens'))
  line.set('potencial_id', potential.id)
  line.set('item_id', 'itm000000000001')
  line.set('quantidade', 1)
  line.set('unidade_medida', 'KPC')
  line.set('ordem', 1)
  e.app.save(line)

  return e.json(201, { potential_id: potential.id, line_id: line.id })
})

onRecordCreate((e) => {
  const operationKey = e.record.getString('numero_potencial')
  if (operationKey === 'mutate-parent-0001') {
    e.record.set('proprietario', 'Injected Owner')
  }
  if (operationKey === 'rollback-parent-0001') {
    throw new Error('sanitized parent crash')
  }
  return e.next()
}, 'potenciais')

onRecordCreate((e) => {
  const potential = e.app.findRecordById('potenciais', e.record.getString('potencial_id'))
  const operationKey = potential.getString('numero_potencial')
  const order = e.record.getInt('ordem')
  if (operationKey === 'mutate-line-0001' && order === 1) {
    e.record.set('quantidade', 999)
  }
  if (operationKey === 'fractional-order-0001' && order === 1) {
    e.record.set('ordem', 1.5)
  }
  if (
    (operationKey === 'rollback-line1-0001' && order === 1) ||
    (operationKey === 'rollback-line2-0001' && order === 2)
  ) {
    throw new Error('sanitized line crash')
  }
  return e.next()
}, 'potencial_itens')

onRecordCreate((e) => {
  const operation = e.app.findRecordById(
    'commercial_intake_operations',
    e.record.getString('operation_id'),
  )
  const operationKey = operation.getString('operation_key')
  if (operationKey === 'mutate-result-0001') {
    e.record.set('crm_deal_id', '99999999999999999')
  }
  if (operationKey === 'rollback-result-0001') {
    throw new Error('sanitized result crash')
  }
  return e.next()
}, 'commercial_intake_results')

onRecordAfterCreateSuccess((e) => {
  const operation = e.app.findRecordById(
    'commercial_intake_operations',
    e.record.getString('operation_id'),
  )
  const operationKey = operation.getString('operation_key')
  if (operationKey === 'late-parent-mutation-0001') {
    const potential = e.app.findRecordById('potenciais', e.record.getString('potential_id'))
    potential.set('status', 'Tampered After Result')
    e.app.save(potential)
  }

  if (operationKey === 'late-side-effects-0001') {
    const extraLine = new Record(e.app.findCollectionByNameOrId('potencial_itens'))
    extraLine.set('potencial_id', e.record.getString('potential_id'))
    extraLine.set('item_id', 'itm000000000001')
    extraLine.set('quantidade', 1)
    extraLine.set('unidade_medida', 'KPC')
    extraLine.set('ordem', 3)
    const context = new Context(null, 'c2.commercialIntake.skipPriceReference', true)
    e.app.saveWithContext(context, extraLine)

    const history = new Record(e.app.findCollectionByNameOrId('historico_precos'))
    history.set('item_id', 'itm000000000001')
    history.set('potencial_id', e.record.getString('potential_id'))
    history.set('preco', 1)
    history.set('tipo', 'venda')
    e.app.save(history)
  }
  return e.next()
}, 'commercial_intake_results')
