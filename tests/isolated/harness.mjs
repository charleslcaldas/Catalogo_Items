// harness.mjs — infraestrutura do servidor PocketBase EFÊMERO para o harness isolado.
// NÃO EXECUTADO nesta rodada (a plataforma não tem binário PocketBase).
// Regras de isolamento: bind SOMENTE em loopback, dataDir temporário novo, aborta em host não-loopback.

import { spawn } from 'node:child_process';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { isLoopbackAddress } from 'node:net';

export const POCKETBASE_VERSION_ESPERADA = 'v0.36.x';
export const NODE_VERSION_ESPERADA = '>=20';

// Porta fixa alta em loopback — evita colisão com preview/produção.
export const PORTA_LOOPBACK = 8_091;
export const BASE_URL_PADRAO = `http://127.0.0.1:${PORTA_LOOPBACK}`;

/** Aborta se o host NÃO for loopback (defesa contra bind em interface pública). */
export function assertLoopbackHost(hostname) {
  const host = String(hostname || '');
  const ok =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    (/\d+\.\d+\.\d+\.\d+/.test(host) && isLoopbackAddress(host));
  if (!ok) {
    throw new Error(
      `[ISOLAMENTO] Host "${host}" não é loopback. O harness só pode bindar em 127.0.0.1/localhost/::1.`
    );
  }
  return host;
}

/** Cria um dataDir temporário NOVO (nunca reutiliza) e devolve caminhos do efêmero. */
export async function criarDataDirEfemero(raiz = tmpdir()) {
  const dataDir = await mkdtemp(path.join(raiz, 'pb-efemero-'));
  await mkdir(path.join(dataDir, 'pb_migrations'), { recursive: true });
  await mkdir(path.join(dataDir, 'pb_hooks'), { recursive: true });
  return { dataDir, migrationsDir: path.join(dataDir, 'pb_migrations'), hooksDir: path.join(dataDir, 'pb_hooks') };
}

/** Sobe o PocketBase apontando para o dataDir efêmero, bindado em loopback. */
export async function iniciarServidor({
  pbExec,
  dataDir,
  host = '127.0.0.1',
  port = PORTA_LOOPBACK,
  timeoutMs = 30_000,
}) {
  assertLoopbackHost(host);
  if (!pbExec) throw new Error('[ISOLAMENTO] PB_EXEC não definido: informe o binário pocketbase do ambiente local.');

  // Logs do efêmero vão para arquivos do próprio dataDir (nunca no repositório).
  const logPath = path.join(dataDir, 'efemero.log');
  const logFd = await writeFile(logPath, '');

  const child = spawn(pbExec, ['serve', `--http=${host}:${port}`, `--dir=${dataDir}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PB_ISOLATED_HARNESS: '1' },
  });

  child.stdout.on('data', (chunk) => process.stdout.write(`[pb] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[pb!] ${chunk}`));

  // Garante teardown mesmo se o teste interromper.
  process.on('exit', () => {
    try { child.kill('SIGKILL'); } catch { /* best effort */ }
  });

  const pronto = await esperarPronto(BASE_URL_PADRAO, timeoutMs);
  if (!pronto) {
    child.kill('SIGKILL');
    throw new Error(`[ISOLAMENTO] PocketBase não ficou pronto em ${BASE_URL_PADRAO} após ${timeoutMs}ms`);
  }

  return {
    child,
    baseUrl: BASE_URL_PADRAO,
    dataDir,
    logPath,
    encerrar: async () => {
      child.kill('SIGKILL');
      await rm(dataDir, { recursive: true, force: true });
    },
  };
}

/** Health check simples contra o efêmero. */
export async function esperarPronto(baseUrl, timeoutMs = 30_000) {
  const fim = Date.now() + timeoutMs;
  while (Date.now() < fim) {
    try {
      const resp = await fetch(new URL('/api/health', baseUrl));
      if (resp.ok) return true;
    } catch { /* ainda não subiu */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}
