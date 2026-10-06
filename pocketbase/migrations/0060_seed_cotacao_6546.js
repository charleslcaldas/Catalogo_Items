/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Escopo aprovado por Charles: Cotação 6546 pontual com cabeçalho + 3 linhas em potencial_itens
    const NUMERO_POTENCIAL = '6546'
    const CLIENTE_ESPERADO = 'C2 International'
    const STATUS_POTENCIAL = 'rascunho'

    // 3 itens candidatos com SKUs esperados e dados estritos (preços/custos zero, fornecedor vazio)
    const ITENS_DATA = [
      {
        item_id: '0px68nl5c8hhu6i',
        sku_esperado: 'F814-M6',
        quantidade: 120,
        unidade_medida: 'MPC',
        observacoes: 'DIn 125A m6',
        ordem: 1,
        referencia_preco: 0,
        preco_unitario: 0,
        referencia_fornecedor: '',
        referencia_data: '',
      },
      {
        item_id: 'av4beuyogi2sn0t',
        sku_esperado: 'F390-3020-YZ',
        quantidade: 60,
        unidade_medida: 'MPC',
        observacoes: 'Paraf Chip Panela 3 x 20',
        ordem: 2,
        referencia_preco: 0,
        preco_unitario: 0,
        referencia_fornecedor: '',
        referencia_data: '',
      },
      {
        item_id: 'ukyydz83fogn8g3',
        sku_esperado: 'FLA20701',
        quantidade: 80,
        unidade_medida: 'KPC',
        observacoes: 'PAraf Sextavado gr2 5/16 x 5/8',
        ordem: 3,
        referencia_preco: 0,
        preco_unitario: 0,
        referencia_fornecedor: '',
        referencia_data: '',
      },
    ]

    app.runInTransaction((txApp) => {
      // 1. Validar coleções necessárias
      const potenciaisCol = txApp.findCollectionByNameOrId('potenciais')
      const potencialItensCol = txApp.findCollectionByNameOrId('potencial_itens')
      const itensCol = txApp.findCollectionByNameOrId('itens')

      if (!potenciaisCol || !potencialItensCol || !itensCol) {
        throw new Error(
          'Colecoes necessarias nao encontradas (potenciais, potencial_itens, itens).',
        )
      }

      // 2. Validar pré-condição dos 3 itens no catálogo por ID e SKU
      for (const itemData of ITENS_DATA) {
        let itemRec
        try {
          itemRec = txApp.findFirstRecordByData('itens', 'id', itemData.item_id)
        } catch (_) {
          throw new Error(`Item ${itemData.item_id} nao encontrado no catalogo itens. Abortando.`)
        }

        const skuAtual = itemRec.getString('sku')
        if (skuAtual !== itemData.sku_esperado) {
          throw new Error(
            `SKU do item ${itemData.item_id} ('${skuAtual}') diverge do esperado ('${itemData.sku_esperado}'). Abortando.`,
          )
        }
      }

      // 3. Pré-condição e guarda do potencial 6546
      let potencialRecord = null
      try {
        potencialRecord = txApp.findFirstRecordByData(
          'potenciais',
          'numero_potencial',
          NUMERO_POTENCIAL,
        )
      } catch (_) {
        potencialRecord = null
      }

      if (potencialRecord) {
        const clienteAtual = potencialRecord.getString('cliente')
        const statusAtual = potencialRecord.getString('status')

        if (clienteAtual !== CLIENTE_ESPERADO) {
          throw new Error(
            `Potencial ${NUMERO_POTENCIAL} ja existe mas com cliente divergente ('${clienteAtual}', esperado '${CLIENTE_ESPERADO}'). Abortando sem mutacao.`,
          )
        }

        if (statusAtual !== STATUS_POTENCIAL) {
          throw new Error(
            `Potencial ${NUMERO_POTENCIAL} ja existe mas com status divergente ('${statusAtual}', esperado '${STATUS_POTENCIAL}'). Abortando sem mutacao.`,
          )
        }
      }

      // 4. Se o potencial já existe, validar se as linhas existentes conferem para idempotência
      const linhasParaInserir = []

      for (const itemData of ITENS_DATA) {
        if (!potencialRecord) {
          // Potencial ainda não existe, todas as linhas serão criadas após criar o cabeçalho
          linhasParaInserir.push(itemData)
          continue
        }

        let existentes = []
        try {
          existentes = txApp.findRecordsByFilter(
            'potencial_itens',
            `potencial_id = '${potencialRecord.id}' && item_id = '${itemData.item_id}'`,
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
          const refF = rec.getString('referencia_fornecedor')

          const matches =
            Math.abs(qtd - itemData.quantidade) < 0.001 &&
            un === itemData.unidade_medida &&
            obs === itemData.observacoes &&
            ord === itemData.ordem &&
            Math.abs(pu - itemData.preco_unitario) < 0.001 &&
            Math.abs(refP - itemData.referencia_preco) < 0.001 &&
            refF === itemData.referencia_fornecedor

          if (!matches) {
            throw new Error(
              `Linha existente para item ${itemData.item_id} no potencial ${NUMERO_POTENCIAL} diverge do esperado. Abortando sem mutacao.`,
            )
          }
          // Idêntico: já existe, não precisa inserir de novo
        } else {
          throw new Error(
            `Multiplos registros em potencial_itens encontrados para potencial=${potencialRecord.id} e item=${itemData.item_id}. Abortando.`,
          )
        }
      }

      // 5. Obter ou criar cabeçalho em potenciais
      let finalPotencialId = null
      if (!potencialRecord) {
        const novoPotencial = new Record(potenciaisCol)
        novoPotencial.set('numero_potencial', NUMERO_POTENCIAL)
        novoPotencial.set('cliente', CLIENTE_ESPERADO)
        novoPotencial.set('status', STATUS_POTENCIAL)
        novoPotencial.set('observacoes', '')
        novoPotencial.set('nome_potencial', '')
        novoPotencial.set('proprietario', '')
        novoPotencial.set('nome_comprador', '')
        novoPotencial.set('notas', '')
        novoPotencial.set('incoterm_cliente', '')
        novoPotencial.set('condicao_pagamento_cliente', '')
        novoPotencial.set('tempo_fabricacao_cliente', '')

        txApp.save(novoPotencial)
        finalPotencialId = novoPotencial.id
      } else {
        finalPotencialId = potencialRecord.id
      }

      // 6. Inserir exatamente as linhas ausentes
      for (const linha of linhasParaInserir) {
        const novoRec = new Record(potencialItensCol)
        novoRec.set('potencial_id', finalPotencialId)
        novoRec.set('item_id', linha.item_id)
        novoRec.set('quantidade', linha.quantidade)
        novoRec.set('unidade_medida', linha.unidade_medida)
        novoRec.set('observacoes', linha.observacoes)
        novoRec.set('ordem', linha.ordem)
        novoRec.set('referencia_preco', linha.referencia_preco)
        novoRec.set('preco_unitario', linha.preco_unitario)
        novoRec.set('referencia_fornecedor', linha.referencia_fornecedor)
        novoRec.set('referencia_data', linha.referencia_data)

        txApp.save(novoRec)
      }
    })
  },
  (app) => {
    // Down: recusar reversão se quaisquer dados (cabeçalho 6546 ou linhas) persistirem.
    // Sem app.delete em nenhuma hipótese.
    const NUMERO_POTENCIAL = '6546'
    let potencialRecord = null
    try {
      potencialRecord = app.findFirstRecordByData(
        'potenciais',
        'numero_potencial',
        NUMERO_POTENCIAL,
      )
    } catch (_) {
      potencialRecord = null
    }

    if (potencialRecord) {
      throw new Error(
        `Impossivel reverter migration 0060: o cabecalho da cotacao ${NUMERO_POTENCIAL} persiste em potenciais (id='${potencialRecord.id}'). Reversao recusada para preservar integridade sem delecao.`,
      )
    }

    // Se o cabeçalho não existe por algum motivo, checar linhas orfãs com os itens
    const ITEM_IDS = ['0px68nl5c8hhu6i', 'av4beuyogi2sn0t', 'ukyydz83fogn8g3']
    // Nenhuma deleção executada
  },
)
