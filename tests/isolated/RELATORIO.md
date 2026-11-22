# RELATORIO.md — casos do harness isolado (confirmação de compra)

Status possíveis por caso: `PREPARADO` (código e payload prontos), `EXECUTADO`,
`PASSOU`, `FALHOU`, `PENDENTE`, `NAO EXECUTADO`.

**Situação desta rodada: TODOS os casos estão NAO EXECUTADO.** A plataforma de
hospedagem não fornece runtime PocketBase nem runner para `.mjs` — `run_qa`
(oxlint/tsc/build) não executa estes testes. Nenhum sucesso foi fabricado.

Base: v0.0.268 (commit 94b1dc0). Runtime exigido: PocketBase compatível v0.36, Node >= 18.
Comando local: `ISOLATED_PB_PATH=/caminho/pocketbase node tests/isolated/run.mjs`.

## Matriz

| # | Caso | O que prova | Status |
|---|---|---|---|
| AUTH-01 | Sem credenciais → 401 | requireAuth como middleware antes de qualquer lógica | NAO EXECUTADO |
| AUTH-02 | Mei (meiqw9s6c4r2t8a) com credenciais → 403/negado | Mei não é papel do time; negar por padrão | NAO EXECUTADO |
| AUTH-03 | Time autenticado (não-Mei) → segue | Espelho explícito das API rules | NAO EXECUTADO |
| COL-01 | Coleção errada / id inexistente | Erro explícito, sem criação implícita | NAO EXECUTADO |
| REL-01 | Cadeia oferta→cf→potencial→potencial_iten incoerente | Controle por registro; negado | NAO EXECUTADO |
| REL-02 | Cadeia coerente | Permitido para o time | NAO EXECUTADO |
| MARG-01 | margem_negociada = 12 persistida | Venda usa EXCLUSIVAMENTE a margem autoritativa (não 7,5) | NAO EXECUTADO |
| MARG-02 | margem_negociada ausente | Pendência explícita — sem fallback para margem_padrao/7,5 | NAO EXECUTADO |
| MARG-03 | margem_versao adulterada (stale) | Concorrência otimista: rejeita (412/pendência), não aplica | NAO EXECUTADO |
| PREC-01 | precisao_negociada = 2 | Venda arredondada com 2 casas, persistida | NAO EXECUTADO |
| PREC-02 | precisao_negociada = 3 | 3 casas, persistida | NAO EXECUTADO |
| PREC-03 | precisão ausente/1/4 | pendência (precisao_invalida/precisao_ausente), sem default | NAO EXECUTADO |
| NEGO-01 | alvo sem resposta → negado | Sem oferta selecionada/resposta: não confirma | NAO EXECUTADO |
| NEGO-02 | resposta confirmada igual ao alvo → permitida | Confirma quando oferta == alvo | NAO EXECUTADO |
| ROLL-01 | Rollback forçado após cada escrita | Sem resíduos em cotacoes_itens/rodadas/historico/idempotency | NAO EXECUTADO |
| REC-01 | Recibo por ator/escopo | recibo vinculado ao ator e ao escopo da operação | NAO EXECUTADO |
| IDEM-01 | Retry sequencial com mesma chave | Mesmo recibo (idempotente), sem dupla escrita | NAO EXECUTADO |
| IDEM-02 | Retry simultâneo (2 requisições) | Uma confirma, outra aguarda/retorna mesmo recibo | NAO EXECUTADO |
| IDEM-03 | Mesma chave, payload divergente | payload_hash ≠ → rejeitado (409/pendência) | NAO EXECUTADO |
| HIST-01 | Evento 'compra' único no histórico | Exatamente 1 registro por confirmação | NAO EXECUTADO |
| HIST-02 | Evento 'venda' único no histórico | Exatamente 1 registro; margem da fonte autoritativa | NAO EXECUTADO |
| CAT-01 | Catálogo (itens/linhas/categorias) intocado | Nenhuma escrita fora do escopo da confirmação | NAO EXECUTADO |
| DOM-01 | moeda/unidade/MOQ/validade da oferta | Respeitados no cálculo e no recibo | NAO EXECUTADO |
| LEG-01 | Histórico legado ausente | Tratado como pendência, não como erro/criação silenciosa | NAO EXECUTADO |
| STORE-01 | store global c2_suppress_venda (revisão estática) | Isolamento entre requisições concorrentes | PENDENTE |

## Pendência explícita — store global `c2_suppress_venda`

O hook candidato usa o **store global do servidor** para suprimir o logger
legado durante a venda. Store global é compartilhado entre requisições
concorrentes: se a limpeza da chave não estiver em `finally`, uma requisição
lenta pode suprimir (ou deixar de suprimir) o logger de outra. A revisão estática
(`suppress-store-review.mjs`) verifica a presença de `finally` com gravação
`false`, mas **a prova só vale em runtime real com requisições concorrentes** —
caso STORE-01 fica **PENDENTE** até essa prova. (Nota de rodada anterior: a
supressão legítima é por chave no store do servidor, nunca por flag do cliente.)

## Não executado — por quê e como executar

- A plataforma (Skip Cloud) não expõe binário PocketBase nem runner de `.mjs`;
  `run_qa` cobre apenas oxlint/tsc/build do app React.
- Validação feita nesta rodada: revisão sintática `node --check` em **todos**
  os `.mjs` de `tests/isolated/`.
- Execução real (operador local, sem tocar em preview/produção):
  `ISOLATED_PB_PATH=/caminho/pocketbase node tests/isolated/run.mjs`
  — cria dataDir temporário, aplica a allowlist de estrutura, bloqueia rede
  externa e registra cada caso como PASSOU/FALHOU (candidato que falha aparece
  como FALHOU, nunca maquiado).
