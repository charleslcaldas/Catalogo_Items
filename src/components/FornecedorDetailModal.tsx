import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Building2,
  MapPin,
  Globe,
  Mail,
  Phone,
  Layers,
  Clock,
  CreditCard,
  Ship,
  FileText,
  Edit2,
  Trash2,
  UserPlus,
  Users,
  MessageSquare,
  ExternalLink,
  Plus,
} from 'lucide-react'
import { Fornecedor, ContatoFornecedor } from '@/types'
import { useData } from '@/contexts/data-context'
import { ContatoModal } from '@/components/MetadataModals'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'

interface FornecedorDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fornecedor: Fornecedor | null
  onEditFornecedor?: (fornecedor: Fornecedor) => void
}

export function FornecedorDetailModal({
  open,
  onOpenChange,
  fornecedor,
  onEditFornecedor,
}: FornecedorDetailModalProps) {
  const { linhas, contatosFornecedor, reloadFornecedoresEContatos } = useData()
  const [contatoModalOpen, setContatoModalOpen] = useState(false)
  const [editingContato, setEditingContato] = useState<ContatoFornecedor | null>(null)
  const [deletingContato, setDeletingContato] = useState<ContatoFornecedor | null>(null)

  if (!fornecedor) return null

  // Contatos deste fabricante
  const contatos = contatosFornecedor.filter((c) => c.fabricante_id === fornecedor.id)

  // Linhas resolvidas
  const linhasIds = Array.isArray(fornecedor.linhas_ids)
    ? fornecedor.linhas_ids
    : fornecedor.linhas_ids
      ? [fornecedor.linhas_ids]
      : []

  const resolvedLinhas = linhas.filter((l) => linhasIds.includes(l.id))

  const handleDeleteContato = async () => {
    if (!deletingContato) return
    try {
      await pb.collection('contatos_fornecedor').delete(deletingContato.id)
      toast.success('Contato removido com sucesso!')
      await reloadFornecedoresEContatos()
      setDeletingContato(null)
    } catch (err: any) {
      toast.error('Erro ao excluir contato', { description: err.message })
    }
  }

  // Montar string de endereço
  const enderecoPartes = [
    fornecedor.endereco,
    fornecedor.cidade,
    fornecedor.estado,
    fornecedor.cep ? `CEP ${fornecedor.cep}` : '',
    fornecedor.pais,
  ].filter(Boolean)
  const enderecoCompleto = enderecoPartes.join(', ')

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {/* Top Banner / Header */}
          <div className="bg-muted/40 p-6 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-2xl font-bold tracking-tight">
                      {fornecedor.nome}
                    </DialogTitle>
                    {fornecedor.ativo ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                    {fornecedor.auditado && (
                      <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                        Auditado
                      </Badge>
                    )}
                  </div>
                  {fornecedor.cnpj && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      CNPJ: {fornecedor.cnpj}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    onEditFornecedor?.(fornecedor)
                  }}
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar Fabricante
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Grid de Informações: Contato Geral, Localização, Condições */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Contato e Canais */}
              <Card className="shadow-none border-muted">
                <CardHeader className="py-3 px-4 bg-muted/20 border-b">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-primary" /> Contato Principal
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2.5 text-xs">
                  {fornecedor.contato ? (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">
                        Representante:
                      </span>
                      <span className="font-medium text-foreground">{fornecedor.contato}</span>
                    </div>
                  ) : null}

                  {fornecedor.email ? (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">E-mail Geral:</span>
                      <a
                        href={`mailto:${fornecedor.email}`}
                        className="text-primary hover:underline flex items-center gap-1 font-medium"
                      >
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{fornecedor.email}</span>
                      </a>
                    </div>
                  ) : null}

                  {fornecedor.telefone ? (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">
                        Telefone Geral:
                      </span>
                      <a
                        href={`tel:${fornecedor.telefone}`}
                        className="text-foreground hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span>{fornecedor.telefone}</span>
                      </a>
                    </div>
                  ) : null}

                  {fornecedor.website ? (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Website:</span>
                      <a
                        href={
                          fornecedor.website.startsWith('http')
                            ? fornecedor.website
                            : `https://${fornecedor.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate">{fornecedor.website}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    </div>
                  ) : null}

                  {!fornecedor.contato &&
                    !fornecedor.email &&
                    !fornecedor.telefone &&
                    !fornecedor.website && (
                      <span className="text-muted-foreground italic">
                        Nenhum contato direto cadastrado.
                      </span>
                    )}
                </CardContent>
              </Card>

              {/* Card 2: Localização */}
              <Card className="shadow-none border-muted">
                <CardHeader className="py-3 px-4 bg-muted/20 border-b">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> Endereço & Localização
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2.5 text-xs">
                  {enderecoCompleto ? (
                    <>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Endereço:</span>
                        <span className="text-foreground leading-relaxed">
                          {fornecedor.endereco || 'Logradouro não informado'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">
                            Cidade/UF:
                          </span>
                          <span className="font-medium text-foreground">
                            {[fornecedor.cidade, fornecedor.estado].filter(Boolean).join(' - ') ||
                              '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">País:</span>
                          <span className="font-medium text-foreground">
                            {fornecedor.pais || 'Brasil'}
                          </span>
                        </div>
                      </div>
                      {fornecedor.cep && (
                        <div>
                          <span className="text-muted-foreground block text-[11px]">CEP:</span>
                          <span className="font-mono text-foreground">{fornecedor.cep}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground italic">Endereço não informado.</span>
                  )}
                </CardContent>
              </Card>

              {/* Card 3: Condições Comerciais */}
              <Card className="shadow-none border-muted">
                <CardHeader className="py-3 px-4 bg-muted/20 border-b">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" /> Condições Comerciais
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2.5 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px] flex items-center gap-1">
                      <Ship className="w-3 h-3" /> Incoterm Padrão:
                    </span>
                    <span className="font-medium text-foreground">
                      {fornecedor.incoterm || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Tempo Fabricação / Lead:
                    </span>
                    <span className="font-medium text-foreground">
                      {fornecedor.tempo_fabricacao || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px] flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> Condição Pagamento:
                    </span>
                    <span className="font-medium text-foreground">
                      {fornecedor.condicao_pagamento || '-'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Linhas e Itens Base que o fabricante produz */}
            <Card className="shadow-none border-muted">
              <CardHeader className="py-3 px-4 bg-muted/20 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" /> Linhas e Itens Base Produzidos
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {resolvedLinhas.length} linha(s) vinculada(s)
                </span>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {resolvedLinhas.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-2">
                      Linhas do Catálogo:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {resolvedLinhas.map((linha) => (
                        <Badge
                          key={linha.id}
                          variant="secondary"
                          className="text-xs px-2.5 py-1 gap-1 font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          {linha.nome_pt}
                          {linha.nome_en && (
                            <span className="text-[10px] opacity-75 font-normal">
                              ({linha.nome_en})
                            </span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {fornecedor.itens_base_produz && (
                  <div className={resolvedLinhas.length > 0 ? 'pt-2 border-t' : ''}>
                    <span className="text-xs text-muted-foreground block mb-1">
                      Descrição de Itens Base / Capacidades de Produção:
                    </span>
                    <p className="text-xs text-foreground bg-muted/30 p-2.5 rounded-md border leading-relaxed whitespace-pre-wrap">
                      {fornecedor.itens_base_produz}
                    </p>
                  </div>
                )}

                {resolvedLinhas.length === 0 && !fornecedor.itens_base_produz && (
                  <p className="text-xs text-muted-foreground italic py-2">
                    Nenhuma linha ou item base especificado para este fabricante.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Observações gerais */}
            {fornecedor.observacoes && (
              <div className="space-y-1.5 bg-muted/20 p-3 rounded-lg border text-xs">
                <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[11px] block">
                  Observações Gerais:
                </span>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {fornecedor.observacoes}
                </p>
              </div>
            )}

            {/* Lista de Contatos Vinculados */}
            <Card className="shadow-none border-muted">
              <CardHeader className="py-3 px-4 bg-muted/20 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Contatos Vinculados ({contatos.length})
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Equipe, diretores, gerentes e analistas deste fabricante.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setEditingContato(null)
                    setContatoModalOpen(true)
                  }}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Adicionar Contato
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-[180px]">Nome</TableHead>
                        <TableHead className="w-[130px]">Cargo</TableHead>
                        <TableHead className="w-[180px]">E-mail</TableHead>
                        <TableHead className="w-[130px]">Telefone</TableHead>
                        <TableHead className="w-[130px]">WhatsApp</TableHead>
                        <TableHead className="w-[100px]">WeChat</TableHead>
                        <TableHead>Observações</TableHead>
                        <TableHead className="w-[80px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contatos.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="h-24 text-center text-muted-foreground text-xs"
                          >
                            Nenhum contato individual cadastrado para este fabricante.
                            <br />
                            <Button
                              variant="link"
                              size="sm"
                              className="mt-1 h-auto p-0 text-primary"
                              onClick={() => {
                                setEditingContato(null)
                                setContatoModalOpen(true)
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Cadastrar primeiro contato
                            </Button>
                          </TableCell>
                        </TableRow>
                      ) : (
                        contatos.map((c) => {
                          const fullName = [c.nome, c.sobrenome].filter(Boolean).join(' ')
                          return (
                            <TableRow key={c.id} className="hover:bg-muted/30 text-xs">
                              <TableCell className="font-semibold text-foreground">
                                {fullName}
                              </TableCell>
                              <TableCell>
                                {c.cargo ? (
                                  <Badge
                                    variant="outline"
                                    className="font-normal text-[11px] py-0 h-5"
                                  >
                                    {c.cargo}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {c.email ? (
                                  <a
                                    href={`mailto:${c.email}`}
                                    className="text-primary hover:underline flex items-center gap-1 truncate max-w-[170px]"
                                  >
                                    <Mail className="w-3 h-3 shrink-0" />
                                    <span>{c.email}</span>
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {c.telefone ? (
                                  <span className="text-foreground">{c.telefone}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {c.whatsapp ? (
                                  <a
                                    href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 font-medium"
                                  >
                                    <MessageSquare className="w-3 h-3 shrink-0" />
                                    <span>{c.whatsapp}</span>
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {c.wechat ? (
                                  <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">
                                    {c.wechat}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell
                                className="text-muted-foreground max-w-[150px] truncate"
                                title={c.observacoes || ''}
                              >
                                {c.observacoes || '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      setEditingContato(c)
                                      setContatoModalOpen(true)
                                    }}
                                    title="Editar Contato"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => setDeletingContato(c)}
                                    title="Excluir Contato"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de criação/edição de contato vinculado a este fabricante */}
      <ContatoModal
        open={contatoModalOpen}
        onOpenChange={(v) => {
          setContatoModalOpen(v)
          if (!v) setEditingContato(null)
        }}
        initialData={editingContato}
        defaultFabricanteId={fornecedor.id}
      />

      {/* Dialog de confirmação para exclusão de contato */}
      <AlertDialog
        open={!!deletingContato}
        onOpenChange={(open) => {
          if (!open) setDeletingContato(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contato?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente remover o contato{' '}
              <strong>
                {[deletingContato?.nome, deletingContato?.sobrenome].filter(Boolean).join(' ')}
              </strong>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteContato}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
