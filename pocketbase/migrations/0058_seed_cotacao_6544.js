/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Definição estrita do payload aprovado por Charles (cotação 6544)
    const NUMERO_POTENCIAL = '6544'
    const CLIENTE_ESPERADO = 'C2 International'
    const STATUS_POTENCIAL = 'Sem Itens'
    const STATUS_ITEM = 'pendente'
    const ORIGEM_ITEM = 'mei'
    const APROVACAO_REF = 'charles:6544:20261006:v2'

    const LINHAS = [
      {
        chave_idempotencia: 'mei_6544_linha_001',
        descricao_cliente_original: 'DIn 125A m6',
        quantidade: 120,
        unidade_medida: 'MPC',
        item_candidato_id: '0px68nl5c8hhu6i',
        item_candidato_sku: 'F814-M6',
      },
      {
        chave_idempotencia: 'mei_6544_linha_002',
        descricao_cliente_original: 'Paraf Chip Panela 3 x 20',
        quantidade: 60,
        unidade_medida: 'MPC',
        item_candidato_id: 'av4beuyogi2sn0t',
        item_candidato_sku: 'F390-3020-YZ',
      },
      {
        chave_idempotencia: 'mei_6544_linha_003',
        descricao_cliente_original: 'PAraf Sextavado gr2 5/16 x 5/8',
        quantidade: 80,
        unidade_medida: 'KPC',
        item_candidato_id: 'ukyydz83fogn8g3',
        item_candidato_sku: 'FLA20701',
      },
    ]

    // Transação única: validações prévias + escrita atômica
    app.runInTransaction((txApp) => {
      // 1. Validar existência das coleções necessárias
      const potenciaisCol = txApp.findCollectionByNameOrId('potenciais')
      const solicitacoesCol = txApp.findCollectionByNameOrId('solicitacoes_itens_cliente')
      const itensCol = txApp.findCollectionByNameOrId('itens')

      // 2. Pré-validar os 3 itens candidatos em `itens`
      for (const linha of LINHAS) {
        let itemRecord
        try {
          itemRecord = txApp.findFirstRecordByData('itens', 'id', linha.item_candidato_id)
        } catch (_) {
          throw new Error(
            `Item candidato ${linha.item_candidato_id} (${linha.item_candidato_sku}) nao encontrado na collection itens.`,
          )
        }
        const skuAtual = itemRecord.getString('sku')
        if (skuAtual !== linha.item_candidato_sku) {
          throw new Error(
            `SKU divergente para item ${linha.item_candidato_id}: esperado '${linha.item_candidato_sku}', encontrado '${skuAtual}'.`,
          )
        }
      }

      // 3. Guarda inicial: releitura de potenciais por numero_potencial='6544'
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

        if (clienteAtual !== CLIENTE_ESPERADO || statusAtual !== STATUS_POTENCIAL) {
          throw new Error(
            `Conflito em potenciais para cotacao ${NUMERO_POTENCIAL}: cliente='${clienteAtual}' (esperado '${CLIENTE_ESPERADO}'), status='${statusAtual}' (esperado '${STATUS_POTENCIAL}'). Abortando transacao.`,
          )
        }
      }

      // 4. Conflitos: antes de escrever qualquer linha, validar TODAS as 3 chaves_idempotencia
      const linhasExistentesPorChave = {}
      for (const linha of LINHAS) {
        let rec = null
        try {
          rec = txApp.findFirstRecordByData(
            'solicitacoes_itens_cliente',
            'chave_idempotencia',
            linha.chave_idempotencia,
          )
        } catch (_) {
          rec = null
        }

        if (rec) {
          // Se existir, validar se é integralmente idêntico
          const descr = rec.getString('descricao_cliente_original')
          const qtd = rec.getInt('quantidade')
          const un = rec.getString('unidade_medida')
          const itemId = rec.getString('item_candidato_id')
          const st = rec.getString('status')
          const orig = rec.getString('origem')
          const aprov = rec.getString('aprovacao_ref')
          const potId = rec.getString('potencial_id')

          // Se o potencial já existe, deve bater com ele
          if (potencialRecord && potId !== potencialRecord.id) {
            throw new Error(
              `Chave ${linha.chave_idempotencia} associada a potencial_id '${potId}' diferente de '${potencialRecord.id}'. Abortando transacao.`,
            )
          }

          if (
            descr !== linha.descricao_cliente_original ||
            qtd !== linha.quantidade ||
            un !== linha.unidade_medida ||
            itemId !== linha.item_candidato_id ||
            st !== STATUS_ITEM ||
            orig !== ORIGEM_ITEM ||
            aprov !== APROVACAO_REF
          ) {
            throw new Error(
              `Chave ${linha.chave_idempotencia} ja existe com conteudo divergente. Abortando transacao inteira.`,
            )
          }

          linhasExistentesPorChave[linha.chave_idempotencia] = rec
        }
      }

      // 5. Obter ou criar cabeçalho em potenciais
      let finalPotencialId = null
      if (!potencialRecord) {
        const novoPotencial = new Record(potenciaisCol)
        novoPotencial.set('numero_potencial', NUMERO_POTENCIAL)
        novoPotencial.set('cliente', CLIENTE_ESPERADO)
        novoPotencial.set('status', STATUS_POTENCIAL)
        txApp.save(novoPotencial)
        finalPotencialId = novoPotencial.id
      } else {
        finalPotencialId = potencialRecord.id
      }

      // 6. Inserir ou reutilizar as 3 linhas
      for (const linha of LINHAS) {
        const existente = linhasExistentesPorChave[linha.chave_idempotencia]
        if (existente) {
          // Registro integralmente idêntico já existe: reutilizar (idempotência pura, sem update)
          continue
        }

        const novaLinha = new Record(solicitacoesCol)
        novaLinha.set('potencial_id', finalPotencialId)
        novaLinha.set('descricao_cliente_original', linha.descricao_cliente_original)
        novaLinha.set('quantidade', linha.quantidade)
        novaLinha.set('unidade_medida', linha.unidade_medida)
        novaLinha.set('item_candidato_id', linha.item_candidato_id)
        novaLinha.set('status', STATUS_ITEM)
        novaLinha.set('origem', ORIGEM_ITEM)
        novaLinha.set('aprovacao_ref', APROVACAO_REF)
        novaLinha.set('chave_idempotencia', linha.chave_idempotencia)

        txApp.save(novaLinha)
      }
    })
  },
  (app) => {
    // Down: recusar reversao se quaisquer dados persistirem.
    // Sem app.delete em nenhuma hipotese.
    const CHAVES = ['mei_6544_linha_001', 'mei_6544_linha_002', 'mei_6544_linha_003']
    const APROVACAO_REF = 'charles:6544:20261006:v2'

    let registrosExistentes = 0

    // Contar por aprovacao_ref
    try {
      const recordsAprov = app.findRecordsByFilter(
        'solicitacoes_itens_cliente',
        `aprovacao_ref = '${APROVACAO_REF}'`,
        '',
        10,
        0,
      )
      registrosExistentes += recordsAprov.length
    } catch (_) {}

    // Contar por chaves individuais (caso aprovacao_ref tenha sido filtrada)
    if (registrosExistentes === 0) {
      for (const chave of CHAVES) {
        try {
          app.findFirstRecordByData('solicitacoes_itens_cliente', 'chave_idempotencia', chave)
          registrosExistentes += 1
        } catch (_) {}
      }
    }

    if (registrosExistentes > 0) {
      throw new Error(
        `Impossivel reverter migration 0058: existem ${registrosExistentes} registro(s) da cotacao 6544 persistidos em solicitacoes_itens_cliente. Reversao recusada para preservar dados sem delecao.`,
      )
    }

    // Se nao houver registros, o down nao realiza nenhuma delecao em potenciais ou solicitacoes
  },
)
