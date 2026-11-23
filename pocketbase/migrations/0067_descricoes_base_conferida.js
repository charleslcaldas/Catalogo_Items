// Migration 0067 — etiqueta de conferência em descricoes_base.
//
// ADITIVA e IDEMPOTENTE: apenas ADICIONA o campo
//   - conferida (bool, opcional): etiqueta de marcação usada na tela
//     /descricoes-base para o usuário ir marcando cada descrição base
//     conforme confere/acerta os itens, um a um. Ausente = não conferida.
//     NUNCA required: bool required no PocketBase só aceita true.
//
// SEM backfill de dados, SEM apagar colunas e SEM tocar nas API rules da
// coleção (list/view/create/update/delete permanecem exatamente como estão).
// Nenhuma coleção ou hook de cotações é tocado.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('descricoes_base')

    if (!col.fields.getByName('conferida')) {
      col.fields.add(new BoolField({ name: 'conferida' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('descricoes_base')

    const f = col.fields.getByName('conferida')
    if (f) {
      col.fields.removeByName('conferida')
    }

    app.save(col)
  },
)
