onRecordUpdate((e) => {
  const prompt =
    'You are a professional technical translator. Translate the following text from Portuguese to English. Provide a true semantic translation. Return ONLY the translated text, without quotes or additional comments. NEVER simply append "(EN)" to the text. Do not return the original text if you cannot translate it. Context: Technical descriptions for industrial/commercial items (e.g. screws, fasteners, tools).'

  const translateIfChanged = (sourceField, targetField) => {
    const text = e.record.getString(sourceField)
    const origText = e.record.original().getString(sourceField)

    if (text !== origText) {
      if (text) {
        try {
          const textToTranslate = text
            .replace(/Rosca Total/gi, 'Full Thread')
            .replace(/Rosca Parcial/gi, 'Partial Thread')

          const res = $ai.chat({
            model: 'fast',
            messages: [
              { role: 'system', content: prompt },
              { role: 'user', content: textToTranslate },
            ],
          })
          const translated = res.choices[0].message.content.trim()
          if (translated) e.record.set(targetField, translated)
        } catch (err) {
          $app.logger().error(`Translation failed for ${sourceField}`, 'error', err.message)
        }
      } else {
        e.record.set(targetField, '')
      }
    }
  }

  translateIfChanged('informacao_extra', 'informacao_extra_en')
  translateIfChanged('descricao_extra', 'descricao_extra_en')
  translateIfChanged('descricao_curta', 'descricao_curta_en')
  translateIfChanged('comprimento_rosca', 'comprimento_rosca_en')

  return e.next()
}, 'itens')
