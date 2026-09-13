// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ItemPartnersTab } from './ItemPartnersTab'
import { ItemCommercialTab } from './ItemCommercialTab'
import { ItemDocumentsApplicationsTab } from './ItemDocumentsApplicationsTab'

afterEach(cleanup)

describe('item intelligence domain tabs', () => {
  it('shows client and supplier references with validation status', () => {
    render(
      <ItemPartnersTab
        clients={[
          {
            id: 'c1',
            item_id: 'item-1',
            cliente_id: 'client-1',
            codigo_original: ' CLI-001 ',
            descricao_original: 'PARAFUSO CLIENTE',
            status_validacao: 'validado',
            created: '2026-01-01',
            updated: '2026-01-01',
            expand: { cliente_id: { id: 'client-1', nome: 'Cliente Alfa', ativo: true } },
          },
        ]}
        suppliers={[
          {
            id: 's1',
            item_id: 'item-1',
            fornecedor_id: 'supplier-1',
            codigo_original: 'SUP-9',
            descricao_original: 'HEX BOLT',
            status_validacao: 'proposto',
            created: '2026-01-01',
            updated: '2026-01-01',
            expand: { fornecedor_id: { id: 'supplier-1', nome: 'Fabricante Beta' } },
          },
        ]}
      />,
    )

    expect(screen.getByText('Cliente Alfa')).toBeVisible()
    expect(screen.getByText('CLI-001')).toBeVisible()
    expect(screen.getByText('PARAFUSO CLIENTE')).toBeVisible()
    expect(screen.getByText('Fabricante Beta')).toBeVisible()
    expect(screen.getByText('SUP-9')).toBeVisible()
    expect(screen.getByText('Proposto')).toBeVisible()
  })

  it('shows four separate commercial facts and labels legacy data as legacy', () => {
    render(
      <ItemCommercialTab
        events={[
          {
            id: 'event-1',
            tipo: 'compra_books',
            item_id: 'item-1',
            ocorrido_em: '2026-02-01T00:00:00Z',
            valor_unitario_micros: 12340000,
            moeda: 'USD',
            sistema_origem: 'zoho_books',
            chave_origem: 'bill-1:line-1',
            created: '2026-02-01T00:00:00Z',
          },
        ]}
        legacy={[
          {
            id: 'legacy-1',
            item_id: 'item-1',
            tipo: 'compra',
            preco: 9.5,
            fornecedor: 'Fornecedor antigo',
            data_cotacao: '2025-12-01T00:00:00Z',
            created: '2025-12-01T00:00:00Z',
          },
        ]}
      />,
    )

    expect(screen.getByText('Cotação recebida do fornecedor')).toBeVisible()
    expect(screen.getAllByText('Compra real')).toHaveLength(2)
    expect(screen.getByText('Cotação enviada ao cliente')).toBeVisible()
    expect(screen.getByText('Venda real')).toBeVisible()
    expect(screen.getByText('Referência de custo legada')).toBeVisible()
    expect(screen.getByText('Zoho Books')).toBeVisible()
  })

  it('shows earlier new events with legacy references in one newest-first history', () => {
    render(
      <ItemCommercialTab
        events={[
          {
            id: 'event-latest',
            tipo: 'compra_books',
            item_id: 'item-1',
            fornecedor_id: 'supplier-1',
            ocorrido_em: '2026-03-01T00:00:00Z',
            valor_unitario_micros: 12340000,
            moeda: 'USD',
            sistema_origem: 'zoho_books',
            chave_origem: 'bill-latest:line-1',
            created: '2026-03-01T00:00:00Z',
            expand: { fornecedor_id: { id: 'supplier-1', nome: 'Fornecedor atual' } },
          },
          {
            id: 'event-earlier',
            tipo: 'compra_books',
            item_id: 'item-1',
            fornecedor_id: 'supplier-2',
            ocorrido_em: '2026-01-01T00:00:00Z',
            valor_unitario_micros: 10500000,
            moeda: 'USD',
            sistema_origem: 'zoho_books',
            chave_origem: 'bill-earlier:line-2',
            created: '2026-01-01T00:00:00Z',
            expand: { fornecedor_id: { id: 'supplier-2', nome: 'Fornecedor anterior' } },
          },
        ]}
        legacy={[
          {
            id: 'legacy-middle',
            item_id: 'item-1',
            tipo: 'compra',
            preco: 9.5,
            fornecedor: 'Fornecedor legado',
            data_cotacao: '2026-02-01T00:00:00Z',
            created: '2026-02-01T00:00:00Z',
          },
        ]}
      />,
    )

    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('bill-latest:line-1')
    expect(rows[0]).toHaveTextContent('Fato novo')
    expect(rows[1]).toHaveTextContent('legacy-middle')
    expect(rows[1]).toHaveTextContent('Referência legada')
    expect(rows[1]).not.toHaveTextContent('real')
    expect(rows[2]).toHaveTextContent('bill-earlier:line-2')
    expect(rows[2]).toHaveTextContent('Fornecedor anterior')
  })

  it('keeps the commercial tab visible when an event has a malformed currency code', () => {
    expect(() =>
      render(
        <ItemCommercialTab
          events={[
            {
              id: 'event-invalid-currency',
              tipo: 'compra_books',
              item_id: 'item-1',
              ocorrido_em: '2026-02-01T00:00:00Z',
              valor_unitario_micros: 12340000,
              moeda: 'INVALID',
              sistema_origem: 'zoho_books',
              chave_origem: 'bill-invalid:line-1',
              created: '2026-02-01T00:00:00Z',
            },
          ]}
          legacy={[]}
        />,
      ),
    ).not.toThrow()

    expect(screen.getAllByText('12,34 INVALID')).toHaveLength(2)
    expect(screen.getByText('Histórico comercial')).toBeVisible()
  })

  it('does not label a Books event from an incompatible source as a real fact in history', () => {
    render(
      <ItemCommercialTab
        events={[
          {
            id: 'invalid-books-origin',
            tipo: 'compra_books',
            item_id: 'item-1',
            ocorrido_em: '2026-02-01T00:00:00Z',
            valor_unitario_micros: 12340000,
            moeda: 'USD',
            sistema_origem: 'importacao',
            chave_origem: 'invalid-books-origin:line-1',
            created: '2026-02-01T00:00:00Z',
          },
        ]}
        legacy={[]}
      />,
    )

    expect(screen.queryByText(/invalid-books-origin:line-1/)).not.toBeInTheDocument()
    expect(screen.getByText('Nenhum registro comercial.')).toBeVisible()
  })

  it('shows application, document revision and a WorkDrive link', () => {
    render(
      <ItemDocumentsApplicationsTab
        transactions={[]}
        documents={[
          {
            id: 'link-1',
            item_id: 'item-1',
            documento_revisao_id: 'revision-1',
            tipo_vinculo: 'aplicacao',
            aplicacao: 'Linha de montagem A',
            created: '2026-01-01',
            expand: {
              documento_revisao_id: {
                id: 'revision-1',
                revisao: 'B',
                workdrive_url: 'https://workdrive.zoho.com/document-1',
                vigente: true,
                expand: {
                  documento_id: {
                    id: 'document-1',
                    codigo: 'DWG-001',
                    titulo: 'Desenho do item',
                    tipo: 'desenho',
                    origem_tipo: 'c2',
                  },
                },
              },
            },
          },
        ]}
      />,
    )

    expect(screen.getByText('Linha de montagem A')).toBeVisible()
    expect(screen.getByText('DWG-001 — Desenho do item')).toBeVisible()
    expect(screen.getByText('Revisão B')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Abrir no WorkDrive' })).toHaveAttribute(
      'href',
      'https://workdrive.zoho.com/document-1',
    )
  })

  it('does not turn an invalid WorkDrive URL into a link', () => {
    render(
      <ItemDocumentsApplicationsTab
        transactions={[]}
        documents={[
          {
            id: 'link-invalid',
            item_id: 'item-1',
            documento_revisao_id: 'revision-invalid',
            tipo_vinculo: 'c2',
            created: '2026-01-01',
            expand: {
              documento_revisao_id: {
                id: 'revision-invalid',
                revisao: 'A',
                workdrive_url: 'https://workdrive.zoho.com.evil.example/document-1',
                vigente: true,
              },
            },
          },
          {
            id: 'link-http',
            item_id: 'item-1',
            documento_revisao_id: 'revision-http',
            tipo_vinculo: 'c2',
            created: '2026-01-01',
            expand: {
              documento_revisao_id: {
                id: 'revision-http',
                revisao: 'B',
                workdrive_url: 'http://workdrive.zoho.com/document-2',
                vigente: false,
              },
            },
          },
        ]}
      />,
    )

    expect(screen.queryByRole('link', { name: 'Abrir no WorkDrive' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Link do WorkDrive inválido.')).toHaveLength(2)
  })
})
