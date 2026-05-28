migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    const descBaseId = app.findCollectionByNameOrId('descricoes_base').id
    const unidMedidaId = app.findCollectionByNameOrId('unidades_medida').id

    col.fields.add(
      new RelationField({ name: 'descricao_base_id', collectionId: descBaseId, maxSelect: 1 }),
    )
    col.fields.add(
      new RelationField({ name: 'unidade_id', collectionId: unidMedidaId, maxSelect: 1 }),
    )
    col.fields.add(new NumberField({ name: 'ii' }))
    col.fields.add(new NumberField({ name: 'ipi' }))
    col.fields.add(new NumberField({ name: 'pis' }))
    col.fields.add(new NumberField({ name: 'cofins' }))
    col.fields.add(new TextField({ name: 'comprimento_rosca_en' }))
    app.save(col)

    // Data migration for unidades
    const itens = app.findRecordsByFilter('itens', "unidade != ''", '', 10000, 0)
    const unidades = app.findRecordsByFilter('unidades_medida', '', '', 1000, 0)

    const uMap = {}
    unidades.forEach((u) => {
      uMap[u.getString('nome')] = u.id
    })

    itens.forEach((item) => {
      const uName = item.getString('unidade')
      if (uMap[uName]) {
        item.set('unidade_id', uMap[uName])
        app.saveNoValidate(item)
      }
    })
  },
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    col.fields.removeByName('descricao_base_id')
    col.fields.removeByName('unidade_id')
    col.fields.removeByName('ii')
    col.fields.removeByName('ipi')
    col.fields.removeByName('pis')
    col.fields.removeByName('cofins')
    col.fields.removeByName('comprimento_rosca_en')
    app.save(col)
  },
)
