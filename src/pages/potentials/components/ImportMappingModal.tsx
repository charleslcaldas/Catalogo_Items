import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export function ImportMappingModal({ open, onOpenChange, headers, onConfirm, summary }: any) {
  const [skuIndex, setSkuIndex] = useState<string>('0')
  const [priceIndex, setPriceIndex] = useState<string>('1')
  const [moqIndex, setMoqIndex] = useState<string>('-1')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mapeamento de Colunas</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Coluna SKU</Label>
            <Select value={skuIndex} onValueChange={setSkuIndex}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {headers.map((h: string, i: number) => (
                  <SelectItem key={i} value={i.toString()}>
                    {h || `Coluna ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Coluna Preço (Ofertado)</Label>
            <Select value={priceIndex} onValueChange={setPriceIndex}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {headers.map((h: string, i: number) => (
                  <SelectItem key={i} value={i.toString()}>
                    {h || `Coluna ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Coluna Quantidade Mínima (MOQ) - Opcional</Label>
            <Select value={moqIndex} onValueChange={setMoqIndex}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-1">Não importar MOQ</SelectItem>
                {headers.map((h: string, i: number) => (
                  <SelectItem key={i} value={i.toString()}>
                    {h || `Coluna ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {summary && (
            <div className="text-sm text-muted-foreground pt-2">
              <p>Total de linhas processáveis: {summary.total}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(parseInt(skuIndex), parseInt(priceIndex), parseInt(moqIndex))}
          >
            Importar Dados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
