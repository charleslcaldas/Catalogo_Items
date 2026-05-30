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
import { Plus, Pencil, ArrowRight, Search } from 'lucide-react'
import { CategoryModal } from '@/components/MetadataModals'
import { getContrastColor } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

export default function Categories() {
  const { categorias } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  const filteredCategories = categorias.filter((c) => {
    const term = searchTerm.toLowerCase()
    return (
      c.nome_pt.toLowerCase().includes(term) ||
      (c.nome_en && c.nome_en.toLowerCase().includes(term))
    )
  })

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
            <p className="text-muted-foreground">Gerencie as categorias principais de produtos.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar categoria..."
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
          Nova Categoria
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome (PT)</TableHead>
                <TableHead>Nome (EN)</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Criado Em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((cat) => (
                <TableRow
                  key={cat.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/linhas?categoria_id=${cat.id}`)}
                >
                  <TableCell className="font-medium">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold w-fit"
                      style={
                        cat.color
                          ? { backgroundColor: cat.color, color: getContrastColor(cat.color) }
                          : { backgroundColor: '#E5E7EB', color: '#1F2937' }
                      }
                    >
                      {cat.nome_pt}
                    </span>
                  </TableCell>
                  <TableCell>{cat.nome_en || '-'}</TableCell>
                  <TableCell>
                    {cat.color && (
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded border"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs uppercase text-muted-foreground font-mono">
                          {cat.color}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{new Date(cat.created).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditData(cat)
                          setModalOpen(true)
                        }}
                        title="Editar Categoria"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/linhas?categoria_id=${cat.id}`)
                        }}
                      >
                        Linhas <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCategories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma categoria encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CategoryModal open={modalOpen} onOpenChange={setModalOpen} initialData={editData} />
    </div>
  )
}
