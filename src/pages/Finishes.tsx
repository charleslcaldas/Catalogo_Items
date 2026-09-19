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
import { Input } from '@/components/ui/input'
import { getContrastColor, cn, textMatchesAll } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { FinishModal } from '@/components/MetadataModals'
import { Acabamento } from '@/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type SortField = 'codigo' | 'nome_pt' | 'nome_en' | 'created'

export default function Finishes() {
  const { acabamentos } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<Acabamento | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField | null>('nome_pt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

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

  const filteredAcabamentos = acabamentos.filter((a) => {
    if (!searchTerm.trim()) return true
    const haystack = [a.codigo, a.nome_pt, a.nome_en].filter(Boolean).join(' ')
    return textMatchesAll(haystack, searchTerm)
  })

  const sortedAcabamentos = [...filteredAcabamentos].sort((a, b) => {
    if (!sortField) return 0

    if (sortField === 'created') {
      const timeA = a.created ? new Date(a.created).getTime() : 0
      const timeB = b.created ? new Date(b.created).getTime() : 0
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA
    }

    let valA = ''
    let valB = ''

    if (sortField === 'codigo') {
      valA = a.codigo || ''
      valB = b.codigo || ''
    } else if (sortField === 'nome_pt') {
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
            <h1 className="text-3xl font-bold tracking-tight">Acabamentos</h1>
            <p className="text-muted-foreground">
              Tipos de acabamento para os materiais industriais.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar acabamento..."
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
              <TableRow className="h-9">
                <TableHead
                  className="w-[120px] px-2 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('codigo')}
                >
                  Código <SortIcon field="codigo" />
                </TableHead>
                <TableHead
                  className="px-2 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('nome_pt')}
                >
                  Nome (PT) <SortIcon field="nome_pt" />
                </TableHead>
                <TableHead
                  className="px-2 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('nome_en')}
                >
                  Nome (EN) <SortIcon field="nome_en" />
                </TableHead>
                <TableHead
                  className="w-[140px] px-2 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('created')}
                >
                  Criado Em <SortIcon field="created" />
                </TableHead>
                <TableHead className="w-[80px] px-2 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAcabamentos.map((aca) => {
                const bgColor = aca.cor_hex || '#e2e8f0'
                const textColor = getContrastColor(bgColor)

                return (
                  <TableRow key={aca.id} className="hover:bg-muted/50 transition-colors h-11">
                    <TableCell className="font-medium py-1.5 px-2 text-sm overflow-hidden text-ellipsis whitespace-nowrap align-middle">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="font-mono text-xs cursor-default">
                            {aca.codigo}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start" className="text-xs">
                          <p>{aca.codigo}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="py-1.5 px-2 overflow-hidden align-middle">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full flex items-center">
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-[12px] text-xs font-medium border border-black/10 shadow-sm max-w-full truncate cursor-default"
                              style={{ backgroundColor: bgColor, color: textColor }}
                            >
                              <span className="truncate text-left">{aca.nome_pt}</span>
                            </span>
                          </div>
                        </TooltipTrigger>
                        {aca.nome_pt && (
                          <TooltipContent
                            side="bottom"
                            align="start"
                            className="max-w-xs break-words text-xs"
                          >
                            <p>{aca.nome_pt}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TableCell>
                    <TableCell className="py-1.5 px-2 text-sm overflow-hidden text-ellipsis whitespace-nowrap align-middle">
                      {aca.nome_en ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="truncate cursor-default">
                              <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-[12px] text-xs font-medium border border-black/10 shadow-sm max-w-full truncate opacity-90"
                                style={{ backgroundColor: bgColor, color: textColor }}
                              >
                                <span className="truncate text-left">{aca.nome_en}</span>
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            align="start"
                            className="max-w-xs break-words text-xs"
                          >
                            <p>{aca.nome_en}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5 px-2 text-sm text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap align-middle">
                      {aca.created ? new Date(aca.created).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell className="py-1.5 px-2 text-right align-middle">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditData(aca)
                          setModalOpen(true)
                        }}
                        title="Editar Acabamento"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {sortedAcabamentos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum acabamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FinishModal open={modalOpen} onOpenChange={setModalOpen} initialData={editData} />
    </div>
  )
}
