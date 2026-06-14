migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    col.addIndex('idx_itens_descricao_curta', false, 'descricao_curta', '')
    col.addIndex('idx_itens_tamanho', false, 'tamanho', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    col.removeIndex('idx_itens_descricao_curta')
    col.removeIndex('idx_itens_tamanho')
    app.save(col)
  },
)
