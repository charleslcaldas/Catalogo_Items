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
import { DataProvider } from './contexts/data-context'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <DataProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/itens" element={<ItemsPage />} />
            <Route path="/categorias" element={<Categories />} />
            <Route path="/linhas" element={<Lines />} />
            <Route path="/acabamentos" element={<Finishes />} />
            <Route path="/ncm" element={<NCMPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </DataProvider>
  </BrowserRouter>
)

export default App
