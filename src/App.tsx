import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from './components/Layout'
import NotFound from './pages/NotFound'
import Dashboard from './pages/Dashboard'
import ItemsPage from './pages/items/ItemsPage'
import Categories from './pages/Categories'
import Lines from './pages/Lines'
import Finishes from './pages/Finishes'
import NCMPage from './pages/NCM'
import ImportPage from './pages/Import'
import AddItemsToPotential from './pages/potentials/AddItemsToPotential'
import Login from './pages/Login'
import { DataProvider } from './contexts/data-context'
import { AuthProvider } from './hooks/use-auth'
import { ProtectedRoute } from './components/ProtectedRoute'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <DataProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/itens" element={<ItemsPage />} />
                <Route path="/categorias" element={<Categories />} />
                <Route path="/linhas" element={<Lines />} />
                <Route path="/acabamentos" element={<Finishes />} />
                <Route path="/ncm" element={<NCMPage />} />
                <Route path="/importar" element={<ImportPage />} />
                <Route path="/potenciais/adicionar" element={<AddItemsToPotential />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </DataProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
