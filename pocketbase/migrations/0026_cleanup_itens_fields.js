migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    const fieldsToRemove = ['voltagem', 'potencia', 'marca', 'espessura', 'dimensao', 'tipo_vidro']
    let updated = false
    for (const f of fieldsToRemove) {
      if (col.fields.getByName(f)) {
        col.fields.removeByName(f)
        updated = true
      }
    }
    if (updated) {
      app.save(col)
    }
  },
  (app) => {
    // Irreversible without knowing field types and constraints
  },
)
