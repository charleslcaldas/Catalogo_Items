migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Equipe C2 International a ser provisionada com upsert idempotente
    const teamMembers = [
      {
        email: 'luana@c2international.com.br',
        name: 'Luana Caldas',
        password: 'Skip@Pass',
      },
      {
        email: 'comercial1@c2international.com.br',
        name: 'Jaqueline Vicente',
        password: 'Skip@Pass',
      },
      {
        email: 'purchaser@c2international.com.br',
        name: 'Liu',
        password: 'Skip@Pass',
      },
    ]

    for (const member of teamMembers) {
      try {
        const existing = app.findAuthRecordByEmail('_pb_users_auth_', member.email)
        // Se já existir, atualiza nome e assegura senha/verificação sem duplicar
        existing.setName ? existing.setName(member.name) : existing.set('name', member.name)
        existing.setPassword(member.password)
        existing.setVerified(true)
        app.save(existing)
      } catch (_) {
        // Se não existir, cria o novo usuário auth
        const record = new Record(users)
        record.setEmail(member.email)
        record.setPassword(member.password)
        record.setVerified(true)
        record.set('name', member.name)
        app.save(record)
      }
    }
  },
  (app) => {
    const rollbackEmails = [
      'luana@c2international.com.br',
      'comercial1@c2international.com.br',
      'purchaser@c2international.com.br',
    ]

    for (const email of rollbackEmails) {
      try {
        const user = app.findAuthRecordByEmail('_pb_users_auth_', email)
        app.delete(user)
      } catch (_) {}
    }
  },
)
