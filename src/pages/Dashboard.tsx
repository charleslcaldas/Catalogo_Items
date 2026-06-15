import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package, Folders, RefreshCw, Layers, Target, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { Badge } from '@/components/ui/badge'

export default function Dashboard() {
  const navigate = useNavigate()

  const [itens, setItens] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [potenciais, setPotenciais] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [itensData, catData, potData] = await Promise.all([
        pb.collection('itens').getFullList({ expand: 'linha_id.categoria_id', sort: '-updated' }),
        pb.collection('categorias').getFullList(),
        pb.collection('potenciais').getFullList(),
      ])
      setItens(itensData)
      setCategorias(catData)
      setPotenciais(potData)
    } catch (e) {
      console.error('Error fetching dashboard data:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useRealtime('itens', fetchData)
  useRealtime('potenciais', fetchData)
  useRealtime('categorias', fetchData)

  const ativos = itens.filter((i) => i.ativo).length
  const totalItens = itens.length
  const totalCategorias = categorias.length
  const openPotenciais = potenciais.filter(
    (p) => p.estagio !== 'Fechado' && p.estagio !== 'Perdido',
  ).length

  const recentItens = useMemo(() => {
    return [...itens]
      .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
      .slice(0, 5)
  }, [itens])

  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    itens.forEach((item) => {
      const catName = item.expand?.linha_id?.expand?.categoria_id?.nome_pt || 'Sem Categoria'
      counts[catName] = (counts[catName] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [itens])

  const potentialsByStage = useMemo(() => {
    const counts: Record<string, number> = {}
    potenciais.forEach((p) => {
      const estagio = p.estagio || 'Sem Estágio'
      counts[estagio] = (counts[estagio] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [potenciais])

  const chartConfig = {
    value: { label: 'Quantidade', color: 'hsl(var(--primary))' },
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-8 h-full overflow-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do catálogo e pipeline de vendas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/linhas">
              <Layers className="mr-2 h-4 w-4" /> Linhas
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/potenciais">
              <Target className="mr-2 h-4 w-4" /> Potenciais
            </Link>
          </Button>
          <Button asChild>
            <Link to="/itens">
              <Package className="mr-2 h-4 w-4" /> Itens
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate('/itens?showInactive=true')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItens}</div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate('/itens')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens Ativos</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ativos}</div>
            <p className="text-xs text-muted-foreground">
              {totalItens > 0 ? Math.round((ativos / totalItens) * 100) : 0}% do catálogo
            </p>
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
            <div className="text-2xl font-bold">{totalCategorias}</div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate('/potenciais')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potenciais Abertos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openPotenciais}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Itens por Categoria</CardTitle>
            <CardDescription>Distribuição do catálogo</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center h-[300px]">
            {categoryDistribution.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : null
                      }
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Sem dados suficientes
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline de Vendas</CardTitle>
            <CardDescription>Potenciais por estágio</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {potentialsByStage.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={potentialsByStage}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="value"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                      barSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Sem dados suficientes
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>Últimos itens atualizados no catálogo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentItens.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/itens?itemId=${item.id}`)}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={item.foto_url || 'https://img.usecurling.com/p/100/100?q=tools'}
                    alt={item.sku}
                    className="h-10 w-10 rounded-lg object-cover bg-muted"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium leading-none">{item.sku}</p>
                      {!item.ativo && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {item.descricao_curta || item.descr_pt || 'Sem descrição'}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                  {new Date(item.updated).toLocaleDateString('pt-BR')}
                </div>
              </div>
            ))}
            {recentItens.length === 0 && !isLoading && (
              <p className="text-muted-foreground text-sm py-4 text-center">
                Nenhum item encontrado.
              </p>
            )}
            {isLoading && recentItens.length === 0 && (
              <div className="flex items-center justify-center h-20 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
