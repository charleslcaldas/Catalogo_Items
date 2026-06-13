onRecordAfterUpdateSuccess((e) => {
  const webhookUrl = $secrets.get('ZOHO_WEBHOOK_URL') || 'https://hook.us1.make.com/dummyzoho'

  const record = e.record
  const original = record.original()

  let changed = false
  const coreFields = [
    'sku',
    'linha_id',
    'descr_pt',
    'descr_en',
    'tamanho',
    'acabamento_id',
    'ncm_id',
    'material',
    'preco_compra',
    'preco_venda',
    'ativo',
    'foto_url',
    'foto_arquivo',
    'classe',
    'norma',
    'descricao_base_pt',
    'descricao_base_en',
    'classe_material',
    'tipo_rosca',
    'comprimento_rosca',
    'informacao_extra',
    'descricao_extra',
  ]

  for (const field of coreFields) {
    if (record.getString(field) !== original.getString(field)) {
      changed = true
      break
    }
  }

  if (!changed) {
    return e.next()
  }

  const pbUrl =
    $secrets.get('PB_INSTANCE_URL') || 'https://skip-cloud-db-59750.shrd00.internal.goskip.dev'

  let imageUrl = record.getString('foto_url')
  if (record.getString('foto_arquivo')) {
    imageUrl =
      pbUrl +
      '/api/files/' +
      record.collection().id +
      '/' +
      record.id +
      '/' +
      record.getString('foto_arquivo')
  }

  const payload = {
    event: 'update',
    record: record.publicExport(),
    image_url: imageUrl,
  }

  try {
    $http.send({
      url: webhookUrl,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 10,
    })
  } catch (err) {
    console.log('Zoho sync update failed: ', err.message)
  }
  return e.next()
}, 'itens')
