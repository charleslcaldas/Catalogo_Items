// ETAPA ADITIVA — preparação do serviço de confirmação de compra (aprovado por Charles).
// 1. cotacoes_rodadas.cotacao_iten deixa de ser cascade (histórico de negociação
//    NÃO pode sumir quando a oferta/cotacoes_itens for removida) e ganha campo
//    redundante de texto cotacao_iten_ref (id legível mesmo sem relação).
// 2. valor 'selecao' adicionado ao select `tipo` (registro de confirmação de compra).
// 3. coleção c2_idempotency_keys — chaves de idempotência durável do endpoint
//    POST /backend/v1/cotacoes/confirmar-compra. Nascem vazias, sem backfill.
// Nada é apagado, nenhuma regra de API é ampliada, nenhum dado legado é tocado.
// 0064 permanece intacta; down desfaz somente o que esta migration criou.

migrate(
  (app) => {
    // ---------- 1. cascade → sem cascade em cotacoes_rodadas.cotacao_iten ----------
    const rodadas = app.findCollectionByNameOrId('cotacoes_rodadas')
    const rel = rodadas.fields.getByName('cotacao_iten')
    let mudouRodadas = false

    if (rel && rel.cascadeDelete) {
      rel.cascadeDelete = false
      mudouRodadas = true
    }

    // campo redundante de texto com o id da oferta (histórico legível sem join)
    if (!rodadas.fields.getByName('cotacao_iten_ref')) {
      rodadas.fields.add(new TextField({ name: 'cotacao_iten_ref', max: 20 }))
      mudouRodadas = true
    }

    if (mudouRodadas) {
      app.save(rodadas)
    }

    // backfill do campo redundante com o id já existente na relação (idempotente)
    app
      .db()
      .newQuery(
        "UPDATE cotacoes_rodadas SET cotacao_iten_ref = cotacao_iten WHERE (cotacao_iten_ref IS NULL OR cotacao_iten_ref = '') AND cotacao_iten IS NOT NULL AND cotacao_iten != ''",
      )
      .execute()

    // ---------- 2. valor 'selecao' no select tipo ----------
    const rodadas2 = app.findCollectionByNameOrId('cotacoes_rodadas')
    const tipoField = rodadas2.fields.getByName('tipo')
    if (tipoField && tipoField.values && tipoField.values.indexOf('selecao') === -1) {
      tipoField.values.push('selecao')
      app.save(rodadas2)
    }

    // ---------- 3. coleção de chaves de idempotência ----------
    let idemp = null
    try {
      idemp = app.findCollectionByNameOrId('c2_idempotency_keys')
    } catch (e) {
      idemp = null
    }

    if (!idemp) {
      const RULE = '((@request.auth.id != \'\') && @request.auth.id != "meiqw9s6c4r2t8a")'

      idemp = new Collection({
        name: 'c2_idempotency_keys',
        type: 'base',
        // Mesma regra das coleções vizinhas de cotação (autenticados, exceto Mei).
        // A coleção é preenchida apenas pelo hook server-side; nada ampliado.
        listRule: RULE,
        viewRule: RULE,
        createRule: RULE,
        updateRule: RULE,
        deleteRule: RULE,
        fields: [
          { name: 'chave', type: 'text', required: true, max: 200 },
          { name: 'escopo', type: 'text', required: true, max: 60 },
          { name: 'payload_hash', type: 'text', required: true, max: 64 },
          { name: 'recibo', type: 'json', maxSize: 5242880 },
          { name: 'criado_por', type: 'text', max: 200 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_c2_idem_chave ON c2_idempotency_keys (chave)',
          'CREATE INDEX idx_c2_idem_escopo ON c2_idempotency_keys (escopo, created)',
        ],
      })
      app.save(idemp)
    }
  },
  (app) => {
    // Down: remove SOMENTE o que esta migration criou/alterou.
    try {
      const idemp = app.findCollectionByNameOrId('c2_idempotency_keys')
      app.delete(idemp)
    } catch (e) {
      // pode não existir em bases novas
    }

    try {
      const rodadas = app.findCollectionByNameOrId('cotacoes_rodadas')
      let mudou = false

      const tipoField = rodadas.fields.getByName('tipo')
      if (tipoField && tipoField.values && tipoField.values.indexOf('selecao') !== -1) {
        tipoField.values = tipoField.values.filter(function (v) {
          return v !== 'selecao'
        })
        mudou = true
      }

      const refField = rodadas.fields.getByName('cotacao_iten_ref')
      if (refField) {
        rodadas.fields.removeByName('cotacao_iten_ref')
        mudou = true
      }

      const relField = rodadas.fields.getByName('cotacao_iten')
      if (relField && !relField.cascadeDelete) {
        relField.cascadeDelete = true
        mudou = true
      }

      if (mudou) {
        app.save(rodadas)
      }
    } catch (e) {
      // coleção pode não existir
    }
  },
)
