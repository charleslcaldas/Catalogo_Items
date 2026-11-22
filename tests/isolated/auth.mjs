// auth.mjs — login sintético no EFÊMERO via /api/collections/users/auth-with-password.
// Nada de credenciais reais: usuários criados pelo próprio harness via API.
// NÃO EXECUTADO nesta rodada (a plataforma não tem binário PocketBase).

import { USUARIOS_SINTETICOS, SENHA_SINTETICA } from './fixtures.mjs';

/** Cria os usuários sintéticos no efêmero (via users/create do próprio PB). */
export async function criarUsuariosSinteticos(baseUrl) {
  const criados = [];
  for (const u of USUARIOS_SINTETICOS) {
    const resp = await fetch(new URL('/api/collections/users/records', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: u.email, password: SENHA_SINTETICA, passwordConfirm: SENHA_SINTETICA, name: u.name }),
    });
    if (!resp.ok) {
      throw new Error(`[auth] Falha ao criar usuário sintético ${u.email}: HTTP ${resp.status} ${await resp.text()}`);
    }
    const rec = await resp.json();
    criados.push({ ...u, id: rec.id });
  }
  return criados;
}

/** Login sintético; devolve token + id. Sem e-mail verificado exigido no efêmero. */
export async function loginSintetico(baseUrl, email, senha = SENHA_SINTETICA) {
  const resp = await fetch(new URL('/api/collections/users/auth-with-password', baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identity: email, password: senha }),
  });
  if (!resp.ok) {
    throw new Error(`[auth] Login sintético falhou para ${email}: HTTP ${resp.status}`);
  }
  const corpo = await resp.json();
  return { token: corpo.token, id: corpo.record?.id, email };
}

/** Login dos dois atores do harness: team e mei. */
export async function autenticarAtores(baseUrl, usuarios) {
  const porPapel = Object.fromEntries(usuarios.map((u) => [u.papel, u]));
  const team = await loginSintetico(baseUrl, porPapel.team.email);
  const mei = await loginSintetico(baseUrl, porPapel.mei.email);
  return { team, mei };
}

/** Chamada autenticada à rota de confirmação no efêmero. */
export async function postConfirmacao(baseUrl, token, payload) {
  return fetch(new URL('/backend/v1/confirmar-compra', baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: token },
    body: JSON.stringify(payload),
  });
}
