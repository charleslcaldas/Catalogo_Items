routerAdd(
  'POST',
  '/backend/v1/ai/generate-description',
  (e) => {
    const body = e.requestInfo().body || {}
    const prompt = `You are a technical catalog assistant for hardware and fasteners.
Generate a professional technical and commercial description based on these attributes:
${JSON.stringify(body, null, 2)}

Return ONLY a JSON object with two keys:
"pt": "Description in Portuguese"
"en": "Description in English"

Keep it concise but detailed. Do not include markdown formatting.`

    const reply = $ai.chat({
      model: 'fast',
      messages: [
        { role: 'system', content: 'You output valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    })

    let parsed
    try {
      const text = reply.choices[0].message.content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()
      parsed = JSON.parse(text)
    } catch (err) {
      return e.badRequestError(
        'AI generation failed to return JSON. ' + reply.choices[0].message.content,
      )
    }
    return e.json(200, parsed)
  },
  $apis.requireAuth(),
)
