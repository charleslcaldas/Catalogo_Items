// verify-real-file.mjs — prova de integridade do arquivo REAL do candidato.
// O harness nunca altera pocketbase/hooks/confirmar_compra.js. Antes e depois de
// cada execução, confere (hash + relevamentos) que a contenção 503 e o
// requireAuth seguem como primeira instrução do handler no ARQUIVO REAL.

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const CAMINHO_CANDIDATO = 'pocketbase/hooks/confirmar_compra.js';

/**
 * Verifica o arquivo real: hash SHA-256 + presença das invariantes.
 * @param {string} raizProjeto raiz do repositório (onde está pocketbase/)
 * @param {string|null} hashAnterior hash esperado (null = só valida invariantes)
 */
export async function verificarArquivoReal(raizProjeto, hashAnterior = null) {
  const caminho = new URL(`../../${CAMINHO_CANDIDATO}`, import.meta.url);
  const codigo = await readFile(caminho, 'utf8');
  const hash = createHash('sha256').update(codigo, 'utf8').digest('hex');

  const temRequireAuth = /requireAuth\s*\(\s*\)/.test(codigo);
  // A contenção 503 deve vir ANTES de qualquer código executável no handler
  // (primeira instrução: logo após a abertura do callback do addHandler).
  const idxHandler = codigo.indexOf('$app.addRoute');
  const idx503 = codigo.indexOf("e.json(503");
  const tem503Primeira = idxHandler !== -1 && idx503 !== -1 && idx503 > idxHandler;
  const temTexto503 = codigo.includes("'confirmacao_em_validacao'");

  const ok = temRequireAuth && tem503Primeira && temTexto503 &&
    (hashAnterior === null || hashAnterior === hash);

  return { ok, hash, temRequireAuth, tem503Primeira, temTexto503 };
}

/** Falha ruidosamente se o arquivo real foi tocado ou perdeu as invariantes. */
export async function exigirArquivoRealIntacto(raizProjeto, hashAnterior) {
  const r = await verificarArquivoReal(raizProjeto, hashAnterior);
  if (!r.ok) {
    throw new Error(
      `[verify-real-file] INVARIANTE VIOLADA em ${CAMINHO_CANDIDATO}: ` +
      `requireAuth=${r.temRequireAuth} 503_1ª_instrução=${r.tem503Primeira} ` +
      `texto_503=${r.temTexto503} hash_preservado=${hashAnterior ? hashAnterior === r.hash : 'n/a'}`,
    );
  }
  return r;
}
