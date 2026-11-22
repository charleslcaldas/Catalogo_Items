// suppress-store-review.mjs — análise ESTÁTICA do store global c2_suppress_venda
// no arquivo REAL do candidato (nunca executa o hook). O store do servidor é
// compartilhado entre requisições concorrentes: a leitura/gravação da chave sem
// limpeza em finally pode vazar estado de uma requisição para outra.

import { readFile } from 'node:fs/promises';
import { CAMINHO_CANDIDATO } from './verify-real-file.mjs';

/**
 * Avalia, por leitura do código, os riscos conhecidos do store global.
 * Retorna achados em texto — o harness marca o caso como PENDENTE
 * (não há runtime PocketBase aqui para provar comportamento em runtime).
 */
export async function revisarStoreSuppress() {
  const caminho = new URL(`../../${CAMINHO_CANDIDATO}`, import.meta.url);
  const codigo = await readFile(caminho, 'utf8');

  const achados = [];
  const usaStore = codigo.includes("$$app.store") || codigo.includes("$app.store");
  if (!usaStore) {
    return { usaStore: false, temFinally: false, setTrue: 0, setFalse: 0, limpezaFinally: false, achados: ['hook não usa store global c2_suppress_venda'] };
  }

  const setTrue = (codigo.match(/c2_suppress_venda['"]\s*,\s*true/g) || []).length;
  const setFalse = (codigo.match(/c2_suppress_venda['"]\s*,\s*false/g) || []).length;
  const temFinally = /\bfinally\b/.test(codigo);
  const limpezaFinally = temFinally && setFalse > 0;

  if (setTrue === 0) achados.push('nenhuma gravação de c2_suppress_venda=true encontrada');
  if (setTrue > 0 && !limpezaFinally) {
    achados.push(
      `gravações true=${setTrue}, false=${setFalse}, finally presente=${temFinally}: ` +
      'sem limpeza garantida em finally há risco de vazamento entre requisições concorrentes',
    );
  }
  if (setTrue > 0 && limpezaFinally) {
    achados.push(
      `gravações true=${setTrue}, false=${setFalse} com finally: formato parece correto — ` +
      'prova de runtime (concorrência real) ainda PENDENTE',
    );
  }

  return { usaStore: true, temFinally, setTrue, setFalse, limpezaFinally, achados };
}
