import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Folders,
  AlignJustify,
  Paintbrush,
  BookText,
  Receipt,
  UploadCloud,
  Target,
  PanelLeftClose,
  PanelLeftOpen,
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
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'

const items = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Itens', url: '/itens', icon: Package },
  { title: 'Categorias', url: '/categorias', icon: Folders },
  { title: 'Linhas', url: '/linhas', icon: AlignJustify },
  { title: 'Acabamentos', url: '/acabamentos', icon: Paintbrush },
  { title: 'Configurações NCM', url: '/ncm', icon: Receipt },
  { title: 'Descrições Base', url: '/descricoes-base', icon: BookText },
  { title: 'Potenciais', url: '/potenciais', icon: Target },
  { title: 'Importar do Airtable', url: '/importar', icon: UploadCloud },
]

export function AppSidebar() {
  const location = useLocation()
  const { toggleSidebar, state } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-2">
        <div className="flex items-center group-data-[collapsible=icon]:justify-center justify-between">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden px-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
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
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleSidebar} tooltip="Alternar Sidebar">
              {state === 'expanded' ? (
                <PanelLeftClose className="h-4 w-4 shrink-0" />
              ) : (
                <PanelLeftOpen className="h-4 w-4 shrink-0" />
              )}
              <span>{state === 'expanded' ? 'Recolher Menu' : 'Expandir Menu'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
