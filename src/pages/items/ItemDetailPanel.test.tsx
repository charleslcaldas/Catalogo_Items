// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Item } from '@/types'
import { ItemDetailPanel } from './ItemDetailPanel'

const mocks = vi.hoisted(() => ({
  readData: {
    transactions: [],
    priceHistory: [],
    commercialEvents: [],
    clientLinks: [],
    supplierLinks: [],
    documentLinks: [],
    readError: 'Não foi possível carregar os dados complementares.',
    refreshCommercialHistory: vi.fn(),
  },
}))

vi.mock('@/contexts/data-context', () => ({
  useData: () => ({
    linhas: [],
    categorias: [],
    acabamentos: [],
    ncms: [],
    unidadesMedida: [],
    descricoesBase: [],
    saveItem: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-atributos-linha', () => ({ useAtributosLinha: () => [] }))
vi.mock('@/hooks/use-realtime', () => ({ useRealtime: () => undefined }))
vi.mock('@/lib/pocketbase/client', () => ({
  default: { collection: vi.fn(), send: vi.fn() },
}))
vi.mock('./use-item-detail-read-data', () => ({
  useItemDetailReadData: () => mocks.readData,
}))
vi.mock('./components/ItemDomainTabs', () => ({
  ItemDomainTabs: ({
    partnersContent,
    commercialContent,
    documentsContent,
  }: {
    partnersContent: ReactNode
    commercialContent: ReactNode
    documentsContent: ReactNode
  }) => (
    <div data-testid="item-domain-tabs">
      {partnersContent}
      {commercialContent}
      {documentsContent}
    </div>
  ),
}))
vi.mock('./GalleryModal', () => ({ GalleryModal: () => null }))
vi.mock('@/components/MetadataModals', () => ({
  CategoryModal: () => null,
  LineModal: () => null,
}))
vi.mock('@/components/NewDescBaseModal', () => ({ NewDescBaseModal: () => null }))

const item = {
  id: 'item-1',
  sku: 'SKU-1',
  linha_id: 'line-1',
  descr_pt: 'Item de teste',
  ativo: true,
  sincronizado_com_zoho: false,
} as Item

afterEach(cleanup)

describe('ItemDetailPanel complementary read errors', () => {
  it('shows a visible alert without claiming that records do not exist', () => {
    render(<ItemDetailPanel item={item} onClose={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os dados complementares.',
    )
    expect(screen.queryByText(/nenhum|nenhuma|não existem/i)).not.toBeInTheDocument()
  })
})
