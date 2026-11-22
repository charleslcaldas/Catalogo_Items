// v3 da cotação (aprovada por Charles): Situação da Cotação — Compras separada do
// Estágio Zoho (somente leitura), campos Zoho (lado Skip), precisão decimal por item,
// campos extras de item e dados da oferta selecionada por fabricante.
// Idempotente: só adiciona o que ainda não existe. NÃO refaz a 0062 (mei_quote_nonces_v1)
// nem recalcula dados históricos.

const SITUACOES = [
  'Aguardando especificações',
  'Aguardando cotação dos fabricantes',
  'Cotações recebidas',
  'Em negociação',
  'Em formação de preço',
  'Cotação concluída',
  'Cancelada',
]

migrate(
  (app) => {
    // ---------- potenciais ----------
    const potenciais = app.findCollectionByNameOrId('potenciais')

    if (!potenciais.fields.getByName('situacao_cotacao')) {
      potenciais.fields.add(
        new SelectField({
          name: 'situacao_cotacao',
          maxSelect: 1,
          values: SITUACOES,
        }),
      )
    }

    if (!potenciais.fields.getByName('compras_concluida_em')) {
      potenciais.fields.add(
        new AutodateField({ name: 'compras_concluida_em', onCreate: false, onUpdate: true }),
      )
    }
    if (!potenciais.fields.getByName('compras_concluida_por')) {
      potenciais.fields.add(
        new RelationField({
          name: 'compras_concluida_por',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        }),
      )
    }
    if (!potenciais.fields.getByName('cotacao_versao')) {
      potenciais.fields.add(new NumberField({ name: 'cotacao_versao', onlyInt: true, min: 0 }))
    }

    // Integração Zoho (lado Skip; leitura — sem chamadas ativas nesta entrega)
    if (!potenciais.fields.getByName('zoho_potencial_id')) {
      potenciais.fields.add(new TextField({ name: 'zoho_potencial_id', max: 64 }))
    }
    if (!potenciais.fields.getByName('zoho_link')) {
      potenciais.fields.add(new URLField({ name: 'zoho_link' }))
    }
    if (!potenciais.fields.getByName('zoho_origem')) {
      // "Zoho" | "manual" — texto para tolerância de valores legados
      potenciais.fields.add(new TextField({ name: 'zoho_origem', max: 16 }))
    }
    if (!potenciais.fields.getByName('zoho_last_sync_at')) {
      potenciais.fields.add(
        new AutodateField({ name: 'zoho_last_sync_at', onCreate: false, onUpdate: true }),
      )
    }
    if (!potenciais.fields.getByName('zoho_last_sync_status')) {
      potenciais.fields.add(new TextField({ name: 'zoho_last_sync_status', max: 40 }))
    }
    if (!potenciais.fields.getByName('zoho_last_sync_error')) {
      potenciais.fields.add(new TextField({ name: 'zoho_last_sync_error', max: 500 }))
    }

    // Índice único em zoho_potencial_id (idempotência da integração Zoho)
    const idxZoho =
      "CREATE UNIQUE INDEX `idx_potenciais_zoho_id` ON `potenciais` (`zoho_potencial_id`) WHERE `zoho_potencial_id` != ''"
    const temIdxZoho = (potenciais.indexes || []).some((i) => {
      return i.indexOf('idx_potenciais_zoho_id') >= 0
    })
    if (!temIdxZoho) {
      potenciais.indexes.push(idxZoho)
    }

    // ---------- coleção de estado de sincronização Zoho (lado Skip) ----------
    let zohoState = null
    try {
      zohoState = app.findCollectionByNameOrId('zoho_sync_state')
    } catch (e) {
      zohoState = null
    }
    if (!zohoState) {
      const col = new Collection({
        name: 'zoho_sync_state',
        type: 'base',
        fields: [
          {
            name: 'potencial_id',
            type: 'relation',
            required: true,
            collectionId: potenciais.id,
            maxSelect: 1,
          },
          { name: 'estado', type: 'text', max: 40 },
          { name: 'ultima_execucao', type: 'date' },
          { name: 'erro', type: 'text', max: 1000 },
          { name: 'tentativas', type: 'number', onlyInt: true, min: 0 },
          { name: 'proximo_retry_em', type: 'date' },
        ],
        indexes: [],
        listRule: '((@request.auth.id != \'\') && @request.auth.id != "meiqw9s6c4r2t8a")',
        viewRule: '((@request.auth.id != \'\') && @request.auth.id != "meiqw9s6c4r2t8a")',
        createRule: '((@request.auth.id != \'\') && @request.auth.id != "meiqw9s6c4r2t8a")',
        updateRule: '((@request.auth.id != \'\') && @request.auth.id != "meiqw9s6c4r2t8a")',
        deleteRule: '((@request.auth.id != \'\') && @request.auth.id != "meiqw9s6c4r2t8a")',
      })
      app.save(col)
    }

    // ---------- potencial_itens: só campos que NÃO existem ----------
    const pItens = app.findCollectionByNameOrId('potencial_itens')
    const addText = (col, name, max) => {
      if (!col.fields.getByName(name)) col.fields.add(new TextField({ name, max }))
    }
    addText(pItens, 'numero_linha', 20)
    addText(pItens, 'codigo_cliente', 120)
    addText(pItens, 'material_norma', 300)
    addText(pItens, 'especificacao_tecnica', 1000)
    addText(pItens, 'embalagem_solicitada', 300)
    addText(pItens, 'anexos_item_url', 500)
    if (!pItens.fields.getByName('aceita_alternativas')) {
      pItens.fields.add(new BoolField({ name: 'aceita_alternativas' }))
    }
    addText(pItens, 'situacao_item', 40)
    if (!pItens.fields.getByName('precisao_preco')) {
      pItens.fields.add(new NumberField({ name: 'precisao_preco', onlyInt: true, min: 2, max: 3 }))
    }
    addText(pItens, 'moeda_compra', 8)

    // ---------- cotacoes_fornecedor: dados da oferta selecionada ----------
    const cForn = app.findCollectionByNameOrId('cotacoes_fornecedor')
    addText(cForn, 'oferta_selecionada_id', 64)
    addText(cForn, 'oferta_data', 40)
    addText(cForn, 'oferta_moeda', 8)
    addText(cForn, 'oferta_unidade', 20)
    addText(cForn, 'oferta_validade', 40)
    addText(cForn, 'oferta_condicoes', 500)

    app.save(cForn)
    app.save(pItens)
    app.save(potenciais)

    // Backfill apenas de registros vazios (após o save, quando a coluna existe;
    // não sobrescreve situação histórica)
    app
      .db()
      .newQuery(
        "UPDATE potenciais SET situacao_cotacao='Aguardando cotação dos fabricantes' WHERE (situacao_cotacao IS NULL OR situacao_cotacao='')",
      )
      .execute()
  },
  (app) => {
    // Down: remove apenas campos criados aqui (nomes novos, sem risco a dados legados)
    const removeField = (colName, fieldName) => {
      try {
        const col = app.findCollectionByNameOrId(colName)
        if (col.fields.getByName(fieldName)) {
          col.fields.removeByName(fieldName)
          app.save(col)
        }
      } catch (e) {
        // coleção pode não existir em bases novas
      }
    }
    ;[
      'situacao_cotacao',
      'compras_concluida_em',
      'compras_concluida_por',
      'cotacao_versao',
      'zoho_potencial_id',
      'zoho_link',
      'zoho_origem',
      'zoho_last_sync_at',
      'zoho_last_sync_status',
      'zoho_last_sync_error',
    ].forEach((f) => removeField('potenciais', f))
    try {
      const zs = app.findCollectionByNameOrId('zoho_sync_state')
      app.delete(zs)
    } catch (e) {
      // coleção pode não existir
    }
    ;[
      'numero_linha',
      'codigo_cliente',
      'material_norma',
      'especificacao_tecnica',
      'embalagem_solicitada',
      'anexos_item_url',
      'aceita_alternativas',
      'situacao_item',
      'precisao_preco',
      'moeda_compra',
    ].forEach((f) => removeField('potencial_itens', f))
    ;[
      'oferta_selecionada_id',
      'oferta_data',
      'oferta_moeda',
      'oferta_unidade',
      'oferta_validade',
      'oferta_condicoes',
    ].forEach((f) => removeField('cotacoes_fornecedor', f))
  },
)
