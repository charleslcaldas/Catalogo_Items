/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Escopo autorizado por Charles para a cotação 6546 (cliente "C2 International", header id 'l8mhe9areye2xbz'):
    // Mudar unidade_medida para "KPC" em exatamente DUAS linhas da collection potencial_itens,
    // mantendo 120 e 60 SEM conversão de quantidade.
    const POTENCIAL_ID = 'l8mhe9areye2xbz'
    const NUMERO_POTENCIAL = '6546'
    const CLIENTE_ESPERADO = 'C2 International'

    const LINHA_1_ID = 'q3e711f9evu7ygv'
    const LINHA_1_ITEM_ID = '0px68nl5c8hhu6i'
    const LINHA_1_SKU_ESPERADO = 'F814-M6'
    const LINHA_1_QUANTIDADE = 120

    const LINHA_2_ID = '4m4dthp3xi4s63g'
    const LINHA_2_ITEM_ID = 'av4beuyogi2sn0t'
    const LINHA_2_SKU_ESPERADO = 'F390-3020-YZ'
    const LINHA_2_QUANTIDADE = 60

    const LINHA_3_ID = 'dzp5cshbbrmho9u'
    const LINHA_3_ITEM_ID = 'ukyydz83fogn8g3'
    const LINHA_3_SKU_ESPERADO = 'FLA20701'
    const LINHA_3_QUANTIDADE = 80

    app.runInTransaction((txApp) => {
      // 1. Validar coleções necessárias
      const potenciaisCol = txApp.findCollectionByNameOrId('potenciais')
      const potencialItensCol = txApp.findCollectionByNameOrId('potencial_itens')
      const itensCol = txApp.findCollectionByNameOrId('itens')

      if (!potenciaisCol || !potencialItensCol || !itensCol) {
        throw new Error(
          'Colecoes necessarias nao encontradas (potenciais, potencial_itens, itens). Abortando sem mutacao.',
        )
      }

      // 2. Validar cabeçalho da cotação 6546
      let potencialRecord
      try {
        potencialRecord = txApp.findFirstRecordByData('potenciais', 'id', POTENCIAL_ID)
      } catch (_) {
        throw new Error(
          `Cabecalho de potencial com id='${POTENCIAL_ID}' nao encontrado. Abortando sem mutacao.`,
        )
      }

      const numPot = potencialRecord.getString('numero_potencial')
      const clientePot = potencialRecord.getString('cliente')
      if (numPot !== NUMERO_POTENCIAL || clientePot !== CLIENTE_ESPERADO) {
        throw new Error(
          `Cabecalho da cotacao diverge (numero='${numPot}', esperado='${NUMERO_POTENCIAL}'; cliente='${clientePot}', esperado='${CLIENTE_ESPERADO}'). Abortando sem mutacao.`,
        )
      }

      // 3. Validar itens no catálogo (itens)
      const checarItemCatalogo = (itemId, skuEsperado) => {
        let itemRec
        try {
          itemRec = txApp.findFirstRecordByData('itens', 'id', itemId)
        } catch (_) {
          throw new Error(`Item ${itemId} nao encontrado no catalogo itens. Abortando sem mutacao.`)
        }
        const skuAtual = itemRec.getString('sku')
        if (skuAtual !== skuEsperado) {
          throw new Error(
            `SKU do item ${itemId} ('${skuAtual}') diverge do esperado ('${skuEsperado}'). Abortando sem mutacao.`,
          )
        }
      }

      checarItemCatalogo(LINHA_1_ITEM_ID, LINHA_1_SKU_ESPERADO)
      checarItemCatalogo(LINHA_2_ITEM_ID, LINHA_2_SKU_ESPERADO)
      checarItemCatalogo(LINHA_3_ITEM_ID, LINHA_3_SKU_ESPERADO)

      // 4. Carregar e validar linha 1 (q3e711f9evu7ygv)
      let linha1Rec
      try {
        linha1Rec = txApp.findFirstRecordByData('potencial_itens', 'id', LINHA_1_ID)
      } catch (_) {
        throw new Error(`Linha 1 id='${LINHA_1_ID}' nao encontrada. Abortando sem mutacao.`)
      }

      if (
        linha1Rec.getString('potencial_id') !== POTENCIAL_ID ||
        linha1Rec.getString('item_id') !== LINHA_1_ITEM_ID ||
        Math.abs(linha1Rec.getFloat('quantidade') - LINHA_1_QUANTIDADE) > 0.001
      ) {
        throw new Error(
          `Linha 1 id='${LINHA_1_ID}' tem campos divergentes do esperado (potencial_id, item_id ou quantidade). Abortando sem mutacao.`,
        )
      }

      const un1Atual = linha1Rec.getString('unidade_medida')
      if (un1Atual !== 'MPC' && un1Atual !== 'KPC') {
        throw new Error(
          `Linha 1 id='${LINHA_1_ID}' possui unidade_medida='${un1Atual}' (esperado 'MPC' ou 'KPC'). Abortando sem mutacao.`,
        )
      }

      // 5. Carregar e validar linha 2 (4m4dthp3xi4s63g)
      let linha2Rec
      try {
        linha2Rec = txApp.findFirstRecordByData('potencial_itens', 'id', LINHA_2_ID)
      } catch (_) {
        throw new Error(`Linha 2 id='${LINHA_2_ID}' nao encontrada. Abortando sem mutacao.`)
      }

      if (
        linha2Rec.getString('potencial_id') !== POTENCIAL_ID ||
        linha2Rec.getString('item_id') !== LINHA_2_ITEM_ID ||
        Math.abs(linha2Rec.getFloat('quantidade') - LINHA_2_QUANTIDADE) > 0.001
      ) {
        throw new Error(
          `Linha 2 id='${LINHA_2_ID}' tem campos divergentes do esperado (potencial_id, item_id ou quantidade). Abortando sem mutacao.`,
        )
      }

      const un2Atual = linha2Rec.getString('unidade_medida')
      if (un2Atual !== 'MPC' && un2Atual !== 'KPC') {
        throw new Error(
          `Linha 2 id='${LINHA_2_ID}' possui unidade_medida='${un2Atual}' (esperado 'MPC' ou 'KPC'). Abortando sem mutacao.`,
        )
      }

      // 6. Carregar e validar linha 3 (dzp5cshbbrmho9u) - APENAS VALIDAR, NÃO ALTERAR
      let linha3Rec
      try {
        linha3Rec = txApp.findFirstRecordByData('potencial_itens', 'id', LINHA_3_ID)
      } catch (_) {
        throw new Error(`Linha 3 id='${LINHA_3_ID}' nao encontrada. Abortando sem mutacao.`)
      }

      if (
        linha3Rec.getString('potencial_id') !== POTENCIAL_ID ||
        linha3Rec.getString('item_id') !== LINHA_3_ITEM_ID ||
        Math.abs(linha3Rec.getFloat('quantidade') - LINHA_3_QUANTIDADE) > 0.001 ||
        linha3Rec.getString('unidade_medida') !== 'KPC'
      ) {
        throw new Error(
          `Linha 3 id='${LINHA_3_ID}' de validacao diverge do esperado (potencial_id, item_id, quantidade=80 ou unidade_medida='KPC'). Abortando sem mutacao.`,
        )
      }

      // 7. Mutação idempotente: atualizar unidade_medida para 'KPC' somente se for 'MPC'
      // Preservando quantidade intacta (120 e 60 sem conversão) e todos os demais campos
      if (un1Atual !== 'KPC') {
        linha1Rec.set('unidade_medida', 'KPC')
        txApp.save(linha1Rec)
      }

      if (un2Atual !== 'KPC') {
        linha2Rec.set('unidade_medida', 'KPC')
        txApp.save(linha2Rec)
      }
    })
  },
  (app) => {
    // Down da migration: conservador — recusar reversão se os dados persistirem.
    // Nenhuma exclusão (sem app.delete) em nenhum caminho.
    const POTENCIAL_ID = 'l8mhe9areye2xbz'
    const LINHA_1_ID = 'q3e711f9evu7ygv'
    const LINHA_2_ID = '4m4dthp3xi4s63g'

    let l1Existe = false
    let l2Existe = false

    try {
      const r1 = app.findFirstRecordByData('potencial_itens', 'id', LINHA_1_ID)
      if (r1 && r1.getString('potencial_id') === POTENCIAL_ID) {
        l1Existe = true
      }
    } catch (_) {}

    try {
      const r2 = app.findFirstRecordByData('potencial_itens', 'id', LINHA_2_ID)
      if (r2 && r2.getString('potencial_id') === POTENCIAL_ID) {
        l2Existe = true
      }
    } catch (_) {}

    if (l1Existe || l2Existe) {
      throw new Error(
        `Impossivel reverter migration 0061: os registros afetados em potencial_itens persistem no banco. Reversao conservadora recusada para proteger integridade dos dados sem mutacoes/delecoes destrutivas.`,
      )
    }
  },
)
