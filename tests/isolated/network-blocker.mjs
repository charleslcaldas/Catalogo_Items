// network-blocker.mjs — pré-requisito de ambiente: bloqueio de rede externa.
// A plataforma não garante isso: o harness VERIFICA e aborta se não houver isolamento.
// NÃO EXECUTADO nesta rodada (a plataforma não tem binário PocketBase).
//
// Estratégia recomendada (documentada em ISOLAMENTO.md):
//   docker run --network=none ...   → nenhuma rota externa
//   ou firewall (iptables/nft) negando egress exceto loopback.

import net from 'node:net';

/** Tenta alcançar um host externo de mentira (TEST-NET-1, RFC 5737) com timeout curto.
 *  Retorna true se algo respondeu/conectou — o que indicaria rede externa aberta. */
export function redeExternaAcessivel(timeoutMs = 1_500) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '192.0.2.1', port: 443 });
    const decidir = (aberta) => {
      socket.destroy();
      resolve(aberta);
    };
    socket.setTimeout(timeoutMs, () => decidir(false));
    socket.once('connect', () => decidir(true));
    socket.once('error', () => decidir(false));
  });
}

/** Aborta o harness se houver egress externo. Chamada no início do run.mjs. */
export async function exigirRedeBloqueada() {
  const aberta = await redeExternaAcessivel();
  if (aberta) {
    throw new Error(
      '[ISOLAMENTO] Rede externa acessível (egress não bloqueado). ' +
        'Rode o harness num ambiente sem saída externa (ex.: docker --network=none).'
    );
  }
  return true;
}
