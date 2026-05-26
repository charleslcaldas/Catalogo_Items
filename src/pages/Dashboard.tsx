import { Link, useNavigate } from 'react-router-dom'
import { Package, Folders, RefreshCw, AlertCircle, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useData } from '@/contexts/data-context'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import pb from '@/lib/pocketbase/client'

export default function Dashboard() {
  const { itens, categorias } = useData()
  const navigate = useNavigate()

  const ativos = itens.filter((i) => i.ativo).length
  const pendentes = itens.filter((i) => !i.sincronizado_com_zoho).length
  const sincronizados = itens.length - pendentes

  const chartData = [
    { name: 'Sincronizados', value: sincronizados, color: 'var(--color-sincronizados)' },
    { name: 'Pendentes', value: pendentes, color: 'var(--color-pendentes)' },
  ]
  const chartConfig = {
    sincronizados: { label: 'Sincronizados', color: 'hsl(var(--chart-2))' },
    pendentes: { label: 'Pendentes', color: 'hsl(var(--chart-3))' },
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do catálogo e sincronização.</p>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          onClick={() => navigate('/itens?filter=ativo')}
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
          onClick={() => navigate('/itens?filter=pendente')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes Sync</CardTitle>
            <AlertCircle
              className={`h-4 w-4 ${pendentes > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendentes}</div>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
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
                  <div>
                    {item.sincronizado_com_zoho ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200"
                      >
                        Sincronizado
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200"
                      >
                        Pendente
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Status de Sincronização</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center items-center p-0 pb-4 h-[250px]">
            <ChartContainer config={chartConfig} className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
