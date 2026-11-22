// run.mjs — orquestrador do harness isolado (testes de confirmação de compra).
// Pré-condições duras:
//   1. host loopback (recusa qualquer outro);
//   2. dataDir temporário NOVO e vazio (removido ao final);
//   3. rede externa bloqueada (network-blocker);
//   4. SEM binário PocketBase nesta plataforma: nenhum caso é executado —
//      cada caso da matriz é registrado como NAO EXECUTADO (nunca sucesso fabricado).

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { assertLoopbackHost } from './harness.mjs';
import { ALLOWLIST_ESTRUTURA, copiarMigrationsEstrutura, copiarHookCandidato, RAIZ } from './ephemeral-loader.mjs';
import { bloquearRede } from './network-blocker.mjs';
import { MATRIZ_CASOS } from './cases.mjs';
import { exigirArquivoRealIntacto, CAMINHO_CANDIDATO } from './verify-real-file.mjs';
import { revisarStoreSuppress } from './suppress-store-review.mjs';

const POCKETBASE_DISPONIVEL = Boolean(process.env.ISOLATED_PB_PATH); // binário real, se o operador tiver

/** Executa UM caso contra o efêmero (só com runtime PocketBase real). */
async function executarCaso(caso, ctx) {
  // Fluxo completo (só roda com POCKETBASE_DISPONIVEL):
  // fixtures -> usuarios sinteticos -> login dos atores -> chamada à rota
  // com o payload do caso -> verificação de resíduos/rollback via pb-client.
  const { criarUsuariosSinteticos, autenticarAtores, postConfirmacao } = await import('./auth.mjs');
  const { montarPayload } = await import('./fixtures.mjs');

  await exigirArquivoRealIntacto(RAIZ, null);
  const usuarios = await criarUsuariosSinteticos(ctx.baseUrl);
  const atores = await autenticarAtores(ctx.baseUrl, usuarios);
  const payload = montarPayload(caso, atores);
  const resp = await postConfirmacao(ctx.baseUrl, atores.team.token, payload);
  return { status: resp.status, corpo: await resp.json().catch(() => null) };
}

async function main() {
  // ---------- 1. invariante do arquivo real (leitura, nunca escrita) ----------
  const integridade = await exigirArquivoRealIntacto(RAIZ, null);
  console.log(`[run] ${CAMINHO_CANDIDATO}: requireAuth=${integridade.temRequireAuth} 503_1ª_instrução=${integridade.tem503Primeira} (hash ${integridade.hash.slice(0, 12)})`);

  // ---------- 2. host loopback ----------
  const baseUrl = process.env.ISOLATED_BASE_URL || 'http://127.0.0.1:8090';
  assertLoopbackHost(baseUrl);

  // ---------- 3. rede externa bloqueada ----------
  const rede = await bloquearRede();
  console.log('[run] bloqueio de rede externa ativo');

  // ---------- 4. dataDir temporário novo e vazio ----------
  const dataDir = await mkdtemp(join(tmpdir(), 'c2-isolated-'));
  try {
    const migrations = await copiarMigrationsEstrutura(dataDir);
    console.log(`[run] allowlist: ${migrations.copiadas.length} migrations de estrutura copiadas; ${migrations.bloqueadas.length} bloqueadas (seed/dados)`);
    await copiarHookCandidato(dataDir, { stripContainment: true });

    // ---------- 5. execução (ou registro NAO EXECUTADO) ----------
    const resultados = [];
    for (const caso of MATRIZ_CASOS) {
      if (!POCKETBASE_DISPONIVEL) {
        resultados.push({ id: caso.id, titulo: caso.titulo, status: 'NAO EXECUTADO', motivo: 'runtime PocketBase indisponível nesta plataforma (nenhum binário; ISOLATED_PB_PATH não definido)' });
        continue;
      }
      try {
        const r = await executarCaso(caso, { baseUrl, dataDir });
        resultados.push({ id: caso.id, titulo: caso.titulo, status: 'EXECUTADO', resultado: r });
      } catch (erro) {
        resultados.push({ id: caso.id, titulo: caso.titulo, status: 'FALHOU', erro: String(erro && erro.message || erro) });
      }
    }

    // ---------- 6. revisão estática do store global ----------
    const store = await revisarStoreSuppress();
    const casoStore = {
      id: 'STORE-01',
      titulo: 'store global c2_suppress_venda — isolamento entre requisições concorrentes',
      status: 'PENDENTE',
      achados: store.achados,
      motivo: 'prova exige runtime PocketBase real com requisições concorrentes',
    };
    resultados.push(casoStore);

    // ---------- 7. reconfirmação do arquivo real (pós-execução) ----------
    await exigirArquivoRealIntacto(RAIZ, integridade.hash);

    // ---------- 8. saída ----------
    console.log('\n=== MATRIZ DO HARNESS ISOLADO ===');
    for (const r of resultados) {
      console.log(`[${r.status}] ${r.id} — ${r.titulo}${r.motivo ? ' :: ' + r.motivo : ''}${r.erro ? ' :: ' + r.erro : ''}`);
    }
    const naoExecutados = resultados.filter((r) => r.status === 'NAO EXECUTADO').length;
    console.log(`\n[run] ${naoExecutados}/${resultados.length} casos NAO EXECUTADO — nenhum sucesso fabricado.`);
    return resultados;
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
}

main().then(
  (resultados) => {
    const falhas = resultados.filter((r) => r.status === 'FALHOU');
    process.exitCode = falhas.length ? 1 : 0;
  },
  (erro) => {
    console.error('[run] ABORTADO:', erro && erro.message || erro);
    process.exitCode = 1;
  },
);
