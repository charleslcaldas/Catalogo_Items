migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('potenciais')

    col.fields.add(new TextField({ name: 'nome_potencial', required: false }))
    col.fields.add(new TextField({ name: 'proprietario', required: false }))
    col.fields.add(new TextField({ name: 'estagio', required: false }))

    col.addIndex('idx_potenciais_nome', false, 'nome_potencial', '')
    col.addIndex('idx_potenciais_proprietario', false, 'proprietario', '')
    col.addIndex('idx_potenciais_estagio', false, 'estagio', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('potenciais')

    col.fields.removeByName('nome_potencial')
    col.fields.removeByName('proprietario')
    col.fields.removeByName('estagio')

    col.removeIndex('idx_potenciais_nome')
    col.removeIndex('idx_potenciais_proprietario')
    col.removeIndex('idx_potenciais_estagio')

    app.save(col)
  },
)
