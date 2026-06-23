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
import { Plus, Trash2, ArrowRight, FilterX, Search, Settings, Percent } from 'lucide-react'
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
                <TableHead>Nome (PT)</TableHead>
                <TableHead>Name (EN)</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Margem Padrão</TableHead>
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
                  onClick={() => {
                    setEditData(lin)
                    setModalOpen(true)
                  }}
                >
                  <TableCell>
                    <span className="font-semibold text-sm">{lin.nome_pt}</span>
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
                    <div className="flex items-center justify-end gap-2">
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
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/itens?linha_id=${lin.id}`)
                        }}
                      >
                        Itens <ArrowRight className="ml-2 h-4 w-4" />
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
              ))}
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
