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
import { getContrastColor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Plus, Pencil } from 'lucide-react'
import { FinishModal } from '@/components/MetadataModals'

export default function Finishes() {
  const { acabamentos } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<any>(null)

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Acabamentos</h1>
          <p className="text-muted-foreground">
            Tipos de acabamento para os materiais industriais.
          </p>
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
                <TableHead>Código</TableHead>
                <TableHead>Nome (PT / EN)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {acabamentos.map((aca) => (
                <TableRow key={aca.id}>
                  <TableCell>
                    <Badge variant="secondary">{aca.codigo}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium"
                        style={
                          aca.cor_hex
                            ? { backgroundColor: aca.cor_hex, color: getContrastColor(aca.cor_hex) }
                            : {}
                        }
                      >
                        PT: {aca.nome_pt}
                      </span>
                      {aca.nome_en && (
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium opacity-80"
                          style={
                            aca.cor_hex
                              ? {
                                  backgroundColor: aca.cor_hex,
                                  color: getContrastColor(aca.cor_hex),
                                }
                              : {}
                          }
                        >
                          EN: {aca.nome_en}
                        </span>
                      )}
                    </div>
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FinishModal open={modalOpen} onOpenChange={setModalOpen} initialData={editData} />
    </div>
  )
}
