// Candidate number only. Check live migration ledger again before installation.
// v3 da cotação: Situação da Cotação (Compras) separada do Estágio Zoho, campos Zoho,
// precisão decimal por preço unitário, condições de venda, item extra e sync state.
// Idempotente: só altera o que ainda não existe (não recalcula dados históricos).

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
        new TextField({
          name: 'situacao_cotacao',
          max: 100,
          presentable: false,
        }),
      )
    }
    // Backfill apenas de registros vazios (não converte status históricos indiscriminadamente)
    app
      .db()
      .newQuery(
        "UPDATE potenciais SET situacao_cotacao='Aguardando cotação dos fabricantes' WHERE (situacao_cotacao IS NULL OR situacao_cotacao='')",
      )
      .execute()

    if (!potenciais.fields.getByName('situacao_cotacao_manual')) {
      potenciais.fields.add(new BoolField({ name: 'situacao_cotacao_manual' }))
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

    // Integração Zoho (lado Skip; sem chamadas ativas)
    if (!potenciais.fields.getByName('zoho_deal_id')) {
      potenciais.fields.add(new TextField({ name: 'zoho_deal_id', max: 64 }))
    }
    if (!potenciais.fields.getByName('zoho_stage')) {
      potenciais.fields.add(new TextField({ name: 'zoho_stage', max: 120 }))
    }
    if (!potenciais.fields.getByName('zoho_url')) {
      potenciais.fields.add(new UrlField({ name: 'zoho_url' }))
    }
    if (!potenciais.fields.getByName('zoho_origem')) {
      // select zoho|manual — criado como texto para idempotência e tolerância de valores
      potenciais.fields.add(new TextField({ name: 'zoho_origem', max: 16 }))
    }
    if (!potenciais.fields.getByName('zoho_contact_name')) {
      potenciais.fields.add(new TextField({ name: 'zoho_contact_name', max: 200 }))
    }
    if (!potenciais.fields.getByName('zoho_owner_name')) {
      potenciais.fields.add(new TextField({ name: 'zoho_owner_name', max: 200 }))
    }
    if (!potenciais.fields.getByName('zoho_buyer_name')) {
      potenciais.fields.add(new TextField({ name: 'zoho_buyer_name', max: 200 }))
    }
    if (!potenciais.fields.getByName('zoho_closing_date')) {
      potenciais.fields.add(new DateField({ name: 'zoho_closing_date' }))
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

    // ---------- potencial_itens (adiciona SE AUSENTES) ----------
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
      const f = new NumberField({ name: 'precisao_preco', onlyInt: true, min: 0, max: 3 })
      f.min = 0
      f.max = 3
      pItens.fields.add(f)
    }
    if (!pItens.fields.getByName('moeda_compra')) {
      addText(pItens, 'moeda_compra', 8)
    }

    // ---------- cotacoes_fornecedor: oferta selecionada, validade e condições ----------
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
  },
  (app) => {
    // Down: remove apenas campos criados aqui (nomes novos, sem risco a dados legados)
    const removeField = (colName, fieldName) => {
      try {
        const col = app.findCollectionByNameOrId(colName)
        const f = col.fields.getByName(fieldName)
        if (f) col.fields.removeByName(fieldName)
        app.save(col)
      } catch (e) {
        // coleção pode não existir em bases novas
      }
    }
    const potenciais = [
      'situacao_cotacao',
      'situacao_cotacao_manual',
      'compras_concluida_em',
      'compras_concluida_por',
      'cotacao_versao',
      'zoho_deal_id',
      'zoho_stage',
      'zoho_url',
      'zoho_origem',
      'zoho_contact_name',
      'zoho_owner_name',
      'zoho_buyer_name',
      'zoho_closing_date',
      'zoho_last_sync_at',
      'zoho_last_sync_status',
      'zoho_last_sync_error',
    ]
    potenciais.forEach((f) => removeField('potenciais', f))
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

    app.db().newQuery('DROP TABLE IF EXISTS zoho_sync_log').execute()
    app.db().newQuery('DROP TABLE IF EXISTS cotacao_historico_versoes').execute()
  },
)
