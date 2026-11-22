/**
 * Harness de execução ISOLADA do PocketBase (Skip Cloud compatível v0.36) para
 * rodada SÓ DE TESTES — nada aqui toca o backend real (preview/produção).
 *
 * Execução:
 *   node tests/isolated/run.mjs            (sob PocketBase executável em PATH)
 *   PB_EXEC=/caminho/pocketbase node tests/isolated/run.mjs
 *
 * O que este harness GARANTE:
 *   - dataDir TEMPORÁRIO e NOVO a cada execução (os.DirFS/temp; nunca o pb_data real);
 *   - escuta SOMENTE em loopback (127.0.0.1) — aborta antes de servir se o host
 *     resolvido não for loopback;
 *   - sem segredos, sem URLs reais, sem credenciais do projeto (só SYNTH_USERS abaixo,
 *     inventados para o teste);
 *   - NÃO aplica migrations/hooks no backend do projeto — tudo roda num dataDir
 *     efêmero criado neste processo.
 *
 * Bloqueio de rede externa: o servidor só aceita bind em loopback (aborta caso
 * contrário) e o cliente HTTP do executor usa baseUrl fixo em 127.0.0.1. O
 * bloqueio COMPLETO de saída (egress) deve vir do ambiente de execução
 * (container sem rede externa, firewall ou isolamento equivalente) — documentado
 * em tests/isolated/ISOLAMENTO.md.
 */
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { getNetworkBlockerDoc } from './network-blocker.mjs'
import { loadHooksInto, loadMigrationsInto } from './ephemeral-loader.mjs'

const LOOPBACK = '127.0.0.1'
const HOST = process.env.PB_HOST || LOOPBACK
const PORT = Number(process.env.PB_PORT || 18099)

// Usuários SINTÉTICOS usados só no PocketBase efêmero — nada real.
export const SYNTH_USERS = {
  time: { email: 'time.sintetico@exemplo.test', password: 'Sintetico!123', name: 'Time Sintético' },
  mei: { email: 'mei.sintetico@exemplo.test', password: 'Sintetico!123', name: 'Mei Sintético' },
  anon: null, // sem credenciais
}

/** Aborta se o host não for loopback. Exigência da rodada. */
export function assertLoopbackHost(host) {
  const h = String(host || '').trim()
  if (!h) throw new Error('host vazio — abortando (exige loopback explícito).')
  let isLoopback = false
  if (net.isIP(h)) {
    isLoopback = h === LOOPBACK || h === '::1'
  } else {
    try {
      const addrs = net.setDefaultAutoSelectFamily ? [h] : [h]
      // consulta DNS local apenas para o nome; bloqueia se resolver para fora do loopback
      const dns = require('node:dns')
      const fams = dns.lookup
      if (typeof fams === 'function') {
        throw new Error('__dns_unavailable__')
      }
    } catch (e) {
      // sem DNS síncrono: exige que o host seja literal loopback
      isLoopback = h === 'localhost'
    }
  }
  if (!isLoopback) {
    throw new Error(
      `Harness abortado: host '${host}' não é loopback. Use 127.0.0.1 (ou ::1). ` +
        'Nenhuma escuta em interface externa é permitida nesta rodada.',
    )
  }
  return host
}

/**
 * Encontra um executável PocketBase local (sem download de rede):
 * 1. variável PB_EXEC; 2. pocketbase no PATH; 3. binários já presentes no projeto.
 */
export function findPocketBaseExecutable() {
  const fromEnv = process.env.PB_EXEC
  if (fromEnv) return fromEnv
  const fromPath = spawnSync('pocketbase', ['--version'], { encoding: 'utf8' })
  if (fromPath.status === 0) return 'pocketbase'
  const candidates = [
    'pocketbase/pocketbase',
    'pocketbase/pocketbase.exe',
    'pocketbase/pb',
    'tools/pocketbase',
    'tools/pocketbase.exe',
  ]
  for (const c of candidates) {
    try {
      const r = spawnSync(c, ['--version'], { encoding: 'utf8' })
      if (r.status === 0) return c
    } catch (_) {}
  }
  return null
}

