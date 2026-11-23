import { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
export function RuntimeCompatibilityPanel() {
  const { user } = useAuth()
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (user?.email !== 'charles@c2international.com.br') return null
  const check = async () => {
    setBusy(true)
    setError('')
    try {
      setResult(await pb.send('/backend/v1/cotacoes/compatibilidade', { method: 'GET' }))
    } catch (_) {
      setError('Não foi possível verificar o servidor. A confirmação deve continuar desativada.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section
      className="rounded border p-4 space-y-2"
      aria-label="Diagnóstico temporário do administrador"
    >
      <p className="font-medium">Conferência do ambiente de confirmação</p>
      <p className="text-sm text-muted-foreground">
        Consulta técnica temporária. Não confirma compras nem altera dados.
      </p>
      <Button disabled={busy} onClick={check}>
        {busy ? 'Verificando…' : 'Verificar ambiente'}
      </Button>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div role="status">
          <p>
            {result.ok
              ? 'Funções necessárias disponíveis; prosseguir para validação do pacote.'
              : 'Compatibilidade não comprovada. Manter a confirmação desativada.'}
          </p>
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </section>
  )
}
