routerAdd(
  'POST',
  '/backend/v1/upload-item-images',
  (e) => {
    $app.logger().info('[upload-item-images] Request received')

    // --- Step 1: Read uploaded image files (try multiple methods) ---
    let imageFiles = []
    let fileReadError = null

    // Method A: findUploadedFiles (standard PocketBase method)
    try {
      imageFiles = e.findUploadedFiles('images') || []
      $app
        .logger()
        .info('[upload-item-images] findUploadedFiles("images")', 'count', imageFiles.length)
    } catch (err) {
      fileReadError = String((err && err.message) || err)
      $app.logger().error('[upload-item-images] findUploadedFiles threw', 'error', fileReadError)
    }

    // Method B: trigger requestInfo (may parse multipart), then retry
    if (imageFiles.length === 0) {
      try {
        e.requestInfo()
        imageFiles = e.findUploadedFiles('images') || []
        $app
          .logger()
          .info(
            '[upload-item-images] findUploadedFiles after requestInfo',
            'count',
            imageFiles.length,
          )
      } catch (err) {
        $app
          .logger()
          .error('[upload-item-images] requestInfo+findUploadedFiles failed', 'error', String(err))
      }
    }

    // Method C: Access multipartForm.file directly
    if (imageFiles.length === 0) {
      try {
        var mf = e.request.multipartForm
        if (!mf) {
          try {
            mf = e.request.MultipartForm
          } catch (_) {}
        }
        if (mf && mf.file) {
          var allFileKeys = Object.keys(mf.file)
          $app
            .logger()
            .info('[upload-item-images] multipartForm.file keys', 'keys', allFileKeys.join(', '))
          if (mf.file['images']) {
            imageFiles = mf.file['images']
          }
          if (imageFiles.length === 0) {
            for (var ki = 0; ki < allFileKeys.length; ki++) {
              var fk = allFileKeys[ki]
              var ff = mf.file[fk] || []
              for (var fi = 0; fi < ff.length; fi++) {
                imageFiles.push(ff[fi])
              }
            }
          }
        }
      } catch (err) {
        $app
          .logger()
          .error('[upload-item-images] multipartForm direct access failed', 'error', String(err))
      }
    }

    // Method D: Explicitly call ParseMultipartForm then re-read
    if (imageFiles.length === 0) {
      try {
        e.request.ParseMultipartForm(32 * 1024 * 1024)
      } catch (_) {
        try {
          e.request.parseMultipartForm(32 * 1024 * 1024)
        } catch (_) {}
      }
      try {
        var mf2 = e.request.multipartForm
        if (!mf2) {
          try {
            mf2 = e.request.MultipartForm
          } catch (_) {}
        }
        if (mf2 && mf2.file) {
          var keys2 = Object.keys(mf2.file)
          for (var k2 = 0; k2 < keys2.length; k2++) {
            var ff2 = mf2.file[keys2[k2]] || []
            for (var f2 = 0; f2 < ff2.length; f2++) {
              imageFiles.push(ff2[f2])
            }
          }
        }
      } catch (err) {
        $app
          .logger()
          .error('[upload-item-images] ParseMultipartForm+read failed', 'error', String(err))
      }
    }

    // --- Step 2: Build diagnostic info about received files ---
    var receivedBasenames = []
    var multipartFileFields = []
    for (var i = 0; i < imageFiles.length; i++) {
      var fname = ''
      try {
        fname = imageFiles[i].filename || ''
      } catch (_) {
        try {
          fname = imageFiles[i].Filename || ''
        } catch (_) {}
      }
      var base = fname.split('/').pop().split('\\').pop()
      receivedBasenames.push(base)
    }
    // Collect ALL multipart file field names + filenames for diagnostics
    try {
      var mfDiag = e.request.multipartForm
      if (!mfDiag) {
        try {
          mfDiag = e.request.MultipartForm
        } catch (_) {}
      }
      if (mfDiag && mfDiag.file) {
        var dKeys = Object.keys(mfDiag.file)
        for (var di = 0; di < dKeys.length; di++) {
          var dFiles = mfDiag.file[dKeys[di]] || []
          var dNames = []
          for (var dn = 0; dn < dFiles.length; dn++) {
            var dnName = ''
            try {
              dnName = dFiles[dn].filename || ''
            } catch (_) {
              try {
                dnName = dFiles[dn].Filename || ''
              } catch (_) {}
            }
            dNames.push(dnName)
          }
          multipartFileFields.push(dKeys[di] + ': ' + dNames.join(', '))
        }
      }
    } catch (_) {}

    $app
      .logger()
      .info(
        '[upload-item-images] Files resolved',
        'count',
        imageFiles.length,
        'basenames',
        receivedBasenames.join('; '),
        'multipart_fields',
        multipartFileFields.join(' | '),
      )

    // --- Step 3: Read form values (manifest_csv, overwrite) ---
    var manifestCsv = ''
    var overwrite = false
    try {
      var body = e.requestInfo().body || {}
      manifestCsv = body.manifest_csv || ''
      overwrite = body.overwrite === 'true' || body.overwrite === true
    } catch (err) {
      $app.logger().error('[upload-item-images] requestInfo().body failed', 'error', String(err))
    }
    if (!manifestCsv) {
      try {
        manifestCsv = e.request.formValue('manifest_csv') || ''
        overwrite = e.request.formValue('overwrite') === 'true'
      } catch (_) {}
    }
    // Also try reading from multipartForm.value
    if (!manifestCsv) {
      try {
        var mfVal = e.request.multipartForm
        if (!mfVal) {
          try {
            mfVal = e.request.MultipartForm
          } catch (_) {}
        }
        if (mfVal && mfVal.value && mfVal.value['manifest_csv']) {
          manifestCsv = mfVal.value['manifest_csv'][0] || ''
        }
        if (mfVal && mfVal.value && mfVal.value['overwrite']) {
          overwrite = mfVal.value['overwrite'][0] === 'true'
        }
      } catch (_) {}
    }

    // --- Step 4: Validate manifest ---
    if (!manifestCsv) {
      var bodyKeys = []
      try {
        bodyKeys = Object.keys(e.requestInfo().body || {})
      } catch (_) {}
      return e.json(400, {
        error:
          'manifest_csv e obrigatorio. Campos recebidos no body: ' +
          (bodyKeys.length > 0 ? bodyKeys.join(', ') : '(nenhum)') +
          '. Campos de arquivo multipart: ' +
          (multipartFileFields.length > 0 ? multipartFileFields.join('; ') : '(nenhum)'),
        files_received: imageFiles.length,
        received_basenames: receivedBasenames,
        multipart_file_fields: multipartFileFields,
        file_read_error: fileReadError,
      })
    }

    // --- Step 5: Validate files ---
    if (imageFiles.length === 0) {
      var msg = 'Nenhum arquivo de imagem recebido no campo "images". '
      msg += 'Campos de arquivo no multipart: '
      msg += multipartFileFields.length > 0 ? multipartFileFields.join('; ') : '(nenhum)'
      if (fileReadError) msg += '. Erro de leitura: ' + fileReadError
      $app
        .logger()
        .error(
          '[upload-item-images] Zero files',
          'multipart_fields',
          multipartFileFields.join('; '),
        )
      return e.json(400, {
        error: msg,
        files_received: 0,
        multipart_file_fields: multipartFileFields,
        file_read_error: fileReadError,
      })
    }

    // --- Step 6: Strip UTF-8 BOM ---
    if (manifestCsv.charCodeAt(0) === 0xfeff) {
      manifestCsv = manifestCsv.slice(1)
    }

    // --- Step 7: Parse CSV ---
    var rows = []
    var row = []
    var inQuotes = false
    var val = ''
    for (var ci = 0; ci < manifestCsv.length; ci++) {
      var char = manifestCsv[ci]
      var nextChar = manifestCsv[ci + 1]
      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          val += '"'
          ci++
        } else if (char === '"') {
          inQuotes = false
        } else {
          val += char
        }
      } else {
        if (char === '"') {
          inQuotes = true
        } else if (char === ',') {
          row.push(val)
          val = ''
        } else if (char === '\n' || char === '\r') {
          if (char === '\r' && nextChar === '\n') ci++
          row.push(val)
          val = ''
          if (
            row.length > 0 &&
            row.some(function (c) {
              return c.trim() !== ''
            })
          )
            rows.push(row)
          row = []
        } else {
          val += char
        }
      }
    }
    row.push(val)
    if (
      row.length > 0 &&
      row.some(function (c) {
        return c.trim() !== ''
      })
    )
      rows.push(row)

    var parsedData = []
    if (rows.length > 1) {
      var headers = rows[0].map(function (h) {
        return h.trim().toLowerCase()
      })
      for (var pi = 1; pi < rows.length; pi++) {
        var obj = {}
        for (var pj = 0; pj < headers.length; pj++) {
          obj[headers[pj]] = (rows[pi][pj] || '').trim()
        }
        parsedData.push(obj)
      }
    }
    $app.logger().info('[upload-item-images] Parsed CSV rows', 'count', parsedData.length)

    // --- Step 8: Build image map (lowercase basename -> fileHeader) ---
    var imageMap = {}
    for (var ii = 0; ii < imageFiles.length; ii++) {
      var fh = imageFiles[ii]
      var iname = ''
      try {
        iname = fh.filename || ''
      } catch (_) {
        try {
          iname = fh.Filename || ''
        } catch (_) {}
      }
      var baseName = iname.split('/').pop().split('\\').pop()
      if (baseName) imageMap[baseName.toLowerCase()] = fh
    }
    $app
      .logger()
      .info('[upload-item-images] Image map keys', 'keys', Object.keys(imageMap).join('; '))

    // --- Step 9: Process rows ---
    var baseUrl = ($secrets.get('PB_INSTANCE_URL') || '').replace(/\/$/, '')
    var fotoCol = $app.findCollectionByNameOrId('foto_catalogo')
    var atualizados = 0,
      nao_encontrados = 0,
      erros_upload = 0,
      duplicados = 0
    var detalhes = []
    var fotoCatalogoCache = {}

    for (var ri = 0; ri < parsedData.length; ri++) {
      var r = parsedData[ri]
      var sku = r.sku || ''
      var itemIdBooks = r.item_id_books || ''
      var nomeArquivo = r.nome_arquivo_imagem || ''
      var detail = {
        sku: sku,
        item_id_books: itemIdBooks,
        nome_arquivo_imagem: nomeArquivo,
        status: '',
        message: '',
      }

      if (!nomeArquivo || (!sku && !itemIdBooks)) {
        detail.status = 'erro'
        detail.message = 'Campos obrigatorios ausentes (sku/item_id_books e nome_arquivo_imagem).'
        erros_upload++
        detalhes.push(detail)
        continue
      }

      var item = null
      if (itemIdBooks) {
        try {
          item = $app.findFirstRecordByData('itens', 'item_id_books', itemIdBooks)
        } catch (_) {}
      }
      if (!item && sku) {
        try {
          item = $app.findFirstRecordByData('itens', 'sku', sku)
        } catch (_) {}
      }
      if (!item) {
        detail.status = 'nao_encontrado'
        detail.message =
          'Item nao encontrado (item_id_books: ' + itemIdBooks + ', sku: ' + sku + ')'
        nao_encontrados++
        detalhes.push(detail)
        continue
      }

      if (!overwrite) {
        var existingFotoId = item.getString('foto_catalogo_id')
        var existingFotoUrl = item.getString('foto_url')
        if (existingFotoId || existingFotoUrl) {
          detail.status = 'duplicado'
          detail.message = 'Item ja possui imagem associada - foto mantida'
          duplicados++
          detalhes.push(detail)
          continue
        }
      }

      var baseNomeArquivo = nomeArquivo.split('/').pop().split('\\').pop()
      var lookupKey = baseNomeArquivo.toLowerCase()
      var fotoRecord = fotoCatalogoCache[lookupKey] || null

      if (!fotoRecord) {
        try {
          fotoRecord = $app.findFirstRecordByData('foto_catalogo', 'descricao', baseNomeArquivo)
        } catch (_) {}
        if (!fotoRecord) {
          var fh2 = imageMap[lookupKey]
          if (!fh2) {
            detail.status = 'erro'
            detail.message =
              'Arquivo nao encontrado nos uploads: ' +
              baseNomeArquivo +
              ' (disponiveis: ' +
              Object.keys(imageMap).join(', ') +
              ')'
            erros_upload++
            detalhes.push(detail)
            continue
          }
          try {
            var file = $filesystem.fileFromMultipart(fh2)
            fotoRecord = new Record(fotoCol)
            fotoRecord.set('descricao', baseNomeArquivo)
            fotoRecord.set('arquivo', file)
            $app.save(fotoRecord)
            fotoRecord = $app.findRecordById('foto_catalogo', fotoRecord.id)
          } catch (err) {
            detail.status = 'erro'
            detail.message = 'Erro no upload da imagem: ' + String((err && err.message) || err)
            erros_upload++
            detalhes.push(detail)
            continue
          }
        }
        fotoCatalogoCache[lookupKey] = fotoRecord
      }

      try {
        var storedFilename = fotoRecord.getString('arquivo')
        var filePath = fotoRecord.baseFilesPath()
        var fileUrl = baseUrl + '/api/files/' + filePath + '/' + storedFilename
        item.set('foto_catalogo_id', fotoRecord.id)
        item.set('foto_url', fileUrl)
        $app.save(item)
        detail.status = 'atualizado'
        detail.message = 'Imagem associada com sucesso'
        atualizados++
      } catch (err) {
        detail.status = 'erro'
        detail.message = 'Erro ao atualizar item: ' + String((err && err.message) || err)
        erros_upload++
      }
      detalhes.push(detail)
    }

    $app
      .logger()
      .info(
        '[upload-item-images] Completed',
        'atualizados',
        atualizados,
        'duplicados',
        duplicados,
        'nao_encontrados',
        nao_encontrados,
        'erros',
        erros_upload,
      )

    return e.json(200, {
      atualizados: atualizados,
      nao_encontrados: nao_encontrados,
      erros_upload: erros_upload,
      duplicados: duplicados,
      detalhes: detalhes,
      files_received: imageFiles.length,
      received_basenames: receivedBasenames,
    })
  },
  $apis.requireAuth(),
  $apis.bodyLimit(200 * 1024 * 1024),
)
