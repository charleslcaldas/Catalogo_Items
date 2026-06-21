import { useState, useEffect } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

export function QuotationNotes({ potencialId }: { potencialId: string }) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')

  const loadNotes = async () => {
    try {
      const records = await pb.collection('potencial_notas').getFullList({
        filter: `potencial_id = "${potencialId}" && categoria = "cotacao"`,
        sort: '-created',
        expand: 'user_id',
      })
      setNotes(records)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    if (potencialId) loadNotes()
  }, [potencialId])

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    try {
      await pb.collection('potencial_notas').create({
        potencial_id: potencialId,
        user_id: user?.id,
        conteudo: newNote,
        categoria: 'cotacao',
      })
      setNewNote('')
      loadNotes()
    } catch {
      /* intentionally ignored */
    }
  }

  return (
    <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col gap-4">
      <h3 className="text-sm font-semibold">Notas de Negociação (Cotação)</h3>
      <div className="flex gap-2">
        <Textarea
          placeholder="Registre detalhes da negociação com os fornecedores..."
          className="min-h-[60px] text-xs resize-y flex-1"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        />
        <Button onClick={handleAddNote} disabled={!newNote.trim()} className="self-end">
          <Send className="w-4 h-4 mr-2" /> Salvar
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {notes.map((note) => (
          <div key={note.id} className="p-3 rounded-md bg-muted/50 text-xs">
            <div className="flex justify-between text-muted-foreground mb-1">
              <span className="font-semibold text-foreground">{note.expand?.user_id?.name}</span>
              <span>{new Date(note.created).toLocaleString()}</span>
            </div>
            <p className="whitespace-pre-wrap">{note.conteudo}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
