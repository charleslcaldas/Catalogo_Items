import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useData } from '@/contexts/data-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Pencil,
  Search,
  History,
  UploadCloud,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { NcmModal } from '@/components/MetadataModals'
import { NcmHistoryModal } from '@/components/NcmHistoryModal'
import { NcmImportModal } from '@/components/NcmImportModal'

type SortField = 'codigo' | 'itens' | 'ii' | 'ipi' | 'pis' | 'cofins' | 'observacoes'

export default function NCMPage() {
  const { ncms, itens } = useData()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyNcmId, setHistoryNcmId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField | null>('codigo')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else {
        setSortOrder('asc')
      }
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50 inline-block" />
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1.5 h-3.5 w-3.5 inline-block text-primary" />
    ) : (
      <ArrowDown className="ml-1.5 h-3.5 w-3.5 inline-block text-primary" />
    )
  }

  const filteredNcms = ncms.filter((n) => {
    const term = searchTerm.toLowerCase()
    return (
      n.codigo.toLowerCase().includes(term) ||
      (n.observacoes && n.observacoes.toLowerCase().includes(term))
    )
  })

  const sortedNcms = [...filteredNcms].sort((a, b) => {
    if (!sortField) return 0

    if (sortField === 'itens') {
      const countA = itens.filter((i) => i.ncm_id === a.id).length
      const countB = itens.filter((i) => i.ncm_id === b.id).length
      return sortOrder === 'asc' ? countA - countB : countB - countA
    }

    if (
      sortField === 'ii' ||
      sortField === 'ipi' ||
      sortField === 'pis' ||
      sortField === 'cofins'
    ) {
      const valA = a[sortField] ?? 0
      const valB = b[sortField] ?? 0
      return sortOrder === 'asc' ? valA - valB : valB - valA
    }

    let valA = ''
    let valB = ''

    if (sortField === 'codigo') {
      valA = a.codigo || ''
      valB = b.codigo || ''
    } else if (sortField === 'observacoes') {
      valA = a.observacoes || ''
      valB = b.observacoes || ''
    }

    const comparison = valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base' })
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const handleExport = () => {
    const headers = ['Código NCM', 'II (%)', 'IPI (%)', 'PIS (%)', 'COFINS (%)', 'Observações']
    const csvData = ncms.map((ncm) => [
      ncm.codigo,
      ncm.ii,
      ncm.ipi,
      ncm.pis,
      ncm.cofins,
      ncm.observacoes || '',
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) =>
        row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `ncm_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configurações NCM</h1>
            <p className="text-muted-foreground">Tabela de impostos e tributos.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar NCM..."
              className="pl-9 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <UploadCloud className="mr-2 h-4 w-4" />
            Importar CSV
          </Button>
          <Button
            onClick={() => {
              setEditData(null)
              setModalOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo NCM
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tabela NCM</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('codigo')}
                >
                  Código NCM <SortIcon field="codigo" />
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('itens')}
                >
                  Itens Associados <SortIcon field="itens" />
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('ii')}
                >
                  II (%) <SortIcon field="ii" />
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('ipi')}
                >
                  IPI (%) <SortIcon field="ipi" />
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('pis')}
                >
                  PIS (%) <SortIcon field="pis" />
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('cofins')}
                >
                  COFINS (%) <SortIcon field="cofins" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('observacoes')}
                >
                  Observações <SortIcon field="observacoes" />
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedNcms.map((ncm) => {
                const associatedCount = itens.filter((i) => i.ncm_id === ncm.id).length
                return (
                  <TableRow key={ncm.id}>
                    <TableCell className="font-medium font-mono">
                      <button
                        onClick={() => navigate(`/itens?ncm_id=${ncm.id}`)}
                        className="text-primary hover:underline hover:text-primary/80 transition-colors"
                        title="Ver itens associados"
                      >
                        {ncm.codigo}
                      </button>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <button
                        onClick={() => navigate(`/itens?ncm_id=${ncm.id}`)}
                        className="text-primary hover:underline hover:text-primary/80 transition-colors"
                        title="Ver itens associados"
                      >
                        {associatedCount}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">{ncm.ii}%</TableCell>
                    <TableCell className="text-right">{ncm.ipi}%</TableCell>
                    <TableCell className="text-right">{ncm.pis}%</TableCell>
                    <TableCell className="text-right">{ncm.cofins}%</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={ncm.observacoes}>
                      {ncm.observacoes || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Ver Histórico"
                        onClick={() => {
                          setHistoryNcmId(ncm.id)
                          setHistoryModalOpen(true)
                        }}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => {
                          setEditData(ncm)
                          setModalOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {sortedNcms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum NCM encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NcmModal open={modalOpen} onOpenChange={setModalOpen} initialData={editData} />
      <NcmImportModal open={importModalOpen} onOpenChange={setImportModalOpen} />
      <NcmHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        ncmId={historyNcmId}
      />
    </div>
  )
}
