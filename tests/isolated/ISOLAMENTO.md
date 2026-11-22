# ISOLAMENTO.md — manifesto do harness isolado (`tests/isolated`)

Este harness testa o serviço de confirmação de compra (`pocketbase/hooks/confirmar_compra.js`)
numa instância PocketBase **efêmera e descartável**, sem nunca tocar em preview, produção,
hooks reais, migrations reais ou dados do time.

## Garantias de isolamento

| Dimensão | Garantia |
|---|---|
| Host | somente loopback (`127.0.0.1` / `localhost`); `harness.mjs#assertLoopbackHost` recusa qualquer outro |
| dataDir | diretório temporário **novo e vazio** por execução (`mkdtemp`), removido em `finally` |
| Migrations | **allowlist explícita de estrutura** (`ephemeral-loader.mjs#ALLOWLIST_ESTRUTURA`); nada fora dela é copiado |
| Rede | `network-blocker.mjs` bloqueia rede externa antes de qualquer passo |
| Arquivo real | `verify-real-file.mjs` valida antes e depois da execução que o hook real mantém `requireAuth()` e o `return e.json(503, { error: 'confirmacao_em_validacao' })` como primeira instrução — hash SHA-256 registrado |
| Store global | `suppress-store-review.mjs` faz revisão estática do `c2_suppress_venda` (ver PENDENTE abaixo) |

## Versões

- PocketBase: compatível **v0.36** (API de migrations/hooks usada pelas migrations do repo).
- Node: **>= 18** (módulos ESM `.mjs`, `fetch` nativo).
- A plataforma de hospedagem do projeto **não fornece binário PocketBase**: sem `ISOLATED_PB_PATH`
  apontando para um binário real, `run.mjs` registra cada caso como **NAO EXECUTADO** e sai com
  código 0 — nunca fabrica sucesso.

## Allowlist do loader — lista real

**Permitidas (copiadas para o efêmero; apenas estrutura):**
`0001_create_collections.js`, `0003_create_logs_importacao.js`, `0004_create_potenciais.js`,
`0006_update_metadata.js`, `0011_create_unidades_medida.js`, `0012_create_descricoes_base.js`,
`0013_update_itens_relations.js`, `0015_update_itens_and_fotos.js`, `0019_update_atributos_linha.js`,
`0027_add_indexes.js`, `0028_refine_itens_schema.js`, `0029_add_user_preferences.js`,
`0030_create_ncm_audit_logs.js`, `0031_create_historico_precos.js`, `0035_create_status_potencial.js`,
`0036_create_estagios_potencial.js`, `0037_create_quotation_system.js`, `0038_quotation_enhancements.js`,
`0043_add_tipo_cliente_to_historico_precos.js`, `0046_create_contatos_fornecedor.js`,
`0057_create_solicitacoes_itens_cliente.js`, `0062_mei_quote_nonce_table.js`,
`0063_quotation_v3_zoho_fields.js`, `0064_quotation_rodadas.js`,
`0065_confirmacao_compra_idempotencia.js`, `0066_margem_negociada_cotacoes_itens.js`.

Obs.: destas, 0004, 0011, 0019, 0035, 0036, 0037, 0046, 0063 e 0065 também executam blocos de
dados — todos são **no-op em banco vazio** (loops sobre 0 registros) ou semeiam apenas catálogos
de domínio sintéticos (unidades, status, fornecedores demo). Nenhum dado real do time é criado.

**Bloqueadas (nunca copiadas nem executadas — seed/dados reais):**
`0002_seed_data.js` (catálogo real + itens), `0032_seed_price_history.js` (apaga/reescreve histórico),
`0053_seed_auth_users.js` e `0054_seed_real_team_users.js` (semeiam o time real com e-mails e senha
padrão), `0058_seed_cotacao_6544.js`, `0059_seed_potencial_itens_6544.js`, `0060_seed_cotacao_6546.js`
e `0061` (lançam erro sem o potencial 6544 e gravam dados de produção).

Demais arquivos existentes no repo não listados acima também são **bloqueados por padrão**
(o loader só copia o que está na allowlist).

## Estrutura mínima exigida

O loader aborta com erro explícito (nomeando a coleção ausente) se a allowlist não cobrir:
`users`, `fornecedores`, `itens`, `linhas`, `potenciais`, `potencial_itens`, `potencial_notas`,
`cotacoes_fornecedor`, `cotacoes_itens`, `cotacoes_rodadas`, `historico_precos`,
`c2_idempotency_keys`. **Nunca** cria coleção fake em código.

## Proibições

1. Sem rede externa — só loopback; network-blocker ativo durante toda a execução.
2. Sem tocar em preview ou produção — o efêmero usa dataDir temporário próprio.
3. Sem export de dados/segredos — o loader recusa migrations com segredos, credenciais
   (`Skip@Pass`) ou URLs externas reais.
4. Sem custos/credenciais novas — nenhum usuário real é criado; só usuários sintéticos no efêmero.
5. Sem alteração no arquivo real do candidato — a contenção 503 é removida **apenas na cópia**
   efêmera (`stripContainment`); falha se não encontrar as linhas exatas.
6. A pasta `tests/isolated` **não é aplicada pelo QA automático da plataforma** (não contém
   migrations/hooks); o QA da plataforma não valida `.mjs`.

## Limitação declarada do runner

A plataforma **não tem runner para `.mjs`**: `run_qa` (oxlint/tsc/build) não executa estes testes.
A validação feita nesta plataforma é revisão sintática (`node --check` em cada arquivo). Execução
real exige operador local com binário PocketBase v0.36: `ISOLATED_PB_PATH=/caminho/pocketbase node tests/isolated/run.mjs`.
