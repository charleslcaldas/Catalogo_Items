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
import { Plus, Pencil, ArrowRight, FilterX, Search } from 'lucide-react'
import { LineModal } from '@/components/MetadataModals'
import { getContrastColor } from '@/lib/utils'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function Lines() {
  const { linhas, categorias } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const filterCatId = searchParams.get('categoria_id')

  const getCatName = (id: string) => {
    const c = categorias.find((c) => c.id === id)
    if (!c) return 'N/A'
    return `${c.nome_pt}`
  }

  const getCatColor = (id: string) => {
    const c = categorias.find((c) => c.id === id)
    return c?.color || null
  }

  const filteredLinhas = linhas.filter((l) => {
    if (filterCatId && l.categoria_id !== filterCatId) return false
    const term = searchTerm.toLowerCase()
    return (
      l.nome_pt.toLowerCase().includes(term) ||
      (l.nome_en && l.nome_en.toLowerCase().includes(term)) ||
      l.superlinha_pt.toLowerCase().includes(term) ||
      (l.superlinha_en && l.superlinha_en.toLowerCase().includes(term)) ||
      getCatName(l.categoria_id).toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Linhas de Produto</h1>
              {filterCatId && (
                <Button variant="secondary" size="sm" onClick={() => setSearchParams({})}>
                  <FilterX className="h-4 w-4 mr-2" />
                  Limpar Filtro
                </Button>
              )}
            </div>
            <p className="text-muted-foreground">
              {filterCatId
                ? `Mostrando linhas da categoria: ${categorias.find((c) => c.id === filterCatId)?.nome_pt || 'Desconhecida'}`
                : 'Classificações específicas vinculadas às categorias.'}
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar linha..."
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
          Nova Linha
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Linhas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Linha</TableHead>
                <TableHead>Superlinha</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLinhas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhuma linha encontrada.
                  </TableCell>
                </TableRow>
              )}
              {filteredLinhas.map((lin) => (
                <TableRow
                  key={lin.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/itens?linha_id=${lin.id}`)}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{lin.nome_pt}</span>
                      {lin.nome_en && (
                        <span className="text-[12px] text-muted-foreground mt-0.5">
                          EN: {lin.nome_en}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{lin.superlinha_pt || '-'}</span>
                      {lin.superlinha_en && (
                        <span className="text-[12px] text-muted-foreground mt-0.5">
                          EN: {lin.superlinha_en}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold w-fit"
                      style={
                        getCatColor(lin.categoria_id)
                          ? {
                              backgroundColor: getCatColor(lin.categoria_id)!,
                              color: getContrastColor(getCatColor(lin.categoria_id)!),
                            }
                          : { backgroundColor: '#E5E7EB', color: '#1F2937' }
                      }
                    >
                      {getCatName(lin.categoria_id)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditData(lin)
                          setModalOpen(true)
                        }}
                        title="Editar Linha"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/itens?linha_id=${lin.id}`)
                        }}
                      >
                        Itens <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <LineModal open={modalOpen} onOpenChange={setModalOpen} initialData={editData} />
    </div>
  )
}
