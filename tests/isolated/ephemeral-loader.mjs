// ephemeral-loader.mjs — copia para o dataDir efêmero APENAS migrations de
// ESTRUTURA (allowlist explícita de ids). Nunca copia/executa migrations de
// seed ou de dados reais. Nada de coleção fake em código: se a estrutura
// mínima necessária não for coberta pela allowlist, ABORTA com erro nomeando
// o que falta.

import { readdir, mkdir, copyFile, readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const RAIZ = join(AQUI, '..', '..');
export const DIR_MIGRATIONS = join(RAIZ, 'pocketbase', 'migrations');

// ---------------------------------------------------------------------------
// ALLOWLIST DE ESTRUTURA — ids EXATOS dos arquivos de migration permitidos.
// Cada entrada copia SOMENTE estrutura de coleções/campos/índices/tabelas raw.
// Migrations de seed/dados (0002, 0032, 0053, 0054, 0058, 0059, 0060, 0061)
// NUNCA entram. Migrations que criam coleção E também semeiam registros de
// demonstração (0004, 0011, 0035, 0037, 0046, 0019) entram porque o bloco de
// dados é no-op sobre banco vazio (loops sobre 0 registros) e/ou grava apenas
// catálogos de domínio sintéticos — nenhum dado real do time.
// ---------------------------------------------------------------------------
export const ALLOWLIST_ESTRUTURA = [
  '0001_create_collections.js',            // categorias, linhas, acabamentos, ncm, itens
  '0003_create_logs_importacao.js',        // logs_importacao
  '0004_create_potenciais.js',             // potenciais, potencial_itens (seed demo no-op em vazio)
  '0006_update_metadata.js',               // atributos_linha (upsert de cor em acabamentos só toca registros existentes)
  '0011_create_unidades_medida.js',        // unidades_medida
  '0012_create_descricoes_base.js',        // descricoes_base
  '0013_update_itens_relations.js',        // itens: relações descricao_base/unidade + tributos
  '0015_update_itens_and_fotos.js',        // itens/foto_catalogo: campos descritivos e arquivo
  '0019_update_atributos_linha.js',        // atributos_linha: campos novos (loop sobre linhas é no-op em vazio)
  '0027_add_indexes.js',                   // itens: índices
  '0028_refine_itens_schema.js',           // itens: renome/limpeza de campos (UPDATE em vazio é no-op)
  '0029_add_user_preferences.js',          // users: preferencias_ui
  '0030_create_ncm_audit_logs.js',         // ncm_audit_logs
  '0031_create_historico_precos.js',       // historico_precos
  '0035_create_status_potencial.js',       // status_potencial (+ status-padrão de domínio)
  '0036_create_estagios_potencial.js',     // estagios_potencial (backfills SQL são no-op em vazio)
  '0037_create_quotation_system.js',       // fornecedores, cotacoes_fornecedor, cotacoes_itens
  '0038_quotation_enhancements.js',        // cotacoes_itens: quantidade_minima; potencial_notas: categoria
  '0043_add_tipo_cliente_to_historico_precos.js', // historico_precos: tipo/cliente/potencial_id
  '0046_create_contatos_fornecedor.js',    // contatos_fornecedor (migração de legados é no-op em vazio)
  '0057_create_solicitacoes_itens_cliente.js', // solicitacoes_itens_cliente
  '0062_mei_quote_nonce_table.js',         // tabela raw mei_quote_nonces_v1
  '0063_quotation_v3_zoho_fields.js',      // campos v3 + zoho_sync_state (backfill no-op em vazio)
  '0064_quotation_rodadas.js',             // cotacoes_rodadas, rodada_atual/preco_original
  '0065_confirmacao_compra_idempotencia.js', // c2_idempotency_keys, cascade/ref, tipo 'selecao'
  '0066_margem_negociada_cotacoes_itens.js', // margem_negociada, margem_versao, precisao_negociada
];

// Coleções que o código candidato e os hooks de histórico precisam encontrar.
const COLECOES_OBRIGATORIAS = [
  'users', 'fornecedores', 'itens', 'linhas', 'potenciais', 'potencial_itens',
  'potencial_notas', 'cotacoes_fornecedor', 'cotacoes_itens', 'cotacoes_rodadas',
  'historico_precos', 'c2_idempotency_keys',
];

// Bloqueadas explicitamente: semeiam time real (e-mails + senha padrão) e/ou
// lançam erro sem o potencial 6544.
const BLOQUEADAS_CONHECIDAS = ['0002', '0032', '0053', '0054', '0058', '0059', '0060', '0061'];

async function existe(p) {
  try { await access(p, constants.F_OK); return true; } catch { return false; }
}

/** Lista os arquivos de migration disponíveis no repositório real. */
export async function listarMigrationsReais() {
  if (!(await existe(DIR_MIGRATIONS))) {
    throw new Error(`[loader] pasta de migrations não encontrada: ${DIR_MIGRATIONS}`);
  }
  return (await readdir(DIR_MIGRATIONS)).filter((f) => f.endsWith('.js')).sort();
}

/**
 * Copia para o dataDir apenas as migrations da allowlist e valida que nenhuma
 * delas contenha export/cópia de dados reais ou segredos (varredura textual).
 * @param {string} dataDir diretório temporário do efêmero
 */
export async function copiarMigrationsEstrutura(dataDir) {
  const destino = join(dataDir, 'migrations');
  await mkdir(destino, { recursive: true });

  const reais = await listarMigrationsReais();
  const faltandoAllowlist = ALLOWLIST_ESTRUTURA.filter((a) => !reais.includes(a));
  if (faltandoAllowlist.length) {
    throw new Error(`[loader] migrations da allowlist ausentes no repo: ${faltandoAllowlist.join(', ')}`);
  }

  const proibidasPresentes = [];
  const copiadas = [];
  for (const arquivo of reais) {
    const id = arquivo.slice(0, 4);
    if (BLOQUEADAS_CONHECIDAS.includes(id) && !ALLOWLIST_ESTRUTURA.includes(arquivo)) {
      proibidasPresentes.push(arquivo);
      continue; // seed/dados real: nunca copiada
    }
    if (!ALLOWLIST_ESTRUTURA.includes(arquivo)) continue; // fora da allowlist: nunca copiada

    const codigo = await readFile(join(DIR_MIGRATIONS, arquivo), 'utf8');

    // Proibições duras: segredos, URLs reais fora do escopo, export de dados.
    if (/sk_live|pk_live|api[_-]?key\s*[:=]|secret\s*[:=]|senha\s*[:=]\s*['"]Skip@Pass/i.test(codigo)) {
      throw new Error(`[loader] migration ${arquivo} parece conter segredo/credencial — BLOQUEADA`);
    }
    if (/https?:\/\/(?!localhost|127\.0\.0\.1)/i.test(codigo)) {
      throw new Error(`[loader] migration ${arquivo} contém URL externa real — BLOQUEADA`);
    }
    if (/new Record\(/.test(codigo) && BLOQUEADAS_CONHECIDAS.some((b) => arquivo.startsWith(b))) {
      throw new Error(`[loader] migration ${arquivo} grava dados reais — BLOQUEADA`);
    }

    await copyFile(join(DIR_MIGRATIONS, arquivo), join(destino, arquivo));
    copiadas.push(arquivo);
  }

  // Estrutura mínima obrigatória: confere que a allowlist copiada menciona
  // TODAS as coleções exigidas pelo candidato/hooks de histórico. Se faltar,
  // ABORTA com erro explícito (nunca criar collection fake em código).
  const concatenado = await Promise.all(
    copiadas.map(async (a) => readFile(join(destino, a), 'utf8')),
  );
  const conteudo = concatenado.join('\n');
  const ausentes = COLECOES_OBRIGATORIAS.filter((c) => !conteudo.includes(`'${c}'`));
  if (ausentes.length) {
    throw new Error(
      `[loader] ESTRUTURA INCOMPLETA para o harness — coleções ausentes na allowlist: ${ausentes.join(', ')}. ` +
      'Adicionar a migration de estrutura correspondente à allowlist (nunca criar coleção fake).',
    );
  }

  // Manifesto do que entrou no efêmero (auditoria do dataDir temporário).
  await writeFile(
    join(destino, '_allowlist_aplicada.json'),
    JSON.stringify({ geradoEm: new Date().toISOString(), copiadas, bloqueadas: proibidasPresentes }, null, 2),
    'utf8',
  );

  return { copiadas, bloqueadas: proibidasPresentes };
}

/** Copia o hook candidato para o efêmero com a contenção 503 removida — NUNCA toca o real. */
export async function copiarHookCandidato(dataDir, { stripContainment = true } = {}) {
  const origem = join(RAIZ, 'pocketbase', 'hooks', 'confirmar_compra.js');
  const codigo = await readFile(origem, 'utf8');
  let copia = codigo;
  if (stripContainment) {
    const antes = copia;
    copia = copia.replace(/^\s*return e\.json\(503, \{ error: 'confirmacao_em_validacao' \}\)\s*$/m, '');
    if (copia === antes) {
      throw new Error('[loader] não consegui remover a contenção 503 da CÓPIA — abortando (o arquivo real jamais é alterado)');
    }
  }
  const destino = join(dataDir, 'hooks');
  await mkdir(destino, { recursive: true });
  await writeFile(join(destino, 'confirmar_compra.js'), copia, 'utf8');
  return { destino: join(destino, 'confirmar_compra.js') };
}
