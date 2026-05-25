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

  const getCatName = (id: string) => {
    const c = categorias.find((c) => c.id === id)
    if (!c) return 'N/A'
    return `${c.nome_pt} / ${c.nome_en || c.nome_pt}`
  }

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
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#E5E7EB] text-[#1F2937] w-fit">
                        {lin.nome_pt} / {lin.nome_en || lin.nome_pt}
                      </span>
                      {lin.superlinha_pt && (
                        <span className="text-[12px] text-[#6B7280] mt-1">
                          {lin.superlinha_pt} / {lin.superlinha_en || lin.superlinha_pt}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lin.superlinha_pt} / {lin.superlinha_en || lin.superlinha_pt}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#E5E7EB] text-[#1F2937] w-fit">
                      {getCatName(lin.categoria_id)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
