routerAdd(
  'POST',
  '/backend/v1/translate',
  (e) => {
    const body = e.requestInfo().body || {}
    const text = body.text
    if (!text) return e.json(200, { text: '' })

    let translated = ''
    try {
      const res = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional technical translator. Translate the following text from Portuguese to English. Provide a true semantic translation. Return ONLY the translated text, without quotes or additional comments. NEVER simply append "(EN)" to the text. Do not return the original text if you cannot translate it. Context: Technical descriptions for industrial/commercial items (e.g. screws, fasteners, tools).',
          },
          { role: 'user', content: text },
        ],
      })
      translated = res.choices[0].message.content.trim()
    } catch (err) {
      $app.logger().error('Translation failed', 'error', err.message)
      return e.badRequestError('Translation failed')
    }

    if (!translated || translated.trim().toLowerCase() === text.trim().toLowerCase()) {
      return e.badRequestError('Translation resulted in empty or identical text')
    }

    return e.json(200, { text: translated.trim() })
  },
  $apis.requireAuth(),
)
