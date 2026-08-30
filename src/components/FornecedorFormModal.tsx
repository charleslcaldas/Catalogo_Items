import React, { useState, useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Building2, MapPin, Globe, Layers, FileText, X, Plus, Check, Search } from 'lucide-react'
import { useData } from '@/contexts/data-context'
import { Fornecedor } from '@/types'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'

interface FornecedorFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Fornecedor | null
  onSaved?: (saved: Fornecedor) => void
}

export function FornecedorFormModal({
  open,
  onOpenChange,
  initialData,
  onSaved,
}: FornecedorFormModalProps) {
  const { linhas, reloadFornecedoresEContatos } = useData()
  const [saving, setSaving] = useState(false)
  const [linhaSearch, setLinhaSearch] = useState('')

  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    contato: '',
    email: '',
    telefone: '',
    website: '',
    endereco: '',
    cidade: '',
    estado: '',
    pais: 'Brasil',
    cep: '',
    itens_base_produz: '',
    linhas_ids: [] as string[],
    incoterm: '',
    tempo_fabricacao: '',
    condicao_pagamento: '',
    observacoes: '',
    ativo: true,
  })

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          nome: initialData.nome || '',
          cnpj: initialData.cnpj || '',
          contato: initialData.contato || '',
          email: initialData.email || '',
          telefone: initialData.telefone || '',
          website: initialData.website || '',
          endereco: initialData.endereco || '',
          cidade: initialData.cidade || '',
          estado: initialData.estado || '',
          pais: initialData.pais || 'Brasil',
          cep: initialData.cep || '',
          itens_base_produz: initialData.itens_base_produz || '',
          linhas_ids: Array.isArray(initialData.linhas_ids)
            ? initialData.linhas_ids
            : initialData.linhas_ids
              ? [initialData.linhas_ids]
              : [],
          incoterm: initialData.incoterm || '',
          tempo_fabricacao: initialData.tempo_fabricacao || '',
          condicao_pagamento: initialData.condicao_pagamento || '',
          observacoes: initialData.observacoes || '',
          ativo: initialData.ativo !== false,
        })
      } else {
        setFormData({
          nome: '',
          cnpj: '',
          contato: '',
          email: '',
          telefone: '',
          website: '',
          endereco: '',
          cidade: '',
          estado: '',
          pais: 'Brasil',
          cep: '',
          itens_base_produz: '',
          linhas_ids: [],
          incoterm: '',
          tempo_fabricacao: '',
          condicao_pagamento: '',
          observacoes: '',
          ativo: true,
        })
      }
      setLinhaSearch('')
    }
  }, [open, initialData])

  const toggleLinha = (id: string) => {
    setFormData((prev) => {
      const exists = prev.linhas_ids.includes(id)
      return {
        ...prev,
        linhas_ids: exists
          ? prev.linhas_ids.filter((item) => item !== id)
          : [...prev.linhas_ids, id],
      }
    })
  }

  const filteredLinhas = linhas.filter((l) => {
    if (!linhaSearch.trim()) return true
    const term = linhaSearch.toLowerCase()
    return (
      (l.nome_pt && l.nome_pt.toLowerCase().includes(term)) ||
      (l.nome_en && l.nome_en.toLowerCase().includes(term))
    )
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome.trim()) {
      toast.error('O nome do fabricante é obrigatório.')
      return
    }

    setSaving(true)
    const payload = {
      nome: formData.nome.trim(),
      cnpj: formData.cnpj.trim(),
      contato: formData.contato.trim(),
      email: formData.email.trim(),
      telefone: formData.telefone.trim(),
      website: formData.website.trim(),
      endereco: formData.endereco.trim(),
      cidade: formData.cidade.trim(),
      estado: formData.estado.trim(),
      pais: formData.pais.trim(),
      cep: formData.cep.trim(),
      itens_base_produz: formData.itens_base_produz.trim(),
      linhas_ids: formData.linhas_ids,
      incoterm: formData.incoterm.trim(),
      tempo_fabricacao: formData.tempo_fabricacao.trim(),
      condicao_pagamento: formData.condicao_pagamento.trim(),
      observacoes: formData.observacoes.trim(),
      ativo: formData.ativo,
    }

    try {
      let saved: Fornecedor
      if (initialData?.id) {
        saved = await pb
          .collection('fornecedores')
          .update<Fornecedor>(initialData.id, payload, { expand: 'linhas_ids' })
        toast.success('Fabricante atualizado com sucesso!')
      } else {
        saved = await pb
          .collection('fornecedores')
          .create<Fornecedor>(payload, { expand: 'linhas_ids' })
        toast.success('Fabricante cadastrado com sucesso!')
      }
      await reloadFornecedoresEContatos()
      onSaved?.(saved)
      onOpenChange(false)
    } catch (err: any) {
      toast.error('Erro ao salvar fabricante', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="w-5 h-5 text-primary" />
            {initialData ? 'Editar Fabricante' : 'Novo Fabricante'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Dados Principais */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Informações Gerais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nome">
                  Nome do Fabricante / Razão Social <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nome"
                  required
                  placeholder="Ex: Ciser Parafusos e Porcas"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cnpj">CNPJ / Tax ID</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="website"
                    placeholder="https://www.fabricante.com"
                    className="pl-8"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail Principal de Contato</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="comercial@fabricante.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telefone">Telefone Principal</Label>
                <Input
                  id="telefone"
                  placeholder="+55 11 3456-7890"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="contato">Representante / Contato Principal</Label>
                <Input
                  id="contato"
                  placeholder="Nome do ponto focal principal ou gerente comercial"
                  value={formData.contato}
                  onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Endereço & Localização */}
          <div className="space-y-3 pt-2 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Endereço e Localização
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="endereco">Logradouro / Endereço Completo</Label>
                <Input
                  id="endereco"
                  placeholder="Rua, Av, Número, Bairro, Galpão..."
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cep">CEP / Código Postal</Label>
                <Input
                  id="cep"
                  placeholder="00000-000"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  placeholder="Ex: Joinville"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="estado">Estado (UF)</Label>
                <Input
                  id="estado"
                  placeholder="Ex: SC ou Santa Catarina"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pais">País</Label>
                <Input
                  id="pais"
                  placeholder="Ex: Brasil, China, Taiwan..."
                  value={formData.pais}
                  onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Linhas & Itens Base Produzidos */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4" /> Linhas e Itens Base que Produz
              </h3>
              <span className="text-xs text-muted-foreground">
                {formData.linhas_ids.length} linha(s) selecionada(s)
              </span>
            </div>

            <div className="space-y-2">
              <Label>Linhas Cadastradas no Catálogo</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filtrar linhas disponíveis..."
                  value={linhaSearch}
                  onChange={(e) => setLinhaSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              {/* Tags selecionadas */}
              {formData.linhas_ids.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-muted/40 rounded-md border min-h-[40px] items-center">
                  {formData.linhas_ids.map((id) => {
                    const l = linhas.find((item) => item.id === id)
                    if (!l) return null
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="gap-1 pr-1 pl-2 py-0.5 text-xs font-normal"
                      >
                        <span>{l.nome_pt}</span>
                        <button
                          type="button"
                          onClick={() => toggleLinha(id)}
                          className="text-muted-foreground hover:text-foreground rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}

              {/* Seletor de Linhas */}
              <ScrollArea className="h-32 rounded-md border p-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {filteredLinhas.map((linha) => {
                    const isSelected = formData.linhas_ids.includes(linha.id)
                    return (
                      <button
                        type="button"
                        key={linha.id}
                        onClick={() => toggleLinha(linha.id)}
                        className={`text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between transition-colors border ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary font-medium'
                            : 'bg-card hover:bg-muted text-foreground border-border'
                        }`}
                      >
                        <span className="truncate pr-1">{linha.nome_pt}</span>
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    )
                  })}
                  {filteredLinhas.length === 0 && (
                    <div className="col-span-full py-4 text-center text-xs text-muted-foreground">
                      Nenhuma linha encontrada.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label htmlFor="itens_base_produz">
                Itens Base / Famílias / Capacidades de Produção (Texto Livre)
              </Label>
              <Textarea
                id="itens_base_produz"
                rows={2}
                placeholder="Ex: Parafusos sextavados 8.8 e 10.9, barras roscadas inox 304/316, porcas pesadas ASTM A194 2H, abraçadeiras tipo D..."
                value={formData.itens_base_produz}
                onChange={(e) => setFormData({ ...formData, itens_base_produz: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">
                Descreva outros itens, bitolas, normas ou materiais específicos que o fabricante
                produz.
              </p>
            </div>
          </div>

          {/* Condições Comerciais */}
          <div className="space-y-3 pt-2 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" /> Condições Comerciais Padrão
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="incoterm">Incoterm Padrão</Label>
                <Input
                  id="incoterm"
                  placeholder="Ex: FOB Ningbo, EXW, CIF Santos"
                  value={formData.incoterm}
                  onChange={(e) => setFormData({ ...formData, incoterm: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tempo_fabricacao">Lead Time / Tempo Fabricação</Label>
                <Input
                  id="tempo_fabricacao"
                  placeholder="Ex: 30 a 45 dias"
                  value={formData.tempo_fabricacao}
                  onChange={(e) => setFormData({ ...formData, tempo_fabricacao: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="condicao_pagamento">Condição de Pagamento</Label>
                <Input
                  id="condicao_pagamento"
                  placeholder="Ex: 30% TT adiantado + 70% BL"
                  value={formData.condicao_pagamento}
                  onChange={(e) => setFormData({ ...formData, condicao_pagamento: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="observacoes">Observações Gerais / Histórico</Label>
                <Textarea
                  id="observacoes"
                  rows={2}
                  placeholder="Informações adicionais, histórico de auditorias, capacidades técnicas, requisitos de embalagem..."
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label htmlFor="ativo" className="cursor-pointer">
                Fabricante Ativo no Sistema
              </Label>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Cadastrar Fabricante'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