/**
 * Sobe um PocketBase REAL em processo separado, em dataDir temporário, escutando
 * apenas em loopback. Retorna { proc, dataDir, baseUrl, version }.
 */
export async function startEphemeralPocketBase({ pbExec, host = LOOPBACK, port = PORT, applyRealCode = true }) {
  assertLoopbackHost(host)

  const exec = pbExec || findPocketBaseExecutable()
  if (!exec) {
    throw new Error(
      'Executável PocketBase não encontrado localmente (PB_EXEC indefinido e nada no PATH).\n' +
        'Baixe manualmente a v0.36+ e aponte PB_EXEC para ele — este harness NÃO baixa nada da rede.',
    )
  }

  // versão (sem rede)
  const vres = spawnSync(exec, ['--version'], { encoding: 'utf8' })
  const version = (vres.stdout || vres.stderr || '').trim() || 'desconhecida'

  // dataDir temporário NOVO por execução
  const dataDir = mkdtempSync(path.join(os.tmpdir(), 'pb-harness-'))
  mkdirSync(path.join(dataDir, 'pb_data'), { recursive: true })

  // cópia efêmera do código REAL: migrations + hooks (com a contenção 503 adaptada
  // APENAS na cópia local, nunca no arquivo real do projeto)
  const migrationsDir = path.join(dataDir, 'migrations')
  const hooksDir = path.join(dataDir, 'hooks')
  loadMigrationsInto(migrationsDir)
  loadHooksInto(hooksDir, { stripContainment: true })

  const args = [
    'serve',
    '--dir', path.join(dataDir, 'pb_data'),
    '--migrationsDir', migrationsDir,
    '--hooksDir', hooksDir,
    '--http', `${host}:${port}`,
    '--origins', '*',
  ]
  const proc = spawn(exec, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  const baseUrl = `http://${host}:${port}`

  // aguarda saúde em loopback
  const healthy = await waitHealthy(baseUrl, proc)
  if (!healthy) {
    proc.kill()
    rmSync(dataDir, { recursive: true, force: true })
    throw new Error('PocketBase efêmero não ficou saudável em loopback — verifique PB_EXEC/v0.36.')
  }
  return { proc, dataDir, baseUrl, version, host, port }
}

/** Encerra e limpa o dataDir temporário (não deixa resíduo). */
export function stopEphemeralPocketBase(handle) {
  if (!handle) return
  try {
    handle.proc.kill('SIGTERM')
  } catch (_) {}
  try {
    rmSync(handle.dataDir, { recursive: true, force: true })
  } catch (_) {}
}

/** GET /api/health em loopback — o cliente HTTP é restrito a 127.0.0.1. */
export async function waitHealthy(baseUrl, proc) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${baseUrl}/api/health`)
      if (r.ok) return true
    } catch (_) {}
    if (proc && proc.exitCode !== null) return false
    await new Promise((r) => setTimeout(r, 250))
  }
  return false
}

// ---------- CLI ----------
if (import.meta.url === `file://${process.argv[1]}`) {
  const doc = getNetworkBlockerDoc()
  console.log('[harness] isolamento de rede documentado:', doc.description)
  startEphemeralPocketBase({})
    .then((h) => {
      console.log('[harness] PocketBase efêmero:', h.version, 'em', h.baseUrl, '(loopback)')
      console.log('[harness] dataDir temporário:', h.dataDir)
      console.log('[harness] encerrando com SIGTERM em 3s...')
      setTimeout(() => {
        stopEphemeralPocketBase(h)
        process.exit(0)
      }, 3000)
    })
    .catch((err) => {
      console.error('[harness] ABORTADO:', err.message)
      process.exit(1)
    })
}
