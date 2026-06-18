// @deps papaparse@5.4.1
routerAdd(
  'POST',
  '/backend/v1/csv/import-items',
  (e) => {
    const Papa = require('papaparse')
    const body = e.requestInfo().body || {}
    const csv = body.csv
    if (!csv) return e.badRequestError('csv is required')

    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true })
    let sucessos = 0
    let erros = 0
    const detalhes_erros = []

    for (const row of parsed.data) {
      if (!row.SKU) {
        erros++
        detalhes_erros.push({ linha: row, erro: 'SKU ausente' })
        continue
      }
      try {
        let record
        try {
          record = $app.findFirstRecordByData('itens', 'sku', row.SKU)
        } catch (_) {
          const collection = $app.findCollectionByNameOrId('itens')
          record = new Record(collection)
          record.set('sku', row.SKU)
        }

        if (row['Descricao Pt']) record.set('descr_pt', row['Descricao Pt'])
        if (row['Descricao En']) record.set('descr_en', row['Descricao En'])
        if (row['Tamanho']) record.set('tamanho', row['Tamanho'])
        if (row['Preco Compra']) record.set('preco_compra', parseFloat(row['Preco Compra']) || 0)
        if (row['Preco Venda']) record.set('preco_venda', parseFloat(row['Preco Venda']) || 0)
        if (row['Ativo']) record.set('ativo', row['Ativo'].toLowerCase() !== 'false')

        if (!record.getString('linha_id')) {
          const linhas = $app.findRecordsByFilter('linhas', '1=1', '', 1, 0)
          if (linhas.length > 0) {
            record.set('linha_id', linhas[0].id)
          } else {
            throw new Error('linha_id obrigatório e nenhuma linha encontrada.')
          }
        }

        $app.save(record)
        sucessos++
      } catch (err) {
        erros++
        detalhes_erros.push({ sku: row.SKU, erro: err.message })
      }
    }

    try {
      const logCol = $app.findCollectionByNameOrId('logs_importacao')
      const log = new Record(logCol)
      log.set('arquivo_nome', 'import.csv')
      log.set('total_processado', sucessos + erros)
      log.set('sucessos', sucessos)
      log.set('erros', erros)
      log.set('detalhes_erros', JSON.stringify(detalhes_erros))
      $app.save(log)
    } catch (e) {}

    return e.json(200, { sucessos, erros, detalhes_erros })
  },
  $apis.requireAuth(),
)
