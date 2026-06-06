onRecordAfterCreateSuccess((e) => {
  const webhookUrl = $secrets.get('ZOHO_WEBHOOK_URL') || 'https://hook.us1.make.com/dummyzoho'

  const record = e.record
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
    event: 'create',
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
    console.log('Zoho sync create failed: ', err.message)
  }

  e.next()
}, 'itens')
