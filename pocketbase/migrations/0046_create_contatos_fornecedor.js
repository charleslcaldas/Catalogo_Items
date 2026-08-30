/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const fornecedores = app.findCollectionByNameOrId('fornecedores')

    const contatos = new Collection({
      name: 'contatos_fornecedor',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'fabricante_id',
          type: 'relation',
          required: true,
          collectionId: fornecedores.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'sobrenome', type: 'text' },
        { name: 'cargo', type: 'text' },
        { name: 'telefone', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'whatsapp', type: 'text' },
        { name: 'wechat', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_contatos_fabricante ON contatos_fornecedor (fabricante_id)',
        'CREATE INDEX idx_contatos_nome ON contatos_fornecedor (nome)',
      ],
    })
    app.save(contatos)

    // Opcional: Migrar dados de contato legados de fornecedores existentes se houver
    try {
      const existingFornecedores = app.findRecordsByFilter('fornecedores', '', 'nome', 100, 0)
      for (const f of existingFornecedores) {
        const legacyContato = f.getString('contato')
        const legacyEmail = f.getString('email')
        if (legacyContato && legacyContato.trim()) {
          const parts = legacyContato.trim().split(' ')
          const nome = parts[0]
          const sobrenome = parts.slice(1).join(' ')
          const rec = new Record(contatos)
          rec.set('fabricante_id', f.id)
          rec.set('nome', nome)
          rec.set('sobrenome', sobrenome)
          rec.set('cargo', 'Geral')
          if (legacyEmail) rec.set('email', legacyEmail)
          rec.set('ativo', true)
          app.save(rec)
        }
      }
    } catch (e) {
      console.log('Aviso ao migrar contatos legados: ' + e)
    }
  },
  (app) => {
    try {
      const contatos = app.findCollectionByNameOrId('contatos_fornecedor')
      app.delete(contatos)
    } catch (_) {}
  },
)
