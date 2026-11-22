import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

/**
 * Estágio Zoho — SOMENTE LEITURA. O estágio do Zoho CRM nunca é alterado pela
 * conclusão da cotação de compras; é exibido apenas como referência.
 */
export default function EstagioZohoReadOnly({ potencialId }: { potencialId?: string | null }) {
  const [stage, setStage] = useState<string>('')
  const [link, setLink] = useState<string>('')

  useEffect(() => {
    if (!potencialId) return
    let alive = true
    pb.collection('potenciais')
      .getOne(potencialId)
      .then((rec: any) => {
        if (!alive) return
        setStage(rec.zoho_origem === 'manual' ? '' : rec.zoho_last_sync_status || '')
        setLink(rec.zoho_link || '')
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [potencialId])

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
        Estágio Zoho:
      </span>
      <div
        className="h-7 px-3 flex items-center bg-muted/50 border rounded-md text-xs font-mono text-muted-foreground min-w-[7rem]"
        title="Somente leitura — sincronizado do Zoho CRM (integração pendente de credencial)"
      >
        {stage || '—'}
      </div>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:text-blue-800"
          title="Abrir no Zoho CRM"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  )
}
