migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Seed/update default Charles admin user
    try {
      const charles = app.findAuthRecordByEmail('_pb_users_auth_', 'charles@c2international.com.br')
      charles.setPassword('Skip@Pass')
      charles.setVerified(true)
      charles.set('name', 'Charles (Admin)')
      app.save(charles)
    } catch (_) {
      const record = new Record(users)
      record.setEmail('charles@c2international.com.br')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Charles (Admin)')
      app.save(record)
    }

    // Seed test team user for demonstration and testing
    try {
      const teamUser = app.findAuthRecordByEmail('_pb_users_auth_', 'equipe@c2international.com.br')
      teamUser.setPassword('Skip@Pass')
      teamUser.setVerified(true)
      teamUser.set('name', 'Equipe C2')
      app.save(teamUser)
    } catch (_) {
      const record = new Record(users)
      record.setEmail('equipe@c2international.com.br')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Equipe C2')
      app.save(record)
    }
  },
  (app) => {
    try {
      const teamUser = app.findAuthRecordByEmail('_pb_users_auth_', 'equipe@c2international.com.br')
      app.delete(teamUser)
    } catch (_) {}
  },
)
