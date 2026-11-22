// ephemeral-loader.mjs — monta o dataDir EFÊMERO: copia migrations de SCHEMA (excluindo seed/dados)
// e os hooks REAIS para uma cópia, aplica stripContainment SÓ na cópia, nunca no arquivo real.
// NÃO EXECUTADO nesta rodada (a plataforma não tem binário PocketBase).

import { readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

/** Migrations de seed/dados EXCLUÍDAS do efêmero — o runtime sobe 100% sintético.
 *  0002/0032/0053/0054/0058/0059/0060/0061 abortam em DB vazio (dependem de dados reais). */
export const MIGRATIONS_EXCLUIDAS = new Set([
  '0002', // seed usuários do time
  '0032', // seed dados
  '0053', // seed dados
  '0054', // seed dados
  '0058', // seed/dados (aborta em DB vazio)
  '0059', // seed/dados (aborta em DB vazio)
  '0060', // seed/dados
  '0061', // seed/dados
]);

const PREFIXO_EXCLUIDAS = [...MIGRATIONS_EXCLUIDAS];

/** Decide se uma migration entra no efêmero: schema sim, seed/dados não. */
export function deveCopiarMigration(nomeArquivo) {
  if (!nomeArquivo.endsWith('.js')) return false;
  return !PREFIXO_EXCLUIDAS.some((prefixo) => nomeArquivo.startsWith(prefixo));
}

/** Copia migrations de schema (menos as excluídas) + hooks reais para o dataDir efêmero. */
export async function montarDataDirEfemero({ repoRoot, dataDir, migrationsDir, hooksDir }) {
  const repoMigrations = path.join(repoRoot, 'pocketbase', 'migrations');
  const repoHooks = path.join(repoRoot, 'pocketbase', 'hooks');

  const arquivos = await readdir(repoMigrations);
  const copiadas = [];
  const excluidas = [];
  for (const nome of arquivos.sort()) {
    if (!deveCopiarMigration(nome)) {
      if (nome.endsWith('.js')) excluidas.push(nome);
      continue;
    }
    await copyFile(path.join(repoMigrations, nome), path.join(migrationsDir, nome));
    copiadas.push(nome);
  }

  // Hooks reais: copiados intactos para a CÓPIA; stripContainment edita só a cópia.
  const hooksReais = await readdir(repoHooks);
  for (const nome of hooksReais) {
    await copyFile(path.join(repoHooks, nome), path.join(hooksDir, nome));
  }

  // Contenção 503 removida SOMENTE na cópia efêmera do hook de confirmação.
  const copiaHook = path.join(hooksDir, 'confirmar_compra.js');
  const realHook = path.join(repoHooks, 'confirmar_compra.js');
  const conteudoCopia = await readFile(copiaHook, 'utf8');
  const { texto: semContencao, removidas } = stripContainment(conteudoCopia);
  if (!removidas) {
    throw new Error(
      '[ISOLAMENTO] stripContainment falhou: contenção 503 não encontrada na CÓPIA efêmera de confirmar_compra.js. ' +
        'O arquivo real NÃO foi modificado — verifique o formato do return 503.'
    );
  }
  await writeFile(copiaHook, semContencao, 'utf8');

  return { copiadas, excluidas, hooksCopiados: hooksReais, containmentRemovida: true, realHook };
}

/** Remove a contenção 503 (return imediato) do TEXTO da cópia. Erro se não achar as linhas. */
export function stripContainment(texto) {
  // Formato esperado no hook real (1ª instrução do handler):
  //   return c.json(503, { ... })  OU  return c.noContent(503) / similares com "503".
  const linhas = texto.split('\n');
  const indices = [];
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    const eReturn503 = /^return\s+.*503/.test(linha) && /return/.test(linha);
    // Também cobre padrão de uma linha comentada logo acima: mantenho o comentário (só removo o return).
    if (eReturn503) indices.push(i);
  }
  if (indices.length === 0) {
    return { texto, removidas: false };
  }
  // Remove apenas o PRIMEIRO return 503 (a contenção é única e é a 1ª instrução do handler).
  linhas.splice(indices[0], 1);
  return { texto: linhas.join('\n'), removidas: true };
}
