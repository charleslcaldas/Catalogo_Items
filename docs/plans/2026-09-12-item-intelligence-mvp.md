# Plano: Inteligência de itens — MVP local do Skip

> Criado em 2026-09-12. Status: protótipo local implementado e aprovado em revisão independente; implantação bloqueada até confirmar a versão do PocketBase de produção.
> Branch: `prototype/item-intelligence-mvp`.
> Limites: sem deploy, sem push, sem escrita na produção e sem criação de pastas no WorkDrive.

## Objetivo

Construir e verificar localmente a menor evolução do Skip que permita visualizar e relacionar um item C2 a códigos e descrições de clientes e fornecedores, distinguir quatro tipos de histórico comercial e consultar documentos técnicos vinculados ao WorkDrive, preservando validação humana e compatibilidade com o sistema atual.

## Sucesso

- [x] A descrição normal permanece a única descrição oficial C2; nenhum campo duplicado de negócio foi criado.
- [x] O schema local define clientes, vínculos externos e documentos com histórico de revisão sem alterar dados reais.
- [x] Código externo é preservado como recebido e recebe uma chave normalizada separada para busca exata.
- [x] Vínculos têm estados `proposto`, `validado`, `rejeitado` e `inativo`, com responsável e data de validação.
- [x] A interface da ficha do item exibe abas para parceiros, preços/negócios e documentos/aplicações.
- [x] Os quatro fatos ficam distinguíveis: cotação de fornecedor, compra real, cotação ao cliente e venda real.
- [x] Registros reais do Books são tratados como referências da fonte oficial, não como edição financeira no Skip.
- [x] Testes automatizados, lint, formatação, build e verificação das migrations passam localmente.
- [x] `git status` comprova branch local sem push ou deploy.

## Tarefas

### Fase 1 — Baseline e testes

- [x] **T1.1** Mapear schema, formulário do item, histórico e regras atuais.
  - Verificação: inventário de componentes e migrations documentado neste plano.
  - Depende de: nenhuma.
- [x] **T1.2** Instalar/configurar Vitest para funções puras do domínio.
  - Verificação: teste sentinela falha pelo motivo esperado e depois passa.
  - Depende de: T1.1.
- [x] **T1.3** Registrar baseline de instalação, lint e build.
  - Verificação: saídas reais salvas no estado do plano.
  - Depende de: T1.1.

### Fase 2 — Vínculos externos

- [x] **T2.1** Criar teste de normalização de códigos preservando o valor original.
  - Verificação: casos de espaços, pontuação e caixa falham antes e passam depois.
  - Depende de: T1.2.
- [x] **T2.2** Implementar normalização e busca exata por empresa.
  - Verificação: testes unitários passam.
  - Depende de: T2.1.
- [x] **T2.3** Criar migration local para `clientes`, `item_clientes` e `item_fornecedores`.
  - Verificação: schema estático e rollback validados; nenhuma chamada à produção.
  - Depende de: revisão de schema.
- [x] **T2.4** Adicionar leitura dos vínculos à ficha do item.
  - Verificação: componente renderiza estados e origem sem permitir escrita automática.
  - Depende de: T2.2 e T2.3.

### Fase 3 — Históricos

- [x] **T3.1** Criar teste de classificação dos quatro tipos de eventos.
  - Verificação: valores legados `compra`/`venda` mantêm compatibilidade e novos tipos são distintos.
  - Depende de: T1.2.
- [x] **T3.2** Criar `item_eventos_comerciais` separado do `historico_precos` legado.
  - Verificação: migration não sobrescreve eventos antigos, bloqueia escrita pela API e permite deduplicação por origem.
  - Depende de: T3.1.
- [x] **T3.3** Exibir quatro cartões de última referência e uma linha histórica unificada.
  - Verificação: teste de interface comprova que um evento novo anterior ao cartão mais recente aparece junto do registro legado, em ordem decrescente, com tipo, origem/chave ou registro e contraparte distinguíveis.
  - Depende de: T3.2.

