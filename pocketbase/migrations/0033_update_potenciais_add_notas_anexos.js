migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('potenciais')

    col.fields.add(
      new TextField({
        name: 'notas',
      }),
    )

    col.fields.add(
      new FileField({
        name: 'anexos',
        maxSelect: 10,
        maxSize: 5242880, // 5MB
        mimeTypes: [],
      }),
    )

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('potenciais')
    col.fields.removeByName('notas')
    col.fields.removeByName('anexos')
    app.save(col)
  },
)
