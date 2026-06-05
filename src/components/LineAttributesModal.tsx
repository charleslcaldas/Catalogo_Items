import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import type { AtributoLinha, Linha } from '@/types'

export function LineAttributesModal({
  open,
  onOpenChange,
  linha,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  linha: Linha | null
}) {
  const [atributos, setAtributos] = useState<AtributoLinha[]>([])
  const [loading, setLoading] = useState(false)

  const defaultFields = [
    { key: 'tamanho', label: 'Tamanho (Size)' },
    { key: 'tipo_rosca', label: 'Tipo de Rosca (Thread Type)' },
    { key: 'comprimento_rosca', label: 'Comp. Rosca (Thread Length)' },
    { key: 'classe_material', label: 'Classe/Grau do Material' },
    { key: 'norma', label: 'Norma (Standard)' },
  ]

  useEffect(() => {
    if (linha && open) {
      fetchAtributos()
    }
  }, [linha, open])

  const fetchAtributos = async () => {
    if (!linha) return
    try {
      const records = await pb.collection('atributos_linha').getFullList<AtributoLinha>({
        filter: `linha_id="${linha.id}"`,
      })

      const merged = defaultFields.map((df) => {
        const existing = records.find(
          (r) => r.campo_sistema === df.key || r.tipo_atributo === df.key,
        )
        if (existing) return existing
        return {
          id: '',
          linha_id: linha.id,
          campo_sistema: df.key,
          nome_customizado: '',
          ativo: true,
          created: '',
          updated: '',
        } as AtributoLinha
      })

      setAtributos(merged)
    } catch (err) {
      toast.error('Erro ao carregar configurações.')
    }
  }

  const handleSave = async () => {
    setLoading(true)
    const toastId = toast.loading('Salvando configurações...')
    try {
      for (const attr of atributos) {
        if (attr.id) {
          await pb.collection('atributos_linha').update(attr.id, {
            nome_customizado: attr.nome_customizado,
            ativo: attr.ativo,
          })
        } else {
          await pb.collection('atributos_linha').create({
            linha_id: attr.linha_id,
            campo_sistema: attr.campo_sistema,
            nome_customizado: attr.nome_customizado,
            ativo: attr.ativo,
          })
        }
      }
      toast.success('Configurações salvas!', { id: toastId })
      onOpenChange(false)
    } catch (err) {
      toast.error('Erro ao salvar.', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  if (!linha) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Configuração de Campos Técnicos - {linha.nome_pt}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campo Técnico</TableHead>
                <TableHead>Nome Customizado</TableHead>
                <TableHead className="text-center">Ativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atributos.map((attr, idx) => {
                const df = defaultFields.find(
                  (f) => f.key === attr.campo_sistema || f.key === attr.tipo_atributo,
                )
                return (
                  <TableRow key={attr.campo_sistema || attr.tipo_atributo || idx}>
                    <TableCell className="font-medium">{df?.label || attr.campo_sistema}</TableCell>
                    <TableCell>
                      <Input
                        placeholder="Ex: Dimensão"
                        value={
                          attr.nome_customizado ||
                          (attr.nome_campo_customizado === '-'
                            ? ''
                            : attr.nome_campo_customizado) ||
                          ''
                        }
                        onChange={(e) => {
                          const newAttrs = [...atributos]
                          newAttrs[idx] = { ...newAttrs[idx], nome_customizado: e.target.value }
                          setAtributos(newAttrs)
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Switch
                          checked={attr.ativo !== false}
                          onCheckedChange={(val) => {
                            const newAttrs = [...atributos]
                            newAttrs[idx] = { ...newAttrs[idx], ativo: val }
                            setAtributos(newAttrs)
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
