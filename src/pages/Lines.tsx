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
import {
  Plus,
  Trash2,
  FilterX,
  Search,
  Settings,
  Percent,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
} from 'lucide-react'
import { LineAttributesModal } from '@/components/LineAttributesModal'
import { LineModal } from '@/components/MetadataModals'
import { getContrastColor } from '@/lib/utils'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import { Linha } from '@/types'

export default function Lines() {
  const { linhas, categorias } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<Linha | null>(null)
  const [attrModalOpen, setAttrModalOpen] = useState(false)
  const [attrData, setAttrData] = useState<Linha | null>(null)
  const [lineToDelete, setLineToDelete] = useState<Linha | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [marginModalOpen, setMarginModalOpen] = useState(false)
  const [marginData, setMarginData] = useState<Linha | null>(null)
  const [tempMargin, setTempMargin] = useState('')
  const [sortField, setSortField] = useState<
    'nome_pt' | 'nome_en' | 'categoria' | 'margem_padrao' | null
  >('nome_pt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
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

  const handleSort = (field: 'nome_pt' | 'nome_en' | 'categoria' | 'margem_padrao') => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else {
        // Toggle back to asc
        setSortOrder('asc')
      }
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({
    field,
  }: {
    field: 'nome_pt' | 'nome_en' | 'categoria' | 'margem_padrao'
  }) => {
    if (sortField !== field)
      return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50 inline-block" />
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1.5 h-3.5 w-3.5 inline-block text-primary" />
    ) : (
      <ArrowDown className="ml-1.5 h-3.5 w-3.5 inline-block text-primary" />
    )
  }

  const filteredLinhas = linhas.filter((l) => {
    if (filterCatId && l.categoria_id !== filterCatId) return false
    const term = searchTerm.toLowerCase().trim()
    if (!term) return true
    return (
      (l.nome_pt && l.nome_pt.toLowerCase().includes(term)) ||
      (l.nome_en && l.nome_en.toLowerCase().includes(term)) ||
      getCatName(l.categoria_id).toLowerCase().includes(term)
    )
  })

  const sortedLinhas = [...filteredLinhas].sort((a, b) => {
    if (!sortField) return 0

    if (sortField === 'margem_padrao') {
      const valA = a.margem_padrao != null ? a.margem_padrao : 7.5
      const valB = b.margem_padrao != null ? b.margem_padrao : 7.5
      return sortOrder === 'asc' ? valA - valB : valB - valA
    }

    let valA = ''
    let valB = ''

    if (sortField === 'nome_pt') {
      valA = a.nome_pt || ''
      valB = b.nome_pt || ''
    } else if (sortField === 'nome_en') {
      valA = a.nome_en || ''
      valB = b.nome_en || ''
    } else if (sortField === 'categoria') {
      valA = getCatName(a.categoria_id) || ''
      valB = getCatName(b.categoria_id) || ''
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
                  Name (EN) <SortIcon field="nome_en" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('categoria')}
                >
                  Categoria <SortIcon field="categoria" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('margem_padrao')}
                >
                  Margem Padrão <SortIcon field="margem_padrao" />
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLinhas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma linha encontrada.
                  </TableCell>
                </TableRow>
              )}
              {sortedLinhas.map((lin) => {
                return (
                  <TableRow
                    key={lin.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => {
                      navigate(`/itens?linha_id=${lin.id}`)
                    }}
                    title={`Clique para visualizar os itens da linha ${lin.nome_pt}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        {lin.color ? (
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0 shadow-sm"
                            style={{ backgroundColor: lin.color }}
                            title={`Cor da linha: ${lin.color}`}
                          />
                        ) : (
                          <div
                            className="w-3.5 h-3.5 rounded-full bg-muted border border-border shrink-0"
                            title="Sem cor definida"
                          />
                        )}
                        <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                          {lin.nome_pt}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{lin.nome_en || '-'}</span>
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {lin.margem_padrao != null ? `${lin.margem_padrao}%` : '7.5% (Global)'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
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
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            setMarginData(lin)
                            setTempMargin(lin.margem_padrao?.toString() || '')
                            setMarginModalOpen(true)
                          }}
                          title="Configurar Margem Padrão"
                        >
                          <Percent className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAttrData(lin)
                            setAttrModalOpen(true)
                          }}
                          title="Configurar Campos Técnicos"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            setLineToDelete(lin)
                          }}
                          title="Excluir Linha"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <LineModal open={modalOpen} onOpenChange={setModalOpen} initialData={editData} />
      <LineAttributesModal open={attrModalOpen} onOpenChange={setAttrModalOpen} linha={attrData} />

      <AlertDialog open={marginModalOpen} onOpenChange={setMarginModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Configurar Margem Padrão</AlertDialogTitle>
            <AlertDialogDescription>
              Defina a margem padrão para a linha <strong>{marginData?.nome_pt}</strong>. Deixe em
              branco para usar o padrão global (7.5%).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="number"
              step="0.1"
              placeholder="7.5"
              value={tempMargin}
              onChange={(e) => setTempMargin(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!marginData) return
                try {
                  const val = tempMargin ? parseFloat(tempMargin) : null
                  await pb.collection('linhas').update(marginData.id, { margem_padrao: val })
                  toast.success('Margem atualizada com sucesso')
                  setMarginModalOpen(false)
                } catch (error: any) {
                  toast.error('Erro ao atualizar margem', { description: error.message })
                }
              }}
            >
              Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!lineToDelete}
        onOpenChange={(open) => {
          if (!open) setLineToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir a linha <strong>{lineToDelete?.nome_pt}</strong>? Esta ação
              não pode ser desfeita e pode afetar itens vinculados a ela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!lineToDelete) return
                try {
                  await pb.collection('linhas').delete(lineToDelete.id)
                  toast.success('Linha excluída com sucesso')
                } catch (error: any) {
                  toast.error('Erro ao excluir linha', { description: error.message })
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
