// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TabsContent } from '@/components/ui/tabs'
import { ItemC2DataTabs } from './ItemC2DataTabs'
import { ItemDomainTabs } from './ItemDomainTabs'

afterEach(cleanup)

describe('ItemDomainTabs', () => {
  it('renders the four business tabs and opens C2 data by default', () => {
    render(
      <ItemDomainTabs
        dataContent={<div>Conteúdo C2</div>}
        partnersContent={<div>Conteúdo parceiros</div>}
        commercialContent={<div>Conteúdo comercial</div>}
        documentsContent={<div>Conteúdo documentos</div>}
      />,
    )

    expect(screen.getByRole('tab', { name: 'Dados C2' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Clientes e fornecedores' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Preços e cotações' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Documentos e aplicações' })).toBeInTheDocument()
    expect(screen.getByText('Conteúdo C2')).toBeVisible()
  })

  it('switches to partners without invoking any mutation', () => {
    render(
      <ItemDomainTabs
        dataContent={<div>Conteúdo C2</div>}
        partnersContent={<div>Conteúdo parceiros</div>}
        commercialContent={<div>Conteúdo comercial</div>}
        documentsContent={<div>Conteúdo documentos</div>}
      />,
    )

    const partnersTab = screen.getByRole('tab', { name: 'Clientes e fornecedores' })
    fireEvent.mouseDown(partnersTab, { button: 0, ctrlKey: false })

    expect(screen.getByText('Conteúdo parceiros')).toBeVisible()
  })
})

describe('ItemC2DataTabs', () => {
  it('keeps the creation and update record accessible inside Dados C2', () => {
    render(
      <ItemC2DataTabs>
        <TabsContent value="pt">Português</TabsContent>
        <TabsContent value="en">English</TabsContent>
        <TabsContent value="record">
          <div>Criado em: 01/01/2026</div>
          <div>Última atualização: 02/01/2026</div>
        </TabsContent>
      </ItemC2DataTabs>,
    )

    expect(screen.getByRole('tab', { name: 'Registro' })).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Registro' }), {
      button: 0,
      ctrlKey: false,
    })
    expect(screen.getByText('Criado em: 01/01/2026')).toBeVisible()
    expect(screen.getByText('Última atualização: 02/01/2026')).toBeVisible()
    expect(screen.queryByRole('tab', { name: 'Transações' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Histórico de Preços' })).not.toBeInTheDocument()
  })
})
