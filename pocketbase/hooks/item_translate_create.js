onRecordCreate((e) => {
  const infoExtra = e.record.getString('informacao_extra')
  const descExtra = e.record.getString('descricao_extra')

  const prompt =
    'You are a professional technical translator. Translate the following text from Portuguese to English. Provide a true semantic translation. Return ONLY the translated text, without quotes or additional comments. NEVER simply append "(EN)" to the text. Do not return the original text if you cannot translate it. Context: Technical descriptions for industrial/commercial items (e.g. screws, fasteners, tools).'

  if (infoExtra) {
    try {
      const textToTranslate = infoExtra
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
      if (translated) e.record.set('informacao_extra_en', translated)
    } catch (err) {
      $app.logger().error('Translation failed for informacao_extra', 'error', err.message)
    }
  }

  if (descExtra) {
    try {
      const textToTranslate = descExtra
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
      if (translated) e.record.set('descricao_extra_en', translated)
    } catch (err) {
      $app.logger().error('Translation failed for descricao_extra', 'error', err.message)
    }
  }

  e.next()
}, 'itens')
