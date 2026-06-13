migrate(
  (app) => {
    const itens = app.findCollectionByNameOrId('itens')

    // Remove unused fields
    const fieldsToRemove = ['voltagem', 'potencia', 'marca', 'espessura', 'dimensao', 'tipo_vidro']
    for (const f of fieldsToRemove) {
      itens.fields.removeByName(f)
    }

    // Ensure descr_pt and descr_en are optional
    const descrPt = itens.fields.getByName('descr_pt')
    if (descrPt) descrPt.required = false

    const descrEn = itens.fields.getByName('descr_en')
    if (descrEn) descrEn.required = false

    // Add classe_material_en and tipo_rosca_en
    if (!itens.fields.getByName('classe_material_en')) {
      itens.fields.add(new TextField({ name: 'classe_material_en', required: false }))
    }
    if (!itens.fields.getByName('tipo_rosca_en')) {
      itens.fields.add(new TextField({ name: 'tipo_rosca_en', required: false }))
    }

    app.save(itens)
  },
  (app) => {
    const itens = app.findCollectionByNameOrId('itens')

    // Down migration restores fields as text (optional)
    const fieldsToRestore = ['voltagem', 'potencia', 'marca', 'espessura', 'dimensao', 'tipo_vidro']
    for (const f of fieldsToRestore) {
      if (!itens.fields.getByName(f)) {
        itens.fields.add(new TextField({ name: f, required: false }))
      }
    }

    itens.fields.removeByName('classe_material_en')
    itens.fields.removeByName('tipo_rosca_en')

    app.save(itens)
  },
)
