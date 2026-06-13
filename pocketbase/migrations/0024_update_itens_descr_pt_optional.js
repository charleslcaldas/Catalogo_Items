migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    const field = col.fields.getByName('descr_pt')
    if (field) {
      field.required = false
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    const field = col.fields.getByName('descr_pt')
    if (field) {
      field.required = true
    }
    app.save(col)
  },
)
