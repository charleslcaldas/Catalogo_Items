/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Remove duplicates — keep the oldest record per nome_pt
    app
      .db()
      .newQuery(`
    DELETE FROM descricoes_base WHERE id NOT IN (
      SELECT MIN(id) FROM descricoes_base GROUP BY nome_pt
    ) AND nome_pt IS NOT NULL
  `)
      .execute()

    // 2. Add the unique index
    const col = app.findCollectionByNameOrId('descricoes_base')
    col.addIndex('idx_descricoes_base_nome_pt', true, 'nome_pt', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('descricoes_base')
    col.removeIndex('idx_descricoes_base_nome_pt')
    app.save(col)
  },
)
