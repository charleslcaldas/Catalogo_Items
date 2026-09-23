import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut, User, ShieldCheck } from 'lucide-react'

export function AppHeader() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    signOut()
    navigate('/login', { replace: true })
  }

  const userDisplayName = user?.name || user?.email?.split('@')[0] || 'Usuário'
  const userEmail = user?.email || ''

  const getInitials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur px-4 supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            C2 International
          </span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
            Produção
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 rounded-full pl-2 pr-3 flex items-center gap-2 hover:bg-muted"
              >
                <Avatar className="h-7 w-7 text-xs bg-primary/10 text-primary border border-primary/20">
                  <AvatarFallback className="font-semibold text-[11px]">
                    {getInitials(userDisplayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left max-w-[140px] md:max-w-[180px] hidden sm:flex">
                  <span className="text-xs font-medium truncate leading-none">
                    {userDisplayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                    {userEmail}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {userDisplayName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate">{userEmail}</p>
                  <div className="pt-1 flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <ShieldCheck className="h-3 w-3" />
                    Sessão autenticada
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer font-medium"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair do sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30 flex items-center gap-1.5 h-8 px-2.5"
          title="Encerrar sessão"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  )
}
