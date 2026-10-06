/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const NUMERO_POTENCIAL = '6544'
    const CLIENTE_ESPERADO = 'C2 International'
    const POTENCIAL_ID_ESPERADO = 'klnwc70mdcd7iuf'

    const ITENS_DATA = [
      {
        item_id: '0px68nl5c8hhu6i',
        sku_esperado: 'F814-M6',
        quantidade: 120,
        unidade_medida: 'MPC',
        observacoes: 'DIn 125A m6',
        ordem: 1,
        referencia_preco: 2.27,
        preco_unitario: 2.46,
      },
      {
        item_id: 'av4beuyogi2sn0t',
        sku_esperado: 'F390-3020-YZ',
        quantidade: 60,
        unidade_medida: 'MPC',
        observacoes: 'Paraf Chip Panela 3 x 20',
        ordem: 2,
        referencia_preco: 1.31,
        preco_unitario: 1.37,
      },
      {
        item_id: 'ukyydz83fogn8g3',
        sku_esperado: 'FLA20701',
        quantidade: 80,
        unidade_medida: 'KPC',
        observacoes: 'PAraf Sextavado gr2 5/16 x 5/8',
        ordem: 3,
        referencia_preco: 10.33,
        preco_unitario: 11.23,
      },
    ]

    app.runInTransaction((txApp) => {
      // 1. Validar coleções
      const potenciaisCol = txApp.findCollectionByNameOrId('potenciais')
      const potencialItensCol = txApp.findCollectionByNameOrId('potencial_itens')
      const itensCol = txApp.findCollectionByNameOrId('itens')

      if (!potenciaisCol || !potencialItensCol || !itensCol) {
        throw new Error('Colecoes necessarias nao encontradas.')
      }

      // 2. Validar potencial 6544
      let potencialRecord
      try {
        potencialRecord = txApp.findFirstRecordByData(
          'potenciais',
          'numero_potencial',
          NUMERO_POTENCIAL,
        )
      } catch (_) {
        throw new Error(
          `Potencial com numero ${NUMERO_POTENCIAL} nao encontrado. Abortando transacao.`,
        )
      }

      if (potencialRecord.id !== POTENCIAL_ID_ESPERADO) {
        throw new Error(
          `ID do potencial ${NUMERO_POTENCIAL} ('${potencialRecord.id}') diverge do esperado ('${POTENCIAL_ID_ESPERADO}'). Abortando transacao.`,
        )
      }

      const clienteAtual = potencialRecord.getString('cliente')
      if (clienteAtual !== CLIENTE_ESPERADO) {
        throw new Error(
          `Cliente do potencial ${NUMERO_POTENCIAL} ('${clienteAtual}') diverge do esperado ('${CLIENTE_ESPERADO}'). Abortando transacao.`,
        )
      }

      // 3. Validar itens no catalogo de itens
      for (const itemData of ITENS_DATA) {
        let itemRec
        try {
          itemRec = txApp.findFirstRecordByData('itens', 'id', itemData.item_id)
        } catch (_) {
          throw new Error(`Item ${itemData.item_id} nao encontrado no catalogo itens.`)
        }

        const skuAtual = itemRec.getString('sku')
        if (skuAtual !== itemData.sku_esperado) {
          throw new Error(
            `SKU do item ${itemData.item_id} ('${skuAtual}') diverge do esperado ('${itemData.sku_esperado}').`,
          )
        }

        const precoCompraCat = itemRec.getFloat('preco_compra')
        const precoVendaCat = itemRec.getFloat('preco_venda')

        if (Math.abs(precoCompraCat - itemData.referencia_preco) > 0.001) {
          throw new Error(
            `preco_compra de ${itemData.sku_esperado} (${precoCompraCat}) diverge da referencia (${itemData.referencia_preco}).`,
          )
        }
        if (Math.abs(precoVendaCat - itemData.preco_unitario) > 0.001) {
          throw new Error(
            `preco_venda de ${itemData.sku_esperado} (${precoVendaCat}) diverge do preco unitario (${itemData.preco_unitario}).`,
          )
        }
      }

      // 4. Checar registros existentes em potencial_itens para idempotencia
      const linhasParaInserir = []

      for (const itemData of ITENS_DATA) {
        let existentes = []
        try {
          existentes = txApp.findRecordsByFilter(
            'potencial_itens',
            `potencial_id = '${POTENCIAL_ID_ESPERADO}' && item_id = '${itemData.item_id}'`,
            '',
            10,
            0,
          )
        } catch (_) {
          existentes = []
        }

        if (existentes.length === 0) {
          linhasParaInserir.push(itemData)
        } else if (existentes.length === 1) {
          const rec = existentes[0]
          const qtd = rec.getFloat('quantidade')
          const un = rec.getString('unidade_medida')
          const obs = rec.getString('observacoes')
          const ord = rec.getInt('ordem')
          const pu = rec.getFloat('preco_unitario')
          const refP = rec.getFloat('referencia_preco')

          const matches =
            Math.abs(qtd - itemData.quantidade) < 0.001 &&
            un === itemData.unidade_medida &&
            obs === itemData.observacoes &&
            ord === itemData.ordem &&
            Math.abs(pu - itemData.preco_unitario) < 0.001 &&
            Math.abs(refP - itemData.referencia_preco) < 0.001

          if (!matches) {
            throw new Error(
              `Registro existente em potencial_itens para item ${itemData.item_id} possui divergencias. Abortando sem mutacao.`,
            )
          }
          // Se for integralmente identico, pula (idempotencia pura)
        } else {
          throw new Error(
            `Multiplos registros em potencial_itens encontrados para potencial=${POTENCIAL_ID_ESPERADO} e item=${itemData.item_id}. Abortando.`,
          )
        }
      }

      // 5. Inserir exatamente as linhas ausentes
      for (const linha of linhasParaInserir) {
        const novoRec = new Record(potencialItensCol)
        novoRec.set('potencial_id', POTENCIAL_ID_ESPERADO)
        novoRec.set('item_id', linha.item_id)
        novoRec.set('quantidade', linha.quantidade)
        novoRec.set('unidade_medida', linha.unidade_medida)
        novoRec.set('observacoes', linha.observacoes)
        novoRec.set('ordem', linha.ordem)
        novoRec.set('referencia_preco', linha.referencia_preco)
        novoRec.set('preco_unitario', linha.preco_unitario)

        txApp.save(novoRec)
      }
    })
  },
  (app) => {
    // Down: recusar execucao se as linhas persistirem (sem app.delete, sem rollback automatico)
    const POTENCIAL_ID = 'klnwc70mdcd7iuf'
    const ITEM_IDS = ['0px68nl5c8hhu6i', 'av4beuyogi2sn0t', 'ukyydz83fogn8g3']

    let contagem = 0
    for (const itemId of ITEM_IDS) {
      try {
        const registros = app.findRecordsByFilter(
          'potencial_itens',
          `potencial_id = '${POTENCIAL_ID}' && item_id = '${itemId}'`,
          '',
          10,
          0,
        )
        contagem += registros.length
      } catch (_) {}
    }

    if (contagem > 0) {
      throw new Error(
        `Impossivel reverter migration 0059: existem ${contagem} linha(s) de potencial_itens persistidas para cotacao 6544. Reversao recusada para preservar integridade sem delecao.`,
      )
    }
  },
)
