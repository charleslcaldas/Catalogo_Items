migrate(
  (app) => {
    const statusCol = new Collection({
      name: 'status_potencial',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'cor_hex', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(statusCol)

    const defaultStatuses = [
      { nome: 'Sem Itens', cor_hex: '#94a3b8' },
      { nome: 'rascunho', cor_hex: '#f59e0b' },
      { nome: 'Incompleto', cor_hex: '#f59e0b' },
      { nome: 'Completo', cor_hex: '#10b981' },
      { nome: 'Aguardando Cotação Fornecedor', cor_hex: '#3b82f6' },
      { nome: 'Cotação Recebida', cor_hex: '#a855f7' },
      { nome: 'Negociação', cor_hex: '#f97316' },
      { nome: 'Fechado Ganho', cor_hex: '#22c55e' },
      { nome: 'Fechado Perdido', cor_hex: '#ef4444' },
    ]

    for (const s of defaultStatuses) {
      const record = new Record(statusCol)
      record.set('nome', s.nome)
      record.set('cor_hex', s.cor_hex)
      app.save(record)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('status_potencial')
      app.delete(col)
    } catch (_) {}
  },
)
