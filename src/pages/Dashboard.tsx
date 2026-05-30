import { Link, useNavigate } from 'react-router-dom'
import { Package, Folders, RefreshCw, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useData } from '@/contexts/data-context'
import pb from '@/lib/pocketbase/client'

export default function Dashboard() {
  const { itens, categorias } = useData()
  const navigate = useNavigate()

  const ativos = itens.filter((i) => i.ativo).length

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do catálogo.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/categorias">Gerenciar Categorias</Link>
          </Button>
          <Button asChild>
            <Link to="/itens">
              <Plus className="mr-2 h-4 w-4" /> Novo Item
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate('/itens')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{itens.length}</div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate('/itens?status=Ativo')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens Ativos</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ativos}</div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate('/categorias')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
            <Folders className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categorias.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {itens.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-xl transition-colors cursor-pointer"
                onClick={() => navigate('/itens')}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={
                      item.foto_arquivo
                        ? pb.files.getURL(item, item.foto_arquivo, { thumb: '100x100' })
                        : item.foto_url || 'https://img.usecurling.com/p/100/100?q=tools'
                    }
                    alt={item.sku}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium leading-none">{item.sku}</p>
                    <p className="text-sm text-muted-foreground">{item.descr_pt}</p>
                  </div>
                </div>
              </div>
            ))}
            {itens.length === 0 && (
              <p className="text-muted-foreground text-sm py-4 text-center">
                Nenhum item encontrado.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
