onRecordUpdate((e) => {
  try {
    const fields = [
      'descricao_base_id',
      'descricao_base_pt',
      'tamanho',
      'acabamento_id',
      'material',
      'classe',
      'norma',
      'tipo_rosca',
      'comprimento_rosca',
    ]
    const hasChanges = fields.some(
      (f) => e.record.getString(f) !== e.record.original().getString(f),
    )

    if (!hasChanges && e.record.getString('descricao_curta')) {
      return e.next()
    }

    const descBaseId = e.record.getString('descricao_base_id')
    let descBaseNome = e.record.getString('descricao_base_pt')
    if (descBaseId) {
      try {
        const d = $app.findRecordById('descricoes_base', descBaseId)
        descBaseNome = d.getString('nome_pt')
      } catch (_) {}
    }

    const acabamentoId = e.record.getString('acabamento_id')
    let acabamentoNome = ''
    if (acabamentoId) {
      try {
        const a = $app.findRecordById('acabamentos', acabamentoId)
        acabamentoNome = a.getString('nome_pt')
      } catch (_) {}
    }

    const tamanho = e.record.getString('tamanho')
    const material = e.record.getString('material')
    const classe = e.record.getString('classe')
    const norma = e.record.getString('norma')
    const tipoRosca = e.record.getString('tipo_rosca')
    const comprimentoRosca = e.record.getString('comprimento_rosca')

    const inputData = {
      'Base Description': descBaseNome,
      Norm: norma,
      Size: tamanho,
      'Thread Type': tipoRosca,
      'Thread Length': comprimentoRosca,
      'Material/Class': material || classe ? `${material} ${classe}`.trim() : '',
      Finish: acabamentoNome,
    }

    const prompt = `You are a technical assistant for an industrial/commercial catalog.
Given the following attributes, generate a concise, professional "Short Description" in Portuguese (PT-BR).
Formatting standard: [Base Description] [Norm] [Size] [Thread Type] [Material/Class] [Finish].
Ignore any attributes that are empty or not provided.
Return ONLY the generated string, without quotes or extra comments.`

    const res = $ai.chat({
      model: 'fast',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(inputData) },
      ],
    })

    const desc = res.choices[0].message.content.trim()
    if (desc) {
      e.record.set('descricao_curta', desc)
      e.record.set('descr_pt', desc)
    }
  } catch (err) {
    $app.logger().error('Failed to generate descricao_curta', 'error', err.message)
  }
  e.next()
}, 'itens')
