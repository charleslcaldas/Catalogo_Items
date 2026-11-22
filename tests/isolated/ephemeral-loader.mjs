/**
 * Carregador do código REAL do projeto para o runtime EFÊMERO do harness.
 * Copia migrations e hooks reais para um diretório temporário e aplica UMA ÚNICA
 * adaptação permitida (apenas na CÓPIA EFÊMERA, nunca no arquivo real):
 * remover as duas linhas de contenção (return 503) de confirmar_compra.js,
 * para que o código real do candidato seja exercitável no isolamento.
 *
 * PROIBIDO nesta rodada: alterar pocketbase/hooks/confirmar_compra.js real,
 * criar bypass na rota real, aplicar migrations nos backends reais.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const PB_ROOT = path.resolve(process.cwd(), 'pocketbase')

const HOOKS_TO_LOAD = [
  'confirmar_compra.js',
  'potencial_itens_price.js',
  'potencial_itens_reference.js',
  'price_history_logger.js',
  'on_cotacao_finalizada.js',
  'update_cotacao_status_on_price.js',
]

const MARK_BEGIN = '    // CONTENÇÃO AUTORIZADA (Charles)'
const MARK_RETURN = "    return e.json(503, { error: 'confirmacao_em_validacao' })"

/**
 * Adapta UMA CÓPIA de confirmar_compra.js removendo a contenção (return 503 +
 * comentário imediatamente acima), preservando requireAuth no 4º argumento.
 * O arquivo REAL no projeto não é tocado.
 */
export function stripContainment(sourceText) {
  const lines = sourceText.split('\n')
  const out = []
  let removed = 0
  let inComment = false
  for (const line of lines) {
    if (line.startsWith(MARK_BEGIN)) {
      inComment = true
      removed++
      continue
    }
    if (inComment) {
      // consome o bloco de comentário até a linha do return 503
      if (line.startsWith(MARK_RETURN)) {
        inComment = false
        removed++
        continue
      }
      removed++
      continue
    }
    if (line.startsWith(MARK_RETURN)) {
      removed++
      continue
    }
    out.push(line)
  }
  if (removed === 0) {
    throw new Error(
      'Esperava encontrar a contenção (return 503 + comentário) em confirmar_compra.js — nada encontrado. ' +
        'Se a contenção real já foi removida, a rodada de testes deve ser reavaliada.',
    )
  }
  return out.join('\n')
}

/** Copia as migrations REAIS (0001..0066) para o diretório efêmero. */
export function loadMigrationsInto(destDir) {
  const src = path.join(PB_ROOT, 'migrations')
  mkdirSync(destDir, { recursive: true })
  const files = readdirSync(src).filter((f) => f.endsWith('.js') && /^\d{4}_/.test(f))
  for (const f of files) {
    writeFileSync(path.join(destDir, f), readFileSync(path.join(src, f), 'utf8'))
  }
  return files
}

/** Copia os hooks REAIS selecionados para o diretório efêmero (com adaptação da contenção). */
export function loadHooksInto(destDir, { stripContainment: doStrip = true } = {}) {
  const src = path.join(PB_ROOT, 'hooks')
  mkdirSync(destDir, { recursive: true })
  const loaded = []
  for (const name of HOOKS_TO_LOAD) {
    const raw = readFileSync(path.join(src, name), 'utf8')
    let text = raw
    if (name === 'confirmar_compra.js' && doStrip) {
      text = stripContainment(raw)
    }
    writeFileSync(path.join(destDir, name), text)
    loaded.push(name)
  }
  return loaded
}
