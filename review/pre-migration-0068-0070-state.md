# Estado pré-migrations 0068–0070 — PREVIEW (antes da aplicação)

Data: 2026-11-25 · Ledger vigente termina em 0067 (aplicada). Produção não recebe estas migrations.

Snapshot capturado via db_describe_object + db_query (contagens; sem conteúdo de registros de negócio).

## Contagens de registros (antes)

| Coleção             | Registros |
| ------------------- | --------- |
| users               | 7         |
| cotacoes_rodadas    | 0         |
| c2_idempotency_keys | 0         |

## users (auth)

Campos: name (text), avatar (file), preferencias_ui (json), created/updated (autodate).
Sem pode_confirmar_compra antes de 0069.

Regras API (todas excluem o usuário de integração meiqw9s6c4r2t8a):

- list: ((id = @request.auth.id) && @request.auth.id != "meiqw9s6c4r2t8a")
- view: ((id = @request.auth.id) && @request.auth.id != "meiqw9s6c4r2t8a")
- create: (((1 = 1) && @request.auth.id != "meiqw9s6c4r2t8a") && @request.body.id != "meiqw9s6c4r2t8a") ← cadastro público aberto (auth != '' não exigido)
- update: ((id = @request.auth.id) && @request.auth.id != "meiqw9s6c4r2t8a")
- delete: ((id = @request.auth.id) && @request.auth.id != "meiqw9s6c4r2t8a")

Índices: idx*tokenKey\_\_pb_users_auth* (tokenKey unique), idx*email\_\_pb_users_auth* (email unique WHERE email != '').

## cotacoes_rodadas (base)

Campos: cotacao_iten (relation→cotacoes_itens, required), potencial (relation→potenciais),
fornecedor (relation→fornecedores), item (relation→itens), numero_rodada (number),
tipo (select: oferta_original|contraproposta_c2|resposta_fabricante|oferta_confirmada|selecao),
preco (number), moeda (text), unidade (text), quantidade (number), moq (number),
data_oferta (date), autor (text), estado (select: rascunho|aguardando|recebida|confirmada|recusada|reaberta),
condicoes (text), observacoes (text), anexos (file), cotacao_iten_ref (text), created/updated (autodate).

Sem validade_oferta / incoterm / condicao_pagamento / tempo_fabricacao antes de 0070.

Regras API (list/view/create/update/delete):
((@request.auth.id != '') && @request.auth.id != "meiqw9s6c4r2t8a")

## c2_idempotency_keys (base)

Campos: chave (text, required), escopo (text, required), payload_hash (text, required),
recibo (json), criado_por (text), created/updated (autodate).

Índices: idx_c2_idem_chave (chave unique), idx_c2_idem_escopo (escopo, created).

Regras API (list/view/create/update/delete):
((@request.auth.id != '') && @request.auth.id != "meiqw9s6c4r2t8a")

## Observações

- Nenhum grant de permissão a usuários reais nesta etapa (pode_confirmar_compra fica default false).
- Nenhuma contagem/dado de negócio é alterado pelas migrations propostas.
