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
import { Plus, Pencil, Search, ArrowUpDown, ArrowUp, ArrowDown, FilterX } from 'lucide-react'
import { CategoryModal } from '@/components/MetadataModals'
import { getContrastColor } from '@/lib/utils'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Categoria } from '@/types'

import { Badge } from '@/components/ui/badge'

type SortField = 'nome_pt' | 'nome_en' | 'linhas' | 'created'

export default function Categories() {
  const { categorias, linhas } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<Categoria | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField | null>('nome_pt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const filterCategoriaId = searchParams.get('categoria_id') || searchParams.get('id')

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

  const filteredCategories = categorias.filter((c) => {
    if (filterCategoriaId && c.id !== filterCategoriaId) return false
    const term = searchTerm.toLowerCase().trim()
    if (!term) return true
    return (
      c.nome_pt.toLowerCase().includes(term) ||
      (c.nome_en && c.nome_en.toLowerCase().includes(term))
    )
  })

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    if (!sortField) return 0

    if (sortField === 'linhas') {
      const countA = linhas.filter((l) => l.categoria_id === a.id).length
      const countB = linhas.filter((l) => l.categoria_id === b.id).length
      return sortOrder === 'asc' ? countA - countB : countB - countA
    }

    if (sortField === 'created') {
      const timeA = new Date(a.created).getTime()
      const timeB = new Date(b.created).getTime()
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA
    }

    let valA = ''
    let valB = ''

    if (sortField === 'nome_pt') {
      valA = a.nome_pt || ''
      valB = b.nome_pt || ''
    } else if (sortField === 'nome_en') {
      valA = a.nome_en || ''
      valB = b.nome_en || ''
    }

    const comparison = valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base' })
    return sortOrder === 'asc' ? comparison : -comparison
  })

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
              {filterCategoriaId && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSearchParams({})}
                  className="h-8"
                >
                  <FilterX className="h-4 w-4 mr-1.5" />
                  Limpar Filtro
                </Button>
              )}
            </div>
            <p className="text-muted-foreground">
              {filterCategoriaId
                ? `Mostrando categoria selecionada: ${categorias.find((c) => c.id === filterCategoriaId)?.nome_pt || 'Desconhecida'}`
                : 'Gerencie as categorias principais de produtos.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            {(searchTerm || filterCategoriaId) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setSearchParams({})
                }}
                className="h-10 text-muted-foreground"
              >
                <FilterX className="h-4 w-4 mr-1.5" /> Limpar
              </Button>
            )}
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
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('nome_pt')}
                >
                  Nome (PT) <SortIcon field="nome_pt" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('nome_en')}
                >
                  Nome (EN) <SortIcon field="nome_en" />
                </TableHead>
                <TableHead
                  className="text-center cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('linhas')}
                >
                  Linhas de Produto <SortIcon field="linhas" />
                </TableHead>
                <TableHead>Cor</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('created')}
                >
                  Criado Em <SortIcon field="created" />
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCategories.map((cat) => {
                const linhasCount = linhas.filter((l) => l.categoria_id === cat.id).length

                return (
                  <TableRow
                    key={cat.id}
                    className={`hover:bg-muted/50 transition-colors group ${
                      filterCategoriaId === cat.id
                        ? 'bg-primary/5 font-medium ring-1 ring-primary/20'
                        : ''
                    }`}
                  >
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        onClick={() => navigate(`/linhas?categoria_id=${cat.id}`)}
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold w-fit transition-transform hover:scale-105 hover:opacity-90 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                        style={
                          cat.color
                            ? { backgroundColor: cat.color, color: getContrastColor(cat.color) }
                            : { backgroundColor: '#E5E7EB', color: '#1F2937' }
                        }
                        title={`Clique para visualizar as linhas de produto da categoria ${cat.nome_pt}`}
                      >
                        {cat.nome_pt}
                      </button>
                    </TableCell>
                    <TableCell>{cat.nome_en || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className="font-medium cursor-pointer hover:bg-secondary/80 transition-colors"
                        onClick={() => navigate(`/linhas?categoria_id=${cat.id}`)}
                        title={`Ver ${linhasCount} linha(s) desta categoria`}
                      >
                        {linhasCount} {linhasCount === 1 ? 'linha' : 'linhas'}
                      </Badge>
                    </TableCell>
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
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {sortedCategories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
