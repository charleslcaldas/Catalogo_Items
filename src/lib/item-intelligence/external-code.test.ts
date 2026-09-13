import { describe, expect, it } from 'vitest'
import { buildExternalCodeIdentity, findValidatedExternalCodeMatch } from './external-code'

describe('buildExternalCodeIdentity', () => {
  it('preserves the received code and builds a normalized search key', () => {
    expect(buildExternalCodeIdentity(' ab-12 / 03 ')).toEqual({
      original: ' ab-12 / 03 ',
      normalized: 'AB1203',
    })
  })

  it('normalizes accents and full-width characters without losing letters or numbers', () => {
    expect(buildExternalCodeIdentity('ç2－ＡＢ １２')).toEqual({
      original: 'ç2－ＡＢ １２',
      normalized: 'C2AB12',
    })
  })

  it('returns a null search key when no usable code was supplied', () => {
    expect(buildExternalCodeIdentity(' - / ')).toEqual({
      original: ' - / ',
      normalized: null,
    })
  })
})

describe('findValidatedExternalCodeMatch', () => {
  const links = [
    {
      id: 'client-a-proposed',
      companyId: 'client-a',
      itemId: 'item-1',
      normalizedCode: 'ABC123',
      validationStatus: 'proposto' as const,
    },
    {
      id: 'client-b-validated',
      companyId: 'client-b',
      itemId: 'item-2',
      normalizedCode: 'ABC123',
      validationStatus: 'validado' as const,
    },
    {
      id: 'client-a-validated',
      companyId: 'client-a',
      itemId: 'item-3',
      normalizedCode: 'ABC123',
      validationStatus: 'validado' as const,
    },
  ]

  it('matches only a validated code inside the informed company', () => {
    expect(findValidatedExternalCodeMatch(links, 'client-a', ' abc-123 ')?.itemId).toBe('item-3')
  })

  it('does not reuse a code from another company', () => {
    expect(findValidatedExternalCodeMatch(links, 'client-c', 'ABC123')).toBeNull()
  })
})
