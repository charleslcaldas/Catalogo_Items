# Snapshot Pré-Migration 0058 (Verificação do Banco de Dados)

Data: 2026-10-06 (ou data da execução corrente)
Autorização: Charles (Etapa 2 - Cotação 6544)

## 1. Coleções Relevantes e Estado Atual

### 1.1 `potenciais`

- Filtro: `numero_potencial = '6544'`
- Resultado: 0 registros encontrados (ausência confirmada).
- Coleção schema:
  - Campos: numero_potencial (text required), cliente (text required), status (text required), created, updated, observacoes, nome_potencial, proprietario, nome_comprador, notas, anexos, estagio_id, incoterm_cliente, condicao_pagamento_cliente, tempo_fabricacao_cliente.
  - Regra list/view: `@request.auth.id != ''`

### 1.2 `solicitacoes_itens_cliente`

- Coleção criada pela migration `0057_create_solicitacoes_itens_cliente.js` (já aplicada no ledger).
- Contagem atual de registros: 0 registros (coleção completamente vazia).
- Regras API:
  - listRule: `@request.auth.id != "" && @request.auth.collectionName = "users"`
  - viewRule: `@request.auth.id != "" && @request.auth.collectionName = "users"`
  - createRule: `null`
  - updateRule: `null`
  - deleteRule: `null`
- Índices:
  - `idx_solicitacoes_chave` (UNIQUE) em `chave_idempotencia`
  - `idx_solicitacoes_potencial` em `potencial_id`

### 1.3 `itens` candidatos validados

- Item 1: `id = '0px68nl5c8hhu6i'`
  - SKU: `F814-M6`
  - descr_pt: `[INOX304] Arruela Lisa DIN 125A - M6 /Polido`
  - descr_en: `[SS304] Flat Washer DIN 125A - M6 /Plain`
  - ativo: `true`
- Item 2: `id = 'av4beuyogi2sn0t'`
  - SKU: `F390-3020-YZ`
  - descr_pt: `Parafuso Chipboard Cabeça Panela Phillips Rosca Inteira - 3.0 x 20 /Zincado Amarelo`
  - descr_en: `Chipboard Screw Pan Head Phillips Full Thread - 3.0 x 20 /Yellow Zinc`
  - ativo: `true`
- Item 3: `id = 'ukyydz83fogn8g3'`
  - SKU: `FLA20701`
  - descr_pt: `Parafuso Sextavado ASME B 18.2.1 Gr 2 UNC Rosca Inteira - 5/16 X 5/8" /Zincado Branco`
  - descr_en: `Hex Bolt ASME B 18.2.1 Gr 2 UNC Full Thread - 5/16 X 5/8" /Zinc Plated`
  - ativo: `true`

### 1.4 `potencial_itens`

- Não possui registros vinculados à cotação 6544 (o cabeçalho 6544 sequer existe).

## 2. Ledger de Migrações

- Migração mais recente aplicada: `0057_create_solicitacoes_itens_cliente.js`.
- Próxima migration ordinal esperada: `0058`.
- Nenhum arquivo conflitante `0058_*` encontrado previamente.

## 3. Refs de Deploy (.skip.config.json)

- lastDevBuildRef: `27566d0`
- lastProdBuildRef: `7cd8cc4`
- lastPublishedRef: `646d422`
