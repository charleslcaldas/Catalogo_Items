migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('itens')

    col.fields.add(new TextField({ name: 'descricao_base_pt' }))
    col.fields.add(new TextField({ name: 'descricao_base_en' }))
    col.fields.add(new TextField({ name: 'classe_material' }))
    col.fields.add(new TextField({ name: 'tipo_rosca' }))
    col.fields.add(new TextField({ name: 'comprimento_rosca' }))
    col.fields.add(new TextField({ name: 'informacao_extra' }))
    col.fields.add(new TextField({ name: 'descricao_extra' }))

    col.fields.add(new TextField({ name: 'tipo' }))
    col.fields.add(new TextField({ name: 'subtipo' }))

    col.fields.add(new TextField({ name: 'voltagem' }))
    col.fields.add(new TextField({ name: 'potencia' }))
    col.fields.add(new TextField({ name: 'marca' }))

    col.fields.add(new TextField({ name: 'espessura' }))
    col.fields.add(new TextField({ name: 'dimensao' }))
    col.fields.add(new TextField({ name: 'tipo_vidro' }))

    col.fields.add(
      new FileField({
        name: 'foto_arquivo',
        maxSelect: 1,
        maxSize: 5242880,
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'],
      }),
    )

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('itens')

    const fieldsToRemove = [
      'descricao_base_pt',
      'descricao_base_en',
      'classe_material',
      'tipo_rosca',
      'comprimento_rosca',
      'informacao_extra',
      'descricao_extra',
      'tipo',
      'subtipo',
      'voltagem',
      'potencia',
      'marca',
      'espessura',
      'dimensao',
      'tipo_vidro',
      'foto_arquivo',
    ]

    for (const f of fieldsToRemove) {
      col.fields.removeByName(f)
    }

    app.save(col)
  },
)
