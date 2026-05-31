import { Outlet } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'

export default function Layout() {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-2 md:p-4 md:max-w-[1400px] mx-auto w-full pt-2">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