### Fase 4 — Documentos

- [x] **T4.1** Criar migration para `documentos`, `documento_revisoes` e `documento_vinculos`.
  - Verificação: revisão antiga nunca é sobrescrita; link do WorkDrive é validável como URL.
  - Depende de: revisão de schema.
- [x] **T4.2** Exibir documentos e aplicação na ficha do item.
  - Verificação: revisão vigente, origem e link ficam visíveis; nenhuma pasta é criada.
  - Depende de: T4.1.

### Fase 5 — Verificação

- [x] **T5.1** Rodar testes, lint, formatação e build completos.
  - Verificação: todos retornam exit 0.
  - Depende de: fases 2–4.
- [~] **T5.2** Revisar segurança e diff.
  - Verificação: novas coleções não têm exclusão pública; busca por segredo zero; `git diff --check` passa.
  - Depende de: T5.1.
- [ ] **T5.3** Documentar o que foi implementado e o que continua pendente de produção.
  - Verificação: relatório distingue protótipo local de implantação real.
  - Depende de: T5.2.

## Dependências externas

- PocketBase local ou validação estática equivalente para executar migrations sem produção.
- Acesso futuro ao WorkDrive para conferir e criar `Produto > 00 - BASE TÉCNICA SKIP`; fora deste escopo.
- Mapeamento futuro do Zoho Books para compras e vendas reais; o MVP apenas prepara referências.

## Riscos

- **Regras atuais de acesso são amplas** — mitigação: novas coleções começam com leitura autenticada e escrita bloqueada, até definição de perfis.
- **Campos legados duplicados de descrição** — mitigação: manter compatibilidade; não remover nem criar segunda descrição de negócio no MVP.
- **Misturar proposta com transação real** — mitigação: tipos e fontes explícitos, com IDs externos para deduplicação.
- **Quebrar a tela grande do item** — mitigação: componentes novos isolados e testes antes da integração.
- **Migration irreversível** — mitigação: `down` completo e teste local em base descartável.

## Estado atual

- Cópia local em `/root/work/Catalogo_Items`, na branch `prototype/item-intelligence-mvp`, baseada no commit `0597808`.
- Vitest configurado; suíte atual com 8 arquivos e 37 testes aprovados.
- A migration `0050_create_item_intelligence_mvp.js` foi aplicada, inspecionada e revertida num PocketBase 0.40.4 local com banco descartável.
- A versão exata do PocketBase de produção ainda precisa ser confirmada antes de qualquer implantação.
- `tsc -b`, formatação, lint, build, sintaxe JavaScript e `git diff --check` passaram.
- A revisão independente final, em modo fail-closed, aprovou o protótipo sem preocupações de segurança nem erros de lógica bloqueantes.
- O lint mantém os 56 avisos que já existiam no baseline e não apresentou erro novo.
- `ItemDetailPanel.tsx` agora apresenta quatro abas de negócio; Português e Inglês permanecem dentro de **Dados C2**.
- `historico_precos` permanece legado e somente leitura; os quatro fatos novos ficam em `item_eventos_comerciais`.
- O histórico comercial agora reúne fatos novos e referências legadas por data decrescente, incluindo eventos anteriores aos quatro cartões de última referência, sem promover legado a transação real.
- Ausência de coleção opcional só vira lista vazia para `ClientResponseError` 404; falhas de autorização e rede são relançadas, capturadas pelo hook e exibidas como alerta não sensível na ficha do item.
- `descr_pt` e `descricao_catalogo_pt` foram preservados por compatibilidade, sem criar uma segunda descrição oficial C2.
- O cliente PocketBase adicionado ao protótipo contém somente operações de leitura `getFullList` e `getList`; `item_eventos_comerciais` retorna até 100 registros recentes e `historico_precos` mantém o limite de 50, sem `create`, `update` ou `delete`.
- Nenhum commit, push, deploy, escrita no Skip de produção ou criação de pasta no WorkDrive foi realizado.
