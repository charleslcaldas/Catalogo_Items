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
import { Plus, Pencil, Search } from 'lucide-react'
import { NcmModal } from '@/components/MetadataModals'

export default function NCMPage() {
  const { ncms } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredNcms = ncms.filter((n) => {
    const term = searchTerm.toLowerCase()
    return (
      n.codigo.toLowerCase().includes(term) ||
      (n.observacoes && n.observacoes.toLowerCase().includes(term))
    )
  })

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

      <Card>
        <CardHeader>
          <CardTitle>Tabela NCM</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código NCM</TableHead>
                <TableHead className="text-right">II (%)</TableHead>
                <TableHead className="text-right">IPI (%)</TableHead>
                <TableHead className="text-right">PIS (%)</TableHead>
                <TableHead className="text-right">COFINS (%)</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNcms.map((ncm) => (
                <TableRow key={ncm.id}>
                  <TableCell className="font-medium font-mono">{ncm.codigo}</TableCell>
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
                      onClick={() => {
                        setEditData(ncm)
                        setModalOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredNcms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum NCM encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NcmModal open={modalOpen} onOpenChange={setModalOpen} initialData={editData} />
    </div>
  )
}
