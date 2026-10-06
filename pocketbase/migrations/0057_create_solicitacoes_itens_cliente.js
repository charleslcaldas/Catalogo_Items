/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const potenciaisCol = app.findCollectionByNameOrId('potenciais')
    const itensCol = app.findCollectionByNameOrId('itens')

    const collection = new Collection({
      name: 'solicitacoes_itens_cliente',
      type: 'base',
      listRule: '@request.auth.id != "" && @request.auth.collectionName = "users"',
      viewRule: '@request.auth.id != "" && @request.auth.collectionName = "users"',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'potencial_id',
          type: 'relation',
          required: true,
          collectionId: potenciaisCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'descricao_cliente_original',
          type: 'text',
          required: true,
          max: 2000,
        },
        {
          name: 'quantidade',
          type: 'number',
          required: true,
          onlyInt: true,
          min: 1,
        },
        {
          name: 'unidade_medida',
          type: 'text',
          max: 50,
        },
        {
          name: 'item_candidato_id',
          type: 'relation',
          required: true,
          collectionId: itensCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'text',
          max: 50,
        },
        {
          name: 'origem',
          type: 'text',
          max: 200,
        },
        {
          name: 'aprovacao_ref',
          type: 'text',
          max: 200,
        },
        {
          name: 'chave_idempotencia',
          type: 'text',
          required: true,
          max: 200,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_solicitacoes_chave ON solicitacoes_itens_cliente (chave_idempotencia)',
        'CREATE INDEX idx_solicitacoes_potencial ON solicitacoes_itens_cliente (potencial_id)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('solicitacoes_itens_cliente')
    } catch (_) {
      // Collection inexistente, nada a reverter
      return
    }

    const count = app.countRecords('solicitacoes_itens_cliente')
    if (count > 0) {
      throw new Error(
        `Impossivel reverter migration 0057: solicitacoes_itens_cliente possui ${count} registro(s). Dados preservados.`,
      )
    }

    app.delete(col)
  },
)
