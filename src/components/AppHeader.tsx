import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'

export function AppHeader() {
  const { isMobile } = useSidebar()

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background px-4 shadow-sm md:px-6">
      <div className="flex items-center gap-4">{isMobile && <SidebarTrigger />}</div>
      <div className="flex items-center gap-4"></div>
    </header>
  )
}
