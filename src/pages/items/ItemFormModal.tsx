import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useData } from '@/contexts/data-context'
import { Item } from '@/types'

export function ItemFormModal({
  open,
  onOpenChange,
  item,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: Item
}) {
  const { linhas, acabamentos, ncms, saveItem } = useData()
  const [formData, setFormData] = useState<Partial<Item>>({})

  useEffect(() => {
    if (item) setFormData(item)
    else
      setFormData({
        ativo: true,
        sincronizado_com_zoho: false,
        foto_url: 'https://img.usecurling.com/p/200/200?q=tools&color=gray',
      })
  }, [item, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveItem(formData as Item)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar Item' : 'Novo Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="atributos">Atributos</TabsTrigger>
              <TabsTrigger value="financeiro">Preço & Status</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input
                    required
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Material</Label>
                  <Input
                    required
                    value={formData.material || ''}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Descrição (PT)</Label>
                  <Input
                    required
                    value={formData.descr_pt || ''}
                    onChange={(e) => setFormData({ ...formData, descr_pt: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Descrição (EN)</Label>
                  <Input
                    value={formData.descr_en || ''}
                    onChange={(e) => setFormData({ ...formData, descr_en: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Foto URL</Label>
                  <Input
                    value={formData.foto_url || ''}
                    onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="atributos" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Linha</Label>
                  <Select
                    value={formData.linha_id}
                    onValueChange={(v) => setFormData({ ...formData, linha_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {linhas.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.nome_pt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Acabamento</Label>
                  <Select
                    value={formData.acabamento_id}
                    onValueChange={(v) => setFormData({ ...formData, acabamento_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {acabamentos.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome_pt} ({a.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>NCM</Label>
                  <Select
                    value={formData.ncm_id}
                    onValueChange={(v) => setFormData({ ...formData, ncm_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ncms.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.codigo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tamanho</Label>
                  <Input
                    value={formData.tamanho || ''}
                    onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="financeiro" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço de Compra</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.preco_compra || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, preco_compra: parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço de Venda</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.preco_venda || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, preco_venda: parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Item ID (Zoho Books)</Label>
                  <Input readOnly disabled value={formData.item_id_books || 'Não sincronizado'} />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(c) => setFormData({ ...formData, ativo: c })}
                  />
                  <Label htmlFor="ativo">Item Ativo</Label>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
