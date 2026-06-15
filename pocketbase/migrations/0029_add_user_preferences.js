/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('preferencias_ui')) {
      users.fields.add(
        new JSONField({
          name: 'preferencias_ui',
          required: false,
        }),
      )
      app.save(users)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (users.fields.getByName('preferencias_ui')) {
      users.fields.removeByName('preferencias_ui')
      app.save(users)
    }
  },
)
