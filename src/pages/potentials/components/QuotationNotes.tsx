import { useState, useEffect } from 'react'
import { Send, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

export function QuotationNotes({
  potencialId,
  cotacoesF = [],
}: {
  potencialId: string
  cotacoesF?: any[]
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [selectedFornecedor, setSelectedFornecedor] = useState<string>('all')
  const [filterFornecedor, setFilterFornecedor] = useState<string>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const loadNotes = async () => {
    try {
      const records = await pb.collection('potencial_notas').getFullList({
        filter: `potencial_id = "${potencialId}" && categoria = "cotacao"`,
        sort: '-created',
        expand: 'user_id,fornecedor_id',
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
        fornecedor_id: selectedFornecedor !== 'all' ? selectedFornecedor : null,
      })
      setNewNote('')
      loadNotes()
      toast({ title: 'Nota adicionada' })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta nota?')) return
    try {
      await pb.collection('potencial_notas').delete(id)
      loadNotes()
      toast({ title: 'Nota excluída' })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleSaveEdit = async (id: string) => {
    if (!editContent.trim()) return
    try {
      await pb.collection('potencial_notas').update(id, { conteudo: editContent })
      setEditingId(null)
      loadNotes()
      toast({ title: 'Nota atualizada' })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const filteredNotes = notes.filter(
    (n) => filterFornecedor === 'all' || n.fornecedor_id === filterFornecedor,
  )
  const uniqueFornecedores = Array.from(
    new Map(
      cotacoesF
        .map((c) => c.expand?.fornecedor_id)
        .filter(Boolean)
        .map((f) => [f.id, f]),
    ).values(),
  )

  return (
    <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Notas de Negociação</h3>
        <Select value={filterFornecedor} onValueChange={setFilterFornecedor}>
          <SelectTrigger className="h-7 w-[200px] text-xs">
            <SelectValue placeholder="Filtrar por fornecedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os fornecedores</SelectItem>
            {uniqueFornecedores.map((f: any) => (
              <SelectItem key={f.id} value={f.id}>
                {f.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border">
        <div className="flex gap-2">
          <Select value={selectedFornecedor} onValueChange={setSelectedFornecedor}>
            <SelectTrigger className="h-8 w-[200px] text-xs bg-background">
              <SelectValue placeholder="Vincular fornecedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sem vínculo (Geral)</SelectItem>
              {uniqueFornecedores.map((f: any) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 items-start">
          <Textarea
            placeholder="Registre detalhes da negociação..."
            className="min-h-[60px] text-xs resize-y flex-1"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <Button onClick={handleAddNote} disabled={!newNote.trim()} className="h-full">
            <Send className="w-4 h-4 mr-2" /> Salvar
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2">
        {filteredNotes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhuma nota encontrada.</p>
        ) : (
          filteredNotes.map((note) => (
            <div key={note.id} className="p-3 rounded-md bg-muted/50 border text-xs group relative">
              <div className="flex justify-between items-center text-muted-foreground mb-1.5 border-b pb-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {note.expand?.user_id?.name}
                  </span>
                  {note.expand?.fornecedor_id && (
                    <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium border border-amber-200">
                      {note.expand?.fornecedor_id?.nome}
                    </span>
                  )}
                </div>
                <span>{new Date(note.created).toLocaleString()}</span>
              </div>

              {editingId === note.id ? (
                <div className="flex flex-col gap-2 mt-2">
                  <Textarea
                    className="min-h-[60px] text-xs resize-y"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={() => handleSaveEdit(note.id)}>
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap mt-1">{note.conteudo}</p>
              )}

              {(user?.id === note.user_id || true) && editingId !== note.id && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex bg-background/80 backdrop-blur rounded border shadow-sm">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setEditingId(note.id)
                      setEditContent(note.conteudo)
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
