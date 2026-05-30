routerAdd(
  'POST',
  '/backend/v1/translate',
  (e) => {
    const body = e.requestInfo().body || {}
    const text = body.text
    if (!text) return e.json(200, { text: '' })

    const url = $secrets.get('SKIP_AI_GATEWAY_URL') || 'https://api.openai.com/v1'
    const key = $secrets.get('SKIP_AI_GATEWAY_API_KEY') || ''

    const res = $http.send({
      url: url + '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional technical translator. Translate the following text from Portuguese to English. Provide a true semantic translation. Return ONLY the translated text, without quotes or additional comments. NEVER simply append "(EN)" to the text. Do not return the original text if you cannot translate it.',
          },
          { role: 'user', content: text },
        ],
      }),
      timeout: 15,
    })

    if (res.statusCode !== 200) {
      $app.logger().error('Translation failed', 'status', res.statusCode)
      return e.badRequestError('Translation failed')
    }

    const data = res.json
    const translated = data?.choices?.[0]?.message?.content || ''

    if (!translated || translated.trim().toLowerCase() === text.trim().toLowerCase()) {
      return e.badRequestError('Translation resulted in empty or identical text')
    }

    return e.json(200, { text: translated.trim() })
  },
  $apis.requireAuth(),
)
