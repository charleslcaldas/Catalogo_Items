/**
 * Bloqueio de rede externa para o harness de testes isolados.
 * Estratégias (documentadas; nenhuma é segredo, nenhuma toca rede real do projeto):
 *
 * 1. Bind ONLY loopback: o PocketBase efêmero escuta em 127.0.0.1 — aborta caso
 *    contrário (harness.mjs::assertLoopbackHost).
 * 2. Cliente HTTP do executor usa baseUrl fixa http://127.0.0.1:<porta> — nunca
 *    resolve nomes externos.
 * 3. Bloqueio em container: recomendação documentada abaixo (docker --network=none,
 *    ou firewall egress a partir do processo de teste). Nesta rodada não é aplicado
 *    automaticamente — a plataforma não permite; exige isolamento equivalente no
 *    ambiente de execução.
 * 4. Nenhuma chamada de rede é feita pelo harness para preview/produção: o
 *    endereço do backend real do projeto NUNCA é lido de variáveis de ambiente
 *    aqui; o único host aceito é 127.0.0.1.
 */

export const NETWORK_BLOCKER_DOC = {
  strategy: [
    'bind somente loopback (127.0.0.1) — aborta se o host resolver fora do loopback',
    'cliente HTTP do executor fixado em http://127.0.0.1:<porta>',
    'bloqueio de egress completo é responsabilidade do ambiente de execução (container --network=none ou firewall)',
    'nenhuma URL do backend real do projeto é referenciada no código do harness',
  ],
  description:
    'Bloqueio de rede: escuta/cliente somente em loopback; egress externo depende do container/firewall do ambiente.',
}

export function getNetworkBlockerDoc() {
  return NETWORK_BLOCKER_DOC
}
