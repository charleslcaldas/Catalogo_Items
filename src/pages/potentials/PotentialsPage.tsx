import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import pb from '@/lib/pocketbase/client'
import type { Potencial } from '@/types'
import { useRealtime } from '@/hooks/use-realtime'

export default function PotentialsPage() {
  const [potentials, setPotentials] = useState<Potencial[]>([])
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadPotentials = async () => {
    setLoading(true)
    try {
      let filter = ''
      if (search) {
        const t = search.replace(/"/g, '')
        filter = `numero_potencial ~ "${t}" || cliente ~ "${t}" || nome_potencial ~ "${t}" || proprietario ~ "${t}"`
      }

      const res = await pb.collection<Potencial>('potenciais').getList(1, 50, {
        filter,
        sort: '-created',
      })

      const ids = res.items.map((p) => p.id)
      if (ids.length > 0) {
        const itemsFilter = ids.map((id) => `potencial_id = "${id}"`).join(' || ')
        const itemsRes = await pb
          .collection('potencial_itens')
          .getFullList({ filter: itemsFilter, fields: 'id,potencial_id' })

        const counts: Record<string, number> = {}
        itemsRes.forEach((item) => {
          counts[item.potencial_id] = (counts[item.potencial_id] || 0) + 1
        })
        setItemCounts(counts)
      } else {
        setItemCounts({})
      }
      setPotentials(res.items)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const delay = setTimeout(() => {
      loadPotentials()
    }, 300)
    return () => clearTimeout(delay)
  }, [search])

  useRealtime('potenciais', () => {
    loadPotentials()
  })

  useRealtime('potencial_itens', () => {
    loadPotentials()
  })

  const getStatusBadge = (p: Potencial) => {
    const count = itemCounts[p.id] || 0
    if (count === 0) {
      return (
        <Badge variant="secondary" className="bg-slate-200 text-slate-700">
          Sem itens
        </Badge>
      )
    }

    const isCompleted =
      p.estagio === 'Proposta Enviada' ||
      p.estagio === 'Fechado Ganho' ||
      p.estagio === 'Fechado Perdido'

    if (isCompleted) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
          Itens completo
        </Badge>
      )
    }

    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
        Itens parcial
      </Badge>
    )
  }

  return (
    <div className="flex flex-col p-4 md:p-6 max-w-[1600px] mx-auto w-full h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cotações (Potenciais)</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as cotações e potenciais de vendas
          </p>
        </div>
        <Button asChild>
          <Link to="/potenciais/adicionar">
            <Plus className="mr-2 h-4 w-4" /> Nova Cotação
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="p-4 border-b flex items-center gap-4 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por número, cliente, nome ou proprietário..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow>
                <TableHead>Número Potencial</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Nome Potencial</TableHead>
                <TableHead>Proprietário</TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead>Status dos Itens</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && potentials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : potentials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Nenhuma cotação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                potentials.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.numero_potencial}</TableCell>
                    <TableCell>{p.cliente || '-'}</TableCell>
                    <TableCell>{p.nome_potencial || '-'}</TableCell>
                    <TableCell>{p.proprietario || '-'}</TableCell>
                    <TableCell>{p.estagio || '-'}</TableCell>
                    <TableCell>{getStatusBadge(p)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/potenciais/adicionar?id=${p.id}`}>Editar</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
