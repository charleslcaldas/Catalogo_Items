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

export default function Finishes() {
  const { acabamentos } = useData()

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Acabamentos</h1>
          <p className="text-muted-foreground">
            Tipos de acabamento para os materiais industriais.
          </p>
        </div>
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
                <TableHead>Nome (PT)</TableHead>
                <TableHead>Nome (EN)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {acabamentos.map((aca) => (
                <TableRow key={aca.id}>
                  <TableCell>
                    <Badge variant="secondary">{aca.codigo}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{aca.nome_pt}</TableCell>
                  <TableCell>{aca.nome_en}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
