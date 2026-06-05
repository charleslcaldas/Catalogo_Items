migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atributos_linha')

    const f1 = col.fields.getByName('tipo_atributo')
    if (f1) f1.required = false

    const f2 = col.fields.getByName('nome_campo_customizado')
    if (f2) f2.required = false

    if (!col.fields.getByName('campo_sistema')) {
      col.fields.add(new TextField({ name: 'campo_sistema', required: true }))
    }
    if (!col.fields.getByName('nome_customizado')) {
      col.fields.add(new TextField({ name: 'nome_customizado' }))
    }
    if (!col.fields.getByName('ativo')) {
      col.fields.add(new BoolField({ name: 'ativo' }))
    }

    app.save(col)

    const linhas = app.findRecordsByFilter('linhas', '1=1', '', 1000, 0)
    const defaultFields = ['tamanho', 'tipo_rosca', 'comprimento_rosca', 'classe_material', 'norma']

    for (const linha of linhas) {
      for (const field of defaultFields) {
        try {
          app.findFirstRecordByFilter(
            'atributos_linha',
            `linha_id='${linha.id}' && (campo_sistema='${field}' || tipo_atributo='${field}')`,
          )
        } catch (_) {
          const record = new Record(col)
          record.set('linha_id', linha.id)
          record.set('campo_sistema', field)
          record.set('tipo_atributo', field)
          record.set('nome_campo_customizado', '-')
          record.set('nome_customizado', '')
          record.set('ativo', true)
          app.save(record)
        }
      }
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('atributos_linha')
    col.fields.removeByName('campo_sistema')
    col.fields.removeByName('nome_customizado')
    col.fields.removeByName('ativo')
    app.save(col)
  },
)
