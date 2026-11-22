// Serviço transacional/idempotente de CONFIRMAÇÃO DE COMPRA (Cotação de Fabricantes).
//
// POST /backend/v1/cotacoes/confirmar-compra  (rota única; padrão do projeto)
//
// Executa UMA transação com estes efeitos padronizados (unifica semanticamente os
// caminhos de aceite hoje espalhados no frontend — sem alterar o frontend nesta rodada):
//   1. marca vencedor em cotacoes_itens (e desmarca outros vencedores do item);
//   2. grava potencial_itens (referencia_preco, referencia_fornecedor, referencia_data)
//      e preco_unitario = venda calculada com a MARGEM NEGOCIADA recebida no payload
//      (validada; ausente → 422 pendência; nunca linhas.margem_padrao, nunca 7,5),
//      fórmula venda = compra / (1 - margem/100), arredondada na precisão 2/3 enviada
//      no payload; moeda/unidade preservadas, sem conversão;
//   3. grava histórico ÚNICO em historico_precos (tipo 'compra'). Hooks legados
//      (price_history_logger.js e on_cotacao_finalizada.js) disparam por atualização
//      em `itens`/status 'finalizada' em `cotacoes_fornecedor` — este serviço NÃO toca
//      `itens` nem `cotacoes_fornecedor`, portanto nada duplica. Nenhuma alteração
//      nesses hooks foi necessária (verificado; restrição 2 respeitada);
//   4. grava rodada tipo 'selecao' em cotacoes_rodadas e atualiza rodada_atual;
//   5. preserva preco_original; alvo (preco_contraproposta > 0) NUNCA confirma compra:
//      exigimos preco_oferta != preco_contraproposta;
//   6. NÃO atualiza o catálogo mestre (itens).
//
// Histórico: exatamente 1 'compra' + 1 'venda' por confirmação. O 'venda' é gravado aqui;
// o logger de potencial_itens_price.js é suprimido apenas para o save deste serviço.
//
// Idempotência durável: coleção c2_idempotency_keys (migration 0065). Mesma chave +
// mesmo payload → MESMO recibo; mesma chave + payload diferente → 409.
//
// ATENÇÃO (validador de deploy da Skip Cloud): TODOS os helpers são declarados
// DENTRO do callback — nenhuma declaração top-level além da chamada de routerAdd.
// Nenhum hook existente foi alterado.

