import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import pb from '@/lib/pocketbase/client'
import { NcmAuditLog } from '@/types'
import { format } from 'date-fns'

export function NcmHistoryModal({
  open,
  onOpenChange,
  ncmId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  ncmId: string | null
}) {
  const [logs, setLogs] = useState<NcmAuditLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && ncmId) {
      setLoading(true)
      pb.collection('ncm_audit_logs')
        .getFullList<NcmAuditLog>({
          filter: `ncm_id = "${ncmId}"`,
          sort: '-created',
          expand: 'user_id',
        })
        .then(setLogs)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [open, ncmId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico de Alterações do NCM</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <p className="text-center py-4 text-muted-foreground">Carregando histórico...</p>
          ) : logs.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              Nenhum histórico encontrado para este NCM.
            </p>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border p-4 rounded-md space-y-2 text-sm bg-card">
                  <div className="flex justify-between items-center text-muted-foreground mb-2">
                    <span className="font-semibold text-foreground capitalize">
                      {log.action === 'create' ? 'Criação' : 'Atualização'}
                    </span>
                    <span>{format(new Date(log.created), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Usuário: {log.expand?.user_id?.name || log.expand?.user_id?.email || 'Sistema'}
                  </div>
                  {log.action === 'update' && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="space-y-1">
                        <strong className="text-xs text-muted-foreground">Antes:</strong>
                        <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(log.previous_values, null, 2)}
                        </pre>
                      </div>
                      <div className="space-y-1">
                        <strong className="text-xs text-muted-foreground">Depois:</strong>
                        <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap border-l-2 border-primary pl-2">
                          {JSON.stringify(log.new_values, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  {log.action === 'create' && (
                    <div className="mt-2 space-y-1">
                      <strong className="text-xs text-muted-foreground">Valores Iniciais:</strong>
                      <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(log.new_values, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
