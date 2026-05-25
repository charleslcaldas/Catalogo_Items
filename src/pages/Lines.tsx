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

export default function Lines() {
  const { linhas, categorias } = useData()

  const getCatName = (id: string) => categorias.find((c) => c.id === id)?.nome_pt || 'N/A'

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Linhas de Produto</h1>
          <p className="text-muted-foreground">
            Classificações específicas vinculadas às categorias.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Linhas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Linha (PT)</TableHead>
                <TableHead>Superlinha (PT)</TableHead>
                <TableHead>Categoria</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((lin) => (
                <TableRow key={lin.id}>
                  <TableCell className="font-medium">{lin.nome_pt}</TableCell>
                  <TableCell>{lin.superlinha_pt}</TableCell>
                  <TableCell>{getCatName(lin.categoria_id)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
