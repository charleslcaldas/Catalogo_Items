import { describe, expect, it, vi } from 'vitest'
import { ClientResponseError } from 'pocketbase'
vi.mock('../pocketbase/client', () => ({ default: { send: vi.fn() } }))
import {
  gerarIdempotencyKey,
  toConfirmarCompraError,
  confirmarCompra,
  type ConfirmarCompraPayload,
} from '../../services/cotacaoConfirmacao'
import pb from '../pocketbase/client'
describe('contrato do serviço candidato', () => {
  it('preserva código de erro da raiz da resposta PocketBase', () => {
    const e = toConfirmarCompraError(
      new ClientResponseError({ status: 409, response: { error: 'conflito_margem' } }),
    )
    expect(e.status).toBe(409)
    expect(e.code).toBe('conflito_margem')
  })
  it('gera chave válida mesmo com espaços e ponto no updated', () => {
    const k = gerarIdempotencyKey('abc123', '2026-11-23 12:34:56.123Z', 'pi123')
    expect(k).toMatch(/^[A-Za-z0-9:_-]{8,120}$/)
    expect(k).toBe(gerarIdempotencyKey('abc123', '2026-11-23 12:34:56.123Z', 'pi123'))
  })
  it('payload incompleto falha antes de qualquer chamada de rede', async () => {
    await expect(confirmarCompra({} as ConfirmarCompraPayload)).rejects.toMatchObject({
      code: 'payload_invalido',
    })
    expect(pb.send).not.toHaveBeenCalled()
  })
})
