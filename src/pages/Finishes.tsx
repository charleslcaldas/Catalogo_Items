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
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { getContrastColor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Search } from 'lucide-react'
import { FinishModal } from '@/components/MetadataModals'

export default function Finishes() {
  const { acabamentos } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredAcabamentos = acabamentos.filter((a) => {
    const term = searchTerm.toLowerCase()
    return (
      a.nome_pt.toLowerCase().includes(term) ||
      (a.nome_en && a.nome_en.toLowerCase().includes(term)) ||
      a.codigo.toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Acabamentos</h1>
            <p className="text-muted-foreground">
              Tipos de acabamento para os materiais industriais.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar acabamento..."
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
          Novo Acabamento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tabela de Acabamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Código</TableHead>
                <TableHead>Nome (PT)</TableHead>
                <TableHead>Nome (EN)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAcabamentos.map((aca) => (
                <TableRow key={aca.id}>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {aca.codigo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium shadow-sm border border-black/5"
                      style={
                        aca.cor_hex
                          ? { backgroundColor: aca.cor_hex, color: getContrastColor(aca.cor_hex) }
                          : { backgroundColor: '#E5E7EB', color: '#1F2937' }
                      }
                    >
                      {aca.nome_pt}
                    </span>
                  </TableCell>
                  <TableCell>
                    {aca.nome_en ? (
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium shadow-sm border border-black/5 opacity-90"
                        style={
                          aca.cor_hex
                            ? { backgroundColor: aca.cor_hex, color: getContrastColor(aca.cor_hex) }
                            : { backgroundColor: '#E5E7EB', color: '#1F2937' }
                        }
                      >
                        {aca.nome_en}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditData(aca)
                        setModalOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredAcabamentos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum acabamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FinishModal open={modalOpen} onOpenChange={setModalOpen} initialData={editData} />
    </div>
  )
}