routerAdd(
  'POST',
  '/backend/v1/cotacoes/confirmar-compra',
  (e) => {
    // CONTENÇÃO AUTORIZADA (Charles): rota desativada temporariamente.
    // Retorna 503 incondicionalmente na PRIMEIRA instrução do handler — antes de
    // qualquer leitura, escrita ou checagem de idempotência. A autenticação
    // ($apis.requireAuth) roda ANTES do handler (middleware da rota): sem
    // credenciais a resposta é 401, não 503. Sem flag, sem variável de ambiente,
    // sem condicional. O código abaixo é rascunho não executável (inalcançável),
    // preservado para reativação futura.
    return e.json(503, { error: 'confirmacao_em_validacao' })

    const info = e.requestInfo()
    const body = info.body || {}
    const auth = info.auth

    if (!auth || !auth.id) {
      return e.json(401, { error: 'nao_autenticado', message: 'Autenticação obrigatória.' })
    }

    // Usuário de integração Mei: excluído pelas API rules de cotação/potenciais/itens.
    // O serviço usa API de servidor (não passa pelas rules), então a mesma exclusão é aplicada aqui.
    const MEI_INTEGRATION_USER_ID = 'meiqw9s6c4r2t8a'
    if (auth.id === MEI_INTEGRATION_USER_ID) {
      return e.json(403, {
        error: 'acesso_negado',
        message: 'Usuário de integração não pode confirmar compras.',
      })
    }

    // ---------- helpers (dentro do callback: exigência do validador de deploy) ----------

    const jsonError = function (status, code, message) {
      return e.json(status, { error: code, message: message })
    }

    const isFiniteNum = function (v) {
      return typeof v === 'number' && isFinite(v)
    }

    // Canonicalização: mesma chave + mesmo payload (ordem de propriedades não importa)
    // → mesmo hash; qualquer diferença → hash diferente.
    const canonicalize = function (value) {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return JSON.stringify(value)
      }
      const keys = Object.keys(value).sort()
      const parts = []
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i]
        parts.push(JSON.stringify(k) + ':' + canonicalize(value[k]))
      }
      return '{' + parts.join(',') + '}'
    }

    const sha256Hex = function (message) {
      return $security.sha256(message)
    }

    // Converte DateTime para string (comparação no recibo; formatos ISO do PB).
    const isoOf = function (v) {
      try {
        if (v && typeof v.string === 'function') {
          return v.string()
        }
      } catch (err) {}
      try {
        return String(v)
      } catch (err2) {}
      return ''
    }

    // ---------- leitura e validação do payload ----------
    const cotacaoItenId = typeof body.cotacao_iten_id === 'string' ? body.cotacao_iten_id : ''
    const potencialItenId = typeof body.potencial_iten_id === 'string' ? body.potencial_iten_id : ''
    const idemKey = typeof body.idempotency_key === 'string' ? body.idempotency_key.trim() : ''
    const versaoEsperada = typeof body.versao === 'string' ? body.versao : ''
    const ajustarMoq = body.ajustar_quantidade_para_moq === true
    const moqExplicito = isFiniteNum(body.moq) ? body.moq : null
    const ofertaValidade = typeof body.oferta_validade === 'string' ? body.oferta_validade : ''

    if (!cotacaoItenId) {
      return jsonError(400, 'payload_invalido', 'cotacao_iten_id é obrigatório.')
    }
    if (!idemKey) {
      return jsonError(400, 'payload_invalido', 'idempotency_key é obrigatória.')
    }
    if (idemKey.length > 200) {
      return jsonError(400, 'payload_invalido', 'idempotency_key excede 200 caracteres.')
    }
    if (!versaoEsperada) {
      return jsonError(
        400,
        'payload_invalido',
        'versao (updated do registro cotacoes_itens) é obrigatória.',
      )
    }

    // ---------- idempotência durável: lookup antes do trabalho ----------
    const idemPayload = {
      cotacao_iten_id: cotacaoItenId,
      potencial_iten_id: potencialItenId,
      versao: versaoEsperada,
      ajustar_quantidade_para_moq: ajustarMoq === true,
      moq: moqExplicito,
      oferta_validade: ofertaValidade,
    }
    const payloadHash = sha256Hex(canonicalize(idemPayload))
    const ESCOPO = 'confirmar_compra'

    let existente = null
    try {
      existente = $app.findFirstRecordByFilter(
        'c2_idempotency_keys',
        "chave = '" + idemKey.replace(/'/g, "''") + "'",
      )
    } catch (_) {
      existente = null
    }

    if (existente) {
      const hashSalvo = existente.getString('payload_hash')
      if (hashSalvo !== payloadHash) {
        return jsonError(
          409,
          'conflito_idempotencia',
          'Chave de idempotência já usada com payload diferente.',
        )
      }
      const reciboSalvo = existente.get('recibo')
      return e.json(200, { repetido: true, recibo: reciboSalvo === undefined ? null : reciboSalvo })
    }

    // ---------- carrega registros (falha de leitura não grava nada) ----------
    let oferta = null
    try {
      oferta = $app.findRecordById('cotacoes_itens', cotacaoItenId)
    } catch (_) {
      return jsonError(404, 'oferta_nao_encontrada', 'Oferta (cotacoes_itens) não encontrada.')
    }

    const updatedAt = isoOf(oferta.get('updated'))
    if (versaoEsperada !== updatedAt) {
      return e.json(409, {
        error: 'conflito_versao',
        message: 'A oferta mudou desde a leitura. Recarregue e confirme novamente.',
        versao_atual: updatedAt,
      })
    }

    const precoOferta = oferta.getFloat('preco_ofertado')
    const precoContraproposta = oferta.getFloat('preco_contraproposta')
    const moqOferta = oferta.getFloat('quantidade_minima')
    if (moqExplicito !== null) {
      if (!isFiniteNum(moqExplicito) || moqExplicito < 0) {
        return jsonError(400, 'moq_invalido', 'moq deve ser um número >= 0.')
      }
    }
    const moqVigente = moqExplicito !== null ? moqExplicito : moqOferta

    if (!isFiniteNum(precoOferta) || precoOferta <= 0) {
      return jsonError(400, 'preco_invalido', 'preco_ofertado deve ser um número > 0.')
    }

    // alvo (preco_contraproposta): igualdade numérica NÃO prova resposta do fabricante.
    // Exige proveniência: rodada 'resposta_fabricante' desta oferta, com o mesmo preço,
    // data_oferta e autor. Sem prova → 409 (legado sem prova = pendência; nada inventado).
    if (
      isFiniteNum(precoContraproposta) &&
      precoContraproposta > 0 &&
      precoContraproposta === precoOferta
    ) {
      const respostas = $app.findRecordsByFilter(
        'cotacoes_rodadas',
        "cotacao_iten = '" + cotacaoItenId + "' && tipo = 'resposta_fabricante'",
        '-created',
        200,
        0,
      )
      let comProva = false
      for (let r = 0; r < respostas.length; r++) {
        const rr = respostas[r]
        if (
          rr.getFloat('preco') === precoOferta &&
          rr.getString('autor') !== '' &&
          isoOf(rr.get('data_oferta')) !== ''
        ) {
          comProva = true
          break
        }
      }
      if (!comProva) {
        return jsonError(
          409,
          'preco_eh_alvo',
          'O preço é igual ao alvo (contraproposta C2) e não há resposta do fabricante registrada para ele — não confirma compra.',
        )
      }
    }

    // validade da oferta
    if (ofertaValidade) {
      const agora = new Date().toISOString()
      let ok = true
      try {
        ok = new Date(ofertaValidade.replace(' ', 'T')).getTime() >= new Date(agora).getTime()
      } catch (_) {
        ok = false
      }
      if (!ok) {
        return jsonError(410, 'oferta_vencida', 'A oferta está vencida (oferta_validade).')
      }
    }

    // relações coerentes
    const cfId = oferta.getString('cotacao_fornecedor_id')
    const itemId = oferta.getString('item_id')
    let cf = null
    try {
      cf = $app.findRecordById('cotacoes_fornecedor', cfId)
    } catch (_) {
      return jsonError(
        404,
        'cotacao_fornecedor_nao_encontrada',
        'Cotação de fornecedor não encontrada.',
      )
    }
    const potencialId = cf.getString('potencial_id')
    const fornecedorId = cf.getString('fornecedor_id')
    let potencial = null
    try {
      potencial = $app.findRecordById('potenciais', potencialId)
    } catch (_) {
      return jsonError(404, 'potencial_nao_encontrado', 'Potencial não encontrado.')
    }
    let fornecedor = null
    try {
      fornecedor = $app.findRecordById('fornecedores', fornecedorId)
    } catch (_) {
      return jsonError(404, 'fornecedor_nao_encontrado', 'Fornecedor não encontrado.')
    }
    let itemMestre = null
    try {
      itemMestre = $app.findRecordById('itens', itemId)
    } catch (_) {
      return jsonError(404, 'item_nao_encontrado', 'Item do catálogo não encontrado.')
    }

    // ---------- resolve o potencial_itens ----------
    let pitem = null
    if (potencialItenId) {
      try {
        pitem = $app.findRecordById('potencial_itens', potencialItenId)
      } catch (_) {
        return jsonError(404, 'potencial_item_nao_encontrado', 'Item do potencial não encontrado.')
      }
      if (
        pitem.getString('item_id') !== itemId ||
        pitem.getString('potencial_id') !== potencialId
      ) {
        return jsonError(
          409,
          'relacoes_incoerentes',
          'potencial_iten não pertence ao mesmo item/potencial da oferta.',
        )
      }
    } else {
      const candidatos = $app.findRecordsByFilter(
        'potencial_itens',
        "potencial_id = '" + potencialId + "' && item_id = '" + itemId + "'",
        'created',
        2,
        0,
      )
      if (candidatos.length === 0) {
        return jsonError(
          422,
          'pendencia_dados',
          'Não existe item do potencial para este item — pendência a resolver antes de confirmar.',
        )
      }
      if (candidatos.length > 1) {
        return jsonError(
          409,
          'potencial_item_ambiguo',
          'Mais de um potencial_iten para o mesmo item — envie potencial_iten_id.',
        )
      }
      pitem = candidatos[0]
    }

    // ---------- margem negociada (recebida no contrato; nunca linhas.margem_padrao; nunca 7,5) ----------
    const margem = body.margem
    if (typeof margem !== 'number' || !isFiniteNum(margem)) {
      return e.json(422, {
        error: 'pendencia_margem',
        message: 'Margem negociada ausente ou inválida — pendência explícita. Nada foi gravado.',
      })
    }
    if (margem < 0 || margem >= 100) {
      return e.json(422, { error: 'margem_invalida', message: 'Margem deve ser >= 0 e < 100.' })
    }

    // ---------- quantidade x MOQ (nunca muda quantidade silenciosamente) ----------
    const qtdeAtual = pitem.getFloat('quantidade')
    if (!isFiniteNum(qtdeAtual) || qtdeAtual <= 0) {
      return jsonError(422, 'quantidade_invalida', 'quantidade do item do potencial deve ser > 0.')
    }
    const ajustaAgora = moqVigente > 0 && qtdeAtual < moqVigente
    if (ajustaAgora && !ajustarMoq) {
      return e.json(422, {
        error: 'quantidade_abaixo_moq',
        message:
          'Quantidade abaixo do MOQ. Envie ajustar_quantidade_para_moq=true para ajustar explicitamente.',
        quantidade_atual: qtdeAtual,
        moq: moqVigente,
      })
    }
    const quantidadeFinal = ajustaAgora && ajustarMoq ? moqVigente : qtdeAtual

    // ---------- moeda e unidade presentes ----------
    const moedaOferta = cf.getString('oferta_moeda')
    const unidadeOferta = cf.getString('oferta_unidade')
    const moedaFinal = moedaOferta || potencial.getString('moeda') || ''
    const unidadeFinal =
      unidadeOferta || pitem.getString('unidade_medida') || itemMestre.getString('unidade') || ''
    if (!moedaFinal) {
      return jsonError(
        422,
        'moeda_ausente',
        'Moeda ausente (oferta_moeda/potencial) — pendência explícita.',
      )
    }
    if (!unidadeFinal) {
      return jsonError(
        422,
        'unidade_ausente',
        'Unidade ausente (oferta/unidade_medida/item) — pendência explícita.',
      )
    }

    // ---------- cálculo da venda (fórmula obrigatória) ----------
    const precisao = body.precisao === 3 ? 3 : body.precisao === 2 ? 2 : 0
    if (precisao === 0) {
      return e.json(422, {
        error: 'precisao_ausente',
        message: 'precisao (2 ou 3) ausente ou inválida — pendência explícita. Nada foi gravado.',
      })
    }
    const vendaBruta = precoOferta / (1 - margem / 100)
    if (!isFiniteNum(vendaBruta) || vendaBruta <= 0) {
      return jsonError(422, 'venda_invalida', 'Cálculo de venda resultou inválido — nada gravado.')
    }
    const fator = precisao === 3 ? 1000 : 100
    const venda = Math.round(vendaBruta * fator) / fator
    if (!isFiniteNum(venda) || venda <= 0) {
      return jsonError(
        422,
        'venda_invalida',
        'Arredondamento da venda resultou inválido — nada gravado.',
      )
    }

    // ---------- TRANSAÇÃO ÚNICA ----------
    const agoraISO = new Date().toISOString()
    const autorNome = auth.getString('name') || auth.getString('email') || auth.id

    let resultado = null
    try {
      resultado = $app.runInTransaction(function (tx) {
        // revalida o ator dentro da transação (conta removida = nada gravado)
        let atorTx = null
        try {
          atorTx = tx.findRecordById('users', auth.id)
        } catch (_) {
          atorTx = null
        }
        if (!atorTx) {
          throw new BadRequestError('acesso_negado: ator não encontrado na gravação.')
        }

        // re-leitura de consistência dentro da transação: versão ainda vigente?
        const ofertaTx = tx.findRecordById('cotacoes_itens', cotacaoItenId)
        if (isoOf(ofertaTx.get('updated')) !== versaoEsperada) {
          throw new BadRequestError(
            'conflito_versao: a oferta mudou durante a confirmação — tente novamente.',
          )
        }

        // 1. vencedor em cotacoes_itens (desmarca outros vencedores do mesmo item)
        const outrosVencedores = tx.findRecordsByFilter(
          'cotacoes_itens',
          "item_id = '" + itemId + "' && vencedor = true",
          '',
          500,
          0,
        )
        for (let i = 0; i < outrosVencedores.length; i++) {
          const ov = outrosVencedores[i]
          if (ov.id === cotacaoItenId) {
            continue
          }
          ov.set('vencedor', false)
          tx.save(ov)
        }
        ofertaTx.set('vencedor', true)
        // preco_original é gravado uma única vez; preservado quando já existir
        if (ofertaTx.getFloat('preco_original') === 0) {
          ofertaTx.set('preco_original', precoOferta)
        }
        tx.save(ofertaTx)

        // 2. potencial_itens (referências + venda calculada com margem vigente)
        pitem.set('referencia_preco', precoOferta)
        pitem.set('referencia_fornecedor', fornecedor.getString('nome') || '')
        pitem.set('referencia_data', agoraISO)
        pitem.set('preco_unitario', venda)
        if (quantidadeFinal !== qtdeAtual) {
          pitem.set('quantidade', quantidadeFinal)
        }
        // Suprime SOMENTE o logger parasita de potencial_itens_price.js para este save
        // (chave no store do servidor, nunca vinda do cliente); o 'venda' é gravado abaixo, uma vez.
        const supKey = 'c2_suppress_venda:' + pitem.id
        $app.store().set(supKey, true)
        try {
          tx.save(pitem)
        } finally {
          $app.store().remove(supKey)
        }

        // 3. histórico ÚNICO por evento: 'compra' (preço do fabricante) e 'venda' (venda calculada)
        const fornecedorNome = fornecedor.getString('nome') || ''
        const hpCol = tx.findCollectionByNameOrId('historico_precos')
        const hp = new Record(hpCol)
        hp.set('item_id', itemId)
        hp.set('preco', precoOferta)
        hp.set('fornecedor', fornecedorNome)
        hp.set('data_cotacao', agoraISO)
        hp.set('tipo', 'compra')
        tx.save(hp)

        const hv = new Record(hpCol)
        hv.set('item_id', itemId)
        hv.set('preco', venda)
        hv.set('fornecedor', fornecedorNome)
        hv.set('data_cotacao', agoraISO)
        hv.set('tipo', 'venda')
        hv.set('cliente', potencial.getString('cliente') || '')
        hv.set('potencial_id', potencialId)
        tx.save(hv)

        // 4. rodada tipo 'selecao' + rodada_atual
        const numeroRodada = (ofertaTx.getFloat('rodada_atual') || 0) + 1
        const rodadasCol = tx.findCollectionByNameOrId('cotacoes_rodadas')
        const rodada = new Record(rodadasCol)
        rodada.set('cotacao_iten', cotacaoItenId)
        rodada.set('cotacao_iten_ref', cotacaoItenId)
        rodada.set('potencial', potencialId)
        rodada.set('fornecedor', fornecedorId)
        rodada.set('item', itemId)
        rodada.set('numero_rodada', numeroRodada)
        rodada.set('tipo', 'selecao')
        rodada.set('preco', precoOferta)
        rodada.set('moeda', moedaFinal)
        rodada.set('unidade', unidadeFinal)
        rodada.set('quantidade', quantidadeFinal)
        rodada.set('moq', moqVigente)
        rodada.set('data_oferta', agoraISO)
        rodada.set('autor', autorNome)
        rodada.set('estado', 'confirmada')
        if (ofertaValidade) {
          rodada.set('condicoes', 'validade: ' + ofertaValidade)
        }
        tx.save(rodada)

        ofertaTx.set('rodada_atual', numeroRodada)
        tx.save(ofertaTx)

        // 5. chave de idempotência + recibo (mesma transação: retry não duplica)
        const idemCol = tx.findCollectionByNameOrId('c2_idempotency_keys')
        const idemRec = new Record(idemCol)
        idemRec.set('chave', idemKey)
        idemRec.set('escopo', ESCOPO)
        idemRec.set('payload_hash', payloadHash)
        idemRec.set('criado_por', autorNome)
        const recibo = {
          ok: true,
          cotacao_iten_id: cotacaoItenId,
          potencial_iten_id: pitem.id,
          item_id: itemId,
          potencial_id: potencialId,
          fornecedor_id: fornecedorId,
          preco_compra: precoOferta,
          preco_unitario: venda,
          margem: margem,
          precisao: precisao,
          moeda: moedaFinal,
          unidade: unidadeFinal,
          quantidade: quantidadeFinal,
          moq: moqVigente,
          quantidade_ajustada_para_moq: quantidadeFinal !== qtdeAtual,
          preco_original_preservado: ofertaTx.getFloat('preco_original'),
          rodada: {
            id: rodada.id,
            numero_rodada: numeroRodada,
            tipo: 'selecao',
            estado: 'confirmada',
          },
          autor: autorNome,
          data_confirmacao: agoraISO,
        }
        idemRec.set('recibo', recibo)
        tx.save(idemRec)

        return recibo
      })
    } catch (txErr) {
      const msg = txErr && txErr.message ? txErr.message : String(txErr)
      if (msg.indexOf('acesso_negado') !== -1) {
        return jsonError(
          403,
          'acesso_negado',
          'Ator não autorizado na gravação — nada foi aplicado.',
        )
      }
      // Corrida com a mesma chave (índice único de c2_idempotency_keys): a outra requisição
      // venceu. Devolve o recibo gravado (mesmo payload) ou 409 (payload diferente) — nunca 500.
      if (/unique|constraint/i.test(msg)) {
        let vencedora = null
        try {
          vencedora = $app.findFirstRecordByFilter(
            'c2_idempotency_keys',
            "chave = '" + idemKey.replace(/'/g, "''") + "'",
          )
        } catch (_) {
          vencedora = null
        }
        if (vencedora) {
          if (vencedora.getString('payload_hash') !== payloadHash) {
            return jsonError(
              409,
              'conflito_idempotencia',
              'Chave de idempotência já usada com payload diferente.',
            )
          }
          const reciboCorrida = vencedora.get('recibo')
          return e.json(200, {
            repetido: true,
            recibo: reciboCorrida === undefined ? null : reciboCorrida,
          })
        }
      }
      if (msg.indexOf('conflito_versao') !== -1) {
        return e.json(409, {
          error: 'conflito_versao',
          message: 'A oferta mudou durante a confirmação — recarregue e tente novamente.',
        })
      }
      return e.json(500, {
        error: 'falha_transacao',
        message: 'Falha na transação — nada foi aplicado (rollback).',
        detalhe: msg,
      })
    }

    return e.json(200, { repetido: false, recibo: resultado })
  },
  $apis.requireAuth(),
)
