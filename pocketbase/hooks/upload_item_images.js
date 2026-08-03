routerAdd(
  'POST',
  '/backend/v1/upload-item-images',
  (e) => {
    const body = e.requestInfo().body || {}
    const rows = body.rows || []

    $app.logger().info('upload-item-images called', 'rowCount', rows.length)

    for (let i = 0; i < rows.length; i++) {
      $app
        .logger()
        .info(
          'manifest row',
          'index',
          i,
          'sku',
          rows[i].sku || '',
          'item_id_books',
          rows[i].item_id_books || '',
          'imagem',
          rows[i].imagem || '',
        )
    }

    let atualizados = 0
    let duplicados = 0
    let naoEncontrados = 0
    let erros = 0
    const detalhes = []
    const processedItems = {}

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const sku = row.sku || ''
      const itemIdBooks = row.item_id_books || ''
      const imagem = row.imagem || ''

      let item = null
      if (sku) {
        try {
          item = $app.findFirstRecordByData('itens', 'sku', sku)
        } catch (_) {}
      }
      if (!item && itemIdBooks) {
        try {
          item = $app.findFirstRecordByData('itens', 'item_id_books', itemIdBooks)
        } catch (_) {}
      }

      if (!item) {
        naoEncontrados++
        detalhes.push({
          status: 'Não Encontrado',
          sku: sku,
          item_id_books: itemIdBooks,
          imagem: imagem,
          mensagem:
            'Item não encontrado com SKU "' + sku + '" ou Item ID Books "' + itemIdBooks + '"',
        })
        continue
      }

      let foto = null
      if (imagem) {
        try {
          foto = $app.findFirstRecordByData('foto_catalogo', 'descricao', imagem)
        } catch (_) {}
      }

      if (!foto) {
        erros++
        detalhes.push({
          status: 'Erro',
          sku: sku,
          item_id_books: itemIdBooks,
          imagem: imagem,
          mensagem:
            'Foto não encontrada no catálogo para o arquivo "' +
            imagem +
            '". Campos recebidos: sku="' +
            sku +
            '", item_id_books="' +
            itemIdBooks +
            '", imagem="' +
            imagem +
            '"',
        })
        continue
      }

      const currentFotoId = item.getString('foto_catalogo_id')
      if (currentFotoId === foto.id || processedItems[item.id] === foto.id) {
        duplicados++
        detalhes.push({
          status: 'Duplicado',
          sku: sku,
          item_id_books: itemIdBooks,
          imagem: imagem,
          mensagem: 'Item já associado a esta foto',
        })
        continue
      }

      try {
        item.set('foto_catalogo_id', foto.id)
        $app.save(item)
        processedItems[item.id] = foto.id
        atualizados++
        detalhes.push({
          status: 'Atualizado',
          sku: sku,
          item_id_books: itemIdBooks,
          imagem: imagem,
          mensagem: 'Foto associada com sucesso ao item ' + item.getString('sku'),
        })
      } catch (err) {
        erros++
        detalhes.push({
          status: 'Erro',
          sku: sku,
          item_id_books: itemIdBooks,
          imagem: imagem,
          mensagem: 'Erro ao salvar item: ' + String(err),
        })
      }
    }

    $app
      .logger()
      .info(
        'upload-item-images completed',
        'atualizados',
        atualizados,
        'duplicados',
        duplicados,
        'naoEncontrados',
        naoEncontrados,
        'erros',
        erros,
      )

    return e.json(200, {
      atualizados: atualizados,
      duplicados: duplicados,
      naoEncontrados: naoEncontrados,
      erros: erros,
      total: rows.length,
      detalhes: detalhes,
    })
  },
  $apis.requireAuth(),
)
