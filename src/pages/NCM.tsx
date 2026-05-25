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

export default function NCMPage() {
  const { ncms } = useData()

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações NCM</h1>
          <p className="text-muted-foreground">Tabela de impostos e tributos.</p>
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
                <TableHead>Código NCM</TableHead>
                <TableHead className="text-right">II (%)</TableHead>
                <TableHead className="text-right">IPI (%)</TableHead>
                <TableHead className="text-right">PIS (%)</TableHead>
                <TableHead className="text-right">COFINS (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ncms.map((ncm) => (
                <TableRow key={ncm.id}>
                  <TableCell className="font-medium font-mono">{ncm.codigo}</TableCell>
                  <TableCell className="text-right">{ncm.ii}%</TableCell>
                  <TableCell className="text-right">{ncm.ipi}%</TableCell>
                  <TableCell className="text-right">{ncm.pis}%</TableCell>
                  <TableCell className="text-right">{ncm.cofins}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
