onRecordCreate((e) => {
  function translateField(text) {
    if (!text) return ''
    try {
      const prompt =
        'You are a technical translator. Translate the following text from Portuguese to English. Return ONLY the translated text, without quotes. Do not append (EN). Technical fasteners context. IMPORTANT: Do not translate technical grades or codes (e.g., "Gr8" must remain "Gr8", not "great").'
      const res = $ai.chat({
        model: 'fast',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: text },
        ],
      })
      return res.choices[0].message.content.trim()
    } catch (err) {
      $app.logger().error('Translation failed', 'error', err.message)
      return ''
    }
  }

  // 1. Translate EN fields if empty
  if (!e.record.getString('classe_material_en')) {
    e.record.set('classe_material_en', translateField(e.record.getString('classe_material')))
  }
  if (!e.record.getString('tipo_rosca_en')) {
    e.record.set('tipo_rosca_en', translateField(e.record.getString('tipo_rosca')))
  }
  if (!e.record.getString('comprimento_rosca_en')) {
    e.record.set('comprimento_rosca_en', translateField(e.record.getString('comprimento_rosca')))
  }
  if (!e.record.getString('informacao_extra_en')) {
    e.record.set('informacao_extra_en', translateField(e.record.getString('informacao_extra')))
  }
  if (!e.record.getString('descricao_extra_en')) {
    e.record.set('descricao_extra_en', translateField(e.record.getString('descricao_extra')))
  }

  // 2. Fetch base descriptions
  let descBasePt = e.record.getString('descricao_base_pt') || ''
  let descBaseEn = e.record.getString('descricao_base_en') || ''
  const descBaseId = e.record.getString('descricao_base_id')

  if (descBaseId) {
    try {
      const d = $app.findRecordById('descricoes_base', descBaseId)
      descBasePt = d.getString('nome_pt') || descBasePt
      descBaseEn = d.getString('nome_en') || descBaseEn
    } catch (_) {}
  }

  // 3. Concatenate PT Short Description
  const ptParts = [
    descBasePt,
    e.record.getString('norma'),
    e.record.getString('classe_material'),
    e.record.getString('tipo_rosca'),
    e.record.getString('comprimento_rosca'),
    e.record.getString('informacao_extra'),
  ].filter(Boolean)

  e.record.set('descricao_curta', ptParts.join(' ').replace(/\s+/g, ' ').trim())

  // 4. Concatenate EN Short Description
  const enParts = [
    descBaseEn,
    e.record.getString('norma'),
    e.record.getString('classe_material_en'),
    e.record.getString('tipo_rosca_en'),
    e.record.getString('comprimento_rosca_en'),
    e.record.getString('informacao_extra_en'),
  ].filter(Boolean)

  e.record.set('descricao_curta_en', enParts.join(' ').replace(/\s+/g, ' ').trim())

  return e.next()
}, 'itens')
