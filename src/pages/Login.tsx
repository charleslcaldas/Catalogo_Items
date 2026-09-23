import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ShieldAlert, Lock, Mail, Eye, EyeOff, Building2, CheckCircle2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Redireciona para o destino anterior ou para a raiz
  const from = (location.state as any)?.from?.pathname || '/'

  // Se já autenticado, redireciona de volta
  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const normalizedEmail = email.trim().toLowerCase()
    const { error: signInError } = await signIn(normalizedEmail, password)

    if (signInError) {
      console.error('Falha no login:', signInError)
      setError(
        'E-mail ou senha incorretos. Verifique suas credenciais e certifique-se de que seu usuário está cadastrado no sistema.',
      )
      setIsLoading(false)
    } else {
      navigate(from, { replace: true })
    }
  }

  const handleFillDemoUser = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('Skip@Pass')
    setError('')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative">
      {/* Background visual accents */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center text-primary shadow-sm mb-1">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            C2 International
          </h1>
          <p className="text-sm text-muted-foreground">
            Sistema de Gestão de Catálogo, Fabricantes e Cotações
          </p>
        </div>

        <Card className="shadow-lg border-border/60">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Acessar o Sistema</CardTitle>
            <CardDescription>
              Informe seu e-mail corporativo e senha cadastrados para continuar.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg animate-in fade-in">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu.nome@c2international.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Senha
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full font-medium" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Verificando credenciais...
                  </span>
                ) : (
                  'Entrar'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Informações de teste / Contas disponíveis */}
        <div className="rounded-lg border border-border/80 bg-muted/30 p-4 text-xs space-y-2 text-muted-foreground">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            Contas de acesso para o time:
          </div>
          <p>
            O acesso a todas as rotas e operações está protegido. Você pode usar uma das contas
            pré-configuradas para validação:
          </p>
          <div className="grid grid-cols-1 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handleFillDemoUser('charles@c2international.com.br')}
              className="text-left p-2 rounded bg-background border border-border hover:border-primary/50 transition-colors flex items-center justify-between"
            >
              <div>
                <span className="font-medium text-foreground block">
                  charles@c2international.com.br
                </span>
                <span className="text-[11px] text-muted-foreground">Charles (Admin)</span>
              </div>
              <span className="text-primary font-medium hover:underline text-[11px]">
                Preencher
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleFillDemoUser('equipe@c2international.com.br')}
              className="text-left p-2 rounded bg-background border border-border hover:border-primary/50 transition-colors flex items-center justify-between"
            >
              <div>
                <span className="font-medium text-foreground block">
                  equipe@c2international.com.br
                </span>
                <span className="text-[11px] text-muted-foreground">Equipe C2 (Operação)</span>
              </div>
              <span className="text-primary font-medium hover:underline text-[11px]">
                Preencher
              </span>
            </button>
          </div>
          <div className="text-[11px] text-muted-foreground/90 pt-1">
            Senha padrão de validação:{' '}
            <code className="bg-muted px-1 py-0.5 rounded font-mono text-foreground font-semibold">
              Skip@Pass
            </code>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          C2 International &copy; {new Date().getFullYear()} — Todos os direitos reservados.
        </div>
      </div>
    </div>
  )
}
