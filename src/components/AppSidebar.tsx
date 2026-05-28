import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Folders,
  AlignJustify,
  Paintbrush,
  Receipt,
  UploadCloud,
  Target,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const items = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Itens', url: '/itens', icon: Package },
  { title: 'Categorias', url: '/categorias', icon: Folders },
  { title: 'Linhas', url: '/linhas', icon: AlignJustify },
  { title: 'Acabamentos', url: '/acabamentos', icon: Paintbrush },
  { title: 'Configurações NCM', url: '/ncm', icon: Receipt },
  { title: 'Potenciais', url: '/potenciais/adicionar', icon: Target },
  { title: 'Importar do Airtable', url: '/importar', icon: UploadCloud },
]

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 px-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-sidebar-foreground leading-none">
              Skip
            </span>
            <span className="text-xs text-sidebar-foreground/70 leading-none">
              Inventory System
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
