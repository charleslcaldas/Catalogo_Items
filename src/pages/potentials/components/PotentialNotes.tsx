import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

export function PotentialNotes({ potencialId }: { potencialId: string }) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadNotes = async () => {
    try {
      const records = await pb.collection('potencial_notas').getFullList({
        filter: `potencial_id = "${potencialId}"`,
        sort: '-created',
        expand: 'user_id',
      })
      setNotes(records)
    } catch (err) {
      console.error('Failed to load notes', err)
    }
  }

  useEffect(() => {
    if (potencialId) {
      loadNotes()
    }
  }, [potencialId])

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setIsSubmitting(true)
    try {
      await pb.collection('potencial_notas').create({
        potencial_id: potencialId,
        user_id: user?.id,
        conteudo: newNote,
      })
      setNewNote('')
      loadNotes()
      toast.success('Nota adicionada com sucesso.')
    } catch (err) {
      toast.error('Erro ao adicionar nota.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!potencialId) {
    return (
      <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Notas (Comunicação Interna)</h3>
        <p className="text-xs text-muted-foreground">
          Salve a cotação primeiro para adicionar notas.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col gap-4">
      <h3 className="text-sm font-semibold">Notas (Comunicação Interna)</h3>
      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Digite sua nota aqui..."
          className="min-h-[80px] text-xs resize-y"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleAddNote} disabled={isSubmitting || !newNote.trim()}>
            <Send className="h-3.5 w-3.5 mr-1.5" /> Salvar Nota
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className="flex flex-col gap-1 p-3 rounded-md bg-slate-50 border text-xs"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-semibold text-slate-700">
                {note.expand?.user_id?.name || 'Usuário Desconhecido'}
              </span>
              <span>{format(new Date(note.created), 'dd/MM/yyyy HH:mm')}</span>
            </div>
            <p className="whitespace-pre-wrap text-slate-800">{note.conteudo}</p>
          </div>
        ))}
        {notes.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Nenhuma nota adicionada ainda.
          </p>
        )}
      </div>
    </div>
  )
}
