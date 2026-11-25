import { describe, it, expect, vi, beforeEach } from 'vitest'
const mocks = vi.hoisted(() => ({
  old: [] as any[],
  updateLine: vi.fn(),
  createLine: vi.fn(),
  deleteLine: vi.fn(),
  updateQuote: vi.fn(),
  createQuote: vi.fn(),
}))
vi.mock('../pocketbase/client', () => ({
  default: {
    filter: () => '',
    collection: (name: string) =>
      name === 'potenciais'
        ? { update: mocks.updateQuote, create: mocks.createQuote }
        : {
            getFullList: async () => mocks.old,
            update: mocks.updateLine,
            create: mocks.createLine,
            delete: mocks.deleteLine,
          },
  },
}))
vi.mock('../utils', () => ({ buildFieldAccentCondition: () => '' }))
import { savePotencialFull } from '../../services/potenciais'
beforeEach(() => {
  vi.clearAllMocks()
  mocks.old = []
  mocks.updateQuote.mockResolvedValue({ id: 'p' })
  mocks.createQuote.mockResolvedValue({ id: 'p' })
  mocks.updateLine.mockResolvedValue({})
  mocks.createLine.mockResolvedValue({})
  mocks.deleteLine.mockResolvedValue({})
})
describe('salvar potencial sem recriar linhas', () => {
  it('preserva o id e não regrava linha inalterada nem cria histórico por recriação', async () => {
    mocks.old = [
      { id: 'pi', potencial_id: 'p', item_id: 'i', quantidade: 120, preco_unitario: 4.318 },
    ]
    await savePotencialFull('p', { cliente: 'Cliente' }, [
      { id: 'pi', item_id: 'i', quantidade: 120, preco_unitario: 4.318 },
    ])
    expect(mocks.updateLine).not.toHaveBeenCalled()
    expect(mocks.createLine).not.toHaveBeenCalled()
    expect(mocks.deleteLine).not.toHaveBeenCalled()
  })
  it('atualiza a linha existente e remove somente a linha explicitamente retirada', async () => {
    mocks.old = [
      { id: 'keep', potencial_id: 'p', item_id: 'i', quantidade: 100 },
      { id: 'removed', potencial_id: 'p', item_id: 'other', quantidade: 1 },
    ]
    await savePotencialFull('p', {}, [{ id: 'keep', item_id: 'i', quantidade: 120 }])
    expect(mocks.updateLine).toHaveBeenCalledWith('keep', { quantidade: 120 })
    expect(mocks.deleteLine).toHaveBeenCalledExactlyOnceWith('removed')
    expect(mocks.createLine).not.toHaveBeenCalled()
  })
  it('falha numa gravação não apaga linhas existentes', async () => {
    mocks.old = [
      { id: 'keep', potencial_id: 'p', item_id: 'i', quantidade: 100 },
      { id: 'removed', item_id: 'other' },
    ]
    mocks.updateLine.mockRejectedValueOnce(new Error('falha'))
    await expect(
      savePotencialFull('p', {}, [{ id: 'keep', item_id: 'i', quantidade: 120 }]),
    ).rejects.toThrow('falha')
    expect(mocks.deleteLine).not.toHaveBeenCalled()
  })
  it('rejeita id de linha que não pertence ao potencial antes de escrever', async () => {
    await expect(savePotencialFull('p', {}, [{ id: 'outro', item_id: 'i' }])).rejects.toThrow(
      'linha',
    )
    expect(mocks.updateQuote).not.toHaveBeenCalled()
    expect(mocks.createLine).not.toHaveBeenCalled()
  })
})
