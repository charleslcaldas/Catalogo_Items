migrate(
  (app) => {
    // 1. Create the new collection
    const estagios = new Collection({
      name: 'estagios_potencial',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'cor_hex', type: 'text', required: false },
        { name: 'ordem', type: 'number', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(estagios)

    // 2. Add relation field to potenciais
    const potenciais = app.findCollectionByNameOrId('potenciais')
    potenciais.fields.add(
      new RelationField({
        name: 'estagio_id',
        collectionId: estagios.id,
        maxSelect: 1,
        cascadeDelete: false,
      }),
    )
    app.save(potenciais)

    // 3. Migrate unique existing stages
    app
      .db()
      .newQuery(`
    INSERT INTO estagios_potencial (id, nome, cor_hex, ordem, created, updated)
    SELECT
      lower(hex(randomblob(7))) || 'a' as id,
      estagio as nome,
      '#94a3b8' as cor_hex,
      0 as ordem,
      datetime('now') as created,
      datetime('now') as updated
    FROM potenciais
    WHERE estagio IS NOT NULL AND estagio != ''
    GROUP BY estagio
  `)
      .execute()

    // 4. Update the relation references
    app
      .db()
      .newQuery(`
    UPDATE potenciais
    SET estagio_id = (
      SELECT id FROM estagios_potencial WHERE estagios_potencial.nome = potenciais.estagio LIMIT 1
    )
    WHERE estagio IS NOT NULL AND estagio != ''
  `)
      .execute()

    // 5. Replace indexes and drop old text field
    potenciais.removeIndex('idx_potenciais_estagio')
    potenciais.addIndex('idx_potenciais_estagio_id', false, 'estagio_id', '')

    potenciais.fields.removeByName('estagio')
    app.save(potenciais)
  },
  (app) => {
    const potenciais = app.findCollectionByNameOrId('potenciais')
    potenciais.fields.add(new TextField({ name: 'estagio' }))
    app.save(potenciais)

    app
      .db()
      .newQuery(`
    UPDATE potenciais
    SET estagio = (
      SELECT nome FROM estagios_potencial WHERE estagios_potencial.id = potenciais.estagio_id LIMIT 1
    )
    WHERE estagio_id IS NOT NULL AND estagio_id != ''
  `)
      .execute()

    potenciais.removeIndex('idx_potenciais_estagio_id')
    potenciais.addIndex('idx_potenciais_estagio', false, 'estagio', '')

    potenciais.fields.removeByName('estagio_id')
    app.save(potenciais)

    const estagios = app.findCollectionByNameOrId('estagios_potencial')
    app.delete(estagios)
  },
)
