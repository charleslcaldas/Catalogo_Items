// Migration 0066 — margem negociada autorizada por item de cotação.
//
// ADITIVA e IDEMPOTENTE: apenas ADICIONA campos a cotacoes_itens —
//   - margem_negociada (number, opcional): margem negociada autorizada (%), fonte
//     EXCLUSIVA da venda na confirmação de compra. Ausente/vazio = pendência
//     explícita no serviço — nunca fallback (margem_padrao da linha, nunca 7,5).
//   - margem_versao (number, opcional): versão para concorrência otimista da
//     edição autorizada da margem. Vazio/0 = nunca editada. Incrementada (+1)
//     dentro da transação quando a confirmação consome a margem.
//   - precisao_negociada (number, opcional): casas decimais (2 ou 3) autorizadas
//     para o arredondamento da venda deste item. Ausente = pendência explícita
//     (precisao_invalida/precisao_ausente), sem default silencioso.
//
// SEM backfill de dados (nenhuma linha é atualizada), SEM apagar colunas e SEM
// tocar nas API rules da coleção (list/view/create/update/delete permanecem
// exatamente como estão). `precisao_preco` já existe em itens (outro registro) —
// campo equivalente NÃO é duplicado com nome diferente aqui; esta precisão é
// da margem negociada do item de cotação.
//
// Rodar sobre cópia descartável ou aguardar ordem: NÃO aplicada aos backends
// reais nesta rodada (subida via commit apenas; nenhuma ordem de aplicar).

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('cotacoes_itens')

    if (!col.fields.getByName('margem_negociada')) {
      col.fields.add(
        new NumberField({ name: 'margem_negociada', onlyInt: false, min: 0, max: 100 }),
      )
    }
    if (!col.fields.getByName('margem_versao')) {
      col.fields.add(new NumberField({ name: 'margem_versao', onlyInt: true }))
    }
    if (!col.fields.getByName('precisao_negociada')) {
      col.fields.add(new NumberField({ name: 'precisao_negociada', onlyInt: true, min: 0, max: 3 }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('cotacoes_itens')

    const mm = col.fields.getByName('margem_negociada')
    if (mm) {
      col.fields.removeByName('margem_negociada')
    }
    const mv = col.fields.getByName('margem_versao')
    if (mv) {
      col.fields.removeByName('margem_versao')
    }
    const pn = col.fields.getByName('precisao_negociada')
    if (pn) {
      col.fields.removeByName('precisao_negociada')
    }

    app.save(col)
  },
)
