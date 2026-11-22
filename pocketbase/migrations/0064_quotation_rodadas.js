// ETAPA MÍNIMA ADITIVA — modelo de rodadas de cotação (aprovado por Charles).
// Cria a coleção `cotacoes_rodadas` (histórico de ofertas/respostas por item de
// cotação) e dois campos aditivos em `cotacoes_itens` (rodada_atual, preco_original).
// SEM dados: a coleção nasce vazia, nenhum registro legado é preenchido ou
// marcado com rodada fictícia. SEM mudança de API rules das coleções existentes,
// SEM hooks, SEM endpoint, SEM frontend. Down remove apenas o que a migration criou.

migrate(
  (app) => {
    // ---------- 1. coleção cotacoes_rodadas ----------
    let rodadas = null
    try {
      rodadas = app.findCollectionByNameOrId('cotacoes_rodadas')
    } catch (e) {
      rodadas = null
    }

    if (!rodadas) {
      const cotacoesItensId = app.findCollectionByNameOrId('cotacoes_itens').id
      const fornecedoresId = app.findCollectionByNameOrId('fornecedores').id
      const potenciaisId = app.findCollectionByNameOrId('potenciais').id
      const itensId = app.findCollectionByNameOrId('itens').id

      const RULE = '((@request.auth.id != \'\') && @request.auth.id != "meiqw9s6c4r2t8a")'

      rodadas = new Collection({
        name: 'cotacoes_rodadas',
        type: 'base',
        // Mesma regra de acesso das coleções vizinhas de cotação
        // (autenticados, exceto o usuário de integração Mei). Nada ampliado.
        listRule: RULE,
        viewRule: RULE,
        createRule: RULE,
        updateRule: RULE,
        deleteRule: RULE,
        fields: [
          {
            name: 'cotacao_iten',
            type: 'relation',
            required: true,
            collectionId: cotacoesItensId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'potencial',
            type: 'relation',
            required: false,
            collectionId: potenciaisId,
            maxSelect: 1,
          },
          {
            name: 'fornecedor',
            type: 'relation',
            required: false,
            collectionId: fornecedoresId,
            maxSelect: 1,
          },
          {
            name: 'item',
            type: 'relation',
            required: false,
            collectionId: itensId,
            maxSelect: 1,
          },
          {
            name: 'numero_rodada',
            type: 'number',
            onlyInt: true,
            min: 1,
          },
          {
            name: 'tipo',
            type: 'select',
            maxSelect: 1,
            values: [
              'oferta_original',
              'contraproposta_c2',
              'resposta_fabricante',
              'oferta_confirmada',
            ],
          },
          { name: 'preco', type: 'number' },
          { name: 'moeda', type: 'text', max: 8 },
          { name: 'unidade', type: 'text', max: 20 },
          { name: 'quantidade', type: 'number' },
          { name: 'moq', type: 'number' },
          { name: 'data_oferta', type: 'date' },
          { name: 'autor', type: 'text', max: 200 },
          {
            name: 'estado',
            type: 'select',
            maxSelect: 1,
            values: ['rascunho', 'aguardando', 'recebida', 'confirmada', 'recusada', 'reaberta'],
          },
          { name: 'condicoes', type: 'text', max: 1000 },
          { name: 'observacoes', type: 'text', max: 2000 },
          {
            name: 'anexos',
            type: 'file',
            maxSelect: 10,
            maxSize: 10485760,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [],
      })
      app.save(rodadas)
    }

    // ---------- 2. campos aditivos em cotacoes_itens (nada é apagado) ----------
    const cItens = app.findCollectionByNameOrId('cotacoes_itens')
    let mudou = false

    if (!cItens.fields.getByName('rodada_atual')) {
      cItens.fields.add(new NumberField({ name: 'rodada_atual', onlyInt: true, min: 1 }))
      mudou = true
    }
    if (!cItens.fields.getByName('preco_original')) {
      cItens.fields.add(new NumberField({ name: 'preco_original' }))
      mudou = true
    }
    if (mudou) {
      app.save(cItens)
    }
  },
  (app) => {
    // Down: remove SOMENTE o que esta migration criou.
    try {
      const rodadas = app.findCollectionByNameOrId('cotacoes_rodadas')
      app.delete(rodadas)
    } catch (e) {
      // coleção pode não existir
    }

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
    removeField('cotacoes_itens', 'rodada_atual')
    removeField('cotacoes_itens', 'preco_original')
  },
)
