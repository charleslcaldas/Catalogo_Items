/* General utility functions (exposes cn) */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getContrastColor(hexColor?: string) {
  if (!hexColor) return '#000000'
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16) || 0
  const g = parseInt(hex.substring(2, 4), 16) || 0
  const b = parseInt(hex.substring(4, 6), 16) || 0
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? '#000000' : '#FFFFFF'
}

/**
 * Normaliza uma string removendo acentos/diacríticos e convertendo para minúsculas.
 * Exemplo: "Francês" -> "frances", "AÇÃO" -> "acao".
 */
export function normalizeText(str: string | null | undefined): string {
  if (!str) return ''
  return String(str)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/**
 * Verifica se o texto haystack contém o needle de forma insensível a acentos e maiúsculas/minúsculas.
 */
export function textIncludes(
  haystack: string | null | undefined,
  needle: string | null | undefined,
): boolean {
  if (!needle) return true
  const normNeedle = normalizeText(needle)
  if (!normNeedle) return true
  const normHaystack = normalizeText(haystack)
  return normHaystack.includes(normNeedle)
}

/**
 * Verifica se o texto haystack contém todos os tokens (separados por espaço) da busca needle,
 * de forma insensível a acentos e maiúsculas/minúsculas.
 */
export function textMatchesAll(
  haystack: string | null | undefined,
  query: string | null | undefined,
): boolean {
  if (!query) return true
  const normQuery = normalizeText(query)
  if (!normQuery) return true
  const tokens = normQuery.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true
  const normHaystack = normalizeText(haystack)
  return tokens.every((token) => normHaystack.includes(token))
}

// Mapa de substituição para expansão de acentos em consultas SQLite/PocketBase
const ACCENT_GROUPS: Record<string, string[]> = {
  a: ['a', 'á', 'à', 'ã', 'â', 'ä'],
  e: ['e', 'é', 'è', 'ê', 'ë'],
  i: ['i', 'í', 'ì', 'î', 'ï'],
  o: ['o', 'ó', 'ò', 'õ', 'ô', 'ö'],
  u: ['u', 'ú', 'ù', 'û', 'ü'],
  c: ['c', 'ç'],
}

/**
 * Gera variantes acentuadas/não-acentuadas comuns para um termo de busca, permitindo
 * que consultas PocketBase (que usam LIKE do SQLite sem suporte nativo a remoção de diacríticos)
 * encontrem tanto versões acentuadas quanto desprovidas de acento.
 * Limita a no máximo 10 variantes para não inflar a query.
 */
export function generateAccentVariants(token: string, maxVariants: number = 3): string[] {
  const clean = normalizeText(token)
    .replace(/["'\\]/g, '')
    .trim()
  if (!clean) return []

  const variants = new Set<string>()
  variants.add(clean)

  // Encontra as posições com letras acentuáveis (limitando a até 2 posições para evitar explosão combinatória)
  const positions: { index: number; options: string[] }[] = []
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    if (ACCENT_GROUPS[char]) {
      positions.push({ index: i, options: ACCENT_GROUPS[char] })
      if (positions.length >= 2) break
    }
  }

  // Gera variantes mais comuns primeiro (ex: c->ç, a->ã/á, e->é/ê, o->õ/ó)
  const generate = (curr: string[], posIdx: number) => {
    if (variants.size >= maxVariants) return
    if (posIdx >= positions.length) {
      variants.add(curr.join(''))
      return
    }

    const { index, options } = positions[posIdx]
    for (const opt of options) {
      if (variants.size >= maxVariants) break
      curr[index] = opt
      generate(curr, posIdx + 1)
    }
  }

  generate(clean.split(''), 0)
  return Array.from(variants).slice(0, maxVariants)
}

/**
 * Constrói a cláusula PocketBase para um campo e um token, cobrindo as variantes de acento.
 * Exemplo: buildFieldAccentCondition("descr_pt", "frances") ->
 * '(descr_pt ~ "frances" || descr_pt ~ "francês")'
 */
export function buildFieldAccentCondition(
  field: string,
  token: string,
  maxVariants: number = 2,
): string {
  const variants = generateAccentVariants(token, maxVariants)
  if (variants.length === 0) {
    return ''
  }
  if (variants.length === 1) {
    return `${field} ~ "${variants[0]}"`
  }
  return `(${variants.map((v) => `${field} ~ "${v}"`).join(' || ')})`
}
