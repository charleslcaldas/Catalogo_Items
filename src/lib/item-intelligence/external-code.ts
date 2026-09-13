export type ExternalCodeIdentity = {
  original: string
  normalized: string | null
}

export type ExternalCodeLink = {
  id: string
  companyId: string
  itemId: string
  normalizedCode: string
  validationStatus: 'proposto' | 'validado' | 'rejeitado' | 'inativo'
}

export function buildExternalCodeIdentity(original: string): ExternalCodeIdentity {
  const normalized = original
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]/gu, '')

  return {
    original,
    normalized: normalized || null,
  }
}

export function findValidatedExternalCodeMatch(
  links: ExternalCodeLink[],
  companyId: string,
  receivedCode: string,
): ExternalCodeLink | null {
  const { normalized } = buildExternalCodeIdentity(receivedCode)
  if (!normalized) return null

  return (
    links.find(
      (link) =>
        link.companyId === companyId &&
        link.validationStatus === 'validado' &&
        link.normalizedCode === normalized,
    ) ?? null
  )
}
