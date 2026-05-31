migrate((app) => {
  const col = app.findCollectionByNameOrId('potencial_itens')
  if (!col.fields.getByName('ordem')) {
    col.fields.add(new NumberField({ name: 'ordem' }))
  }
  app.save(col)
})
