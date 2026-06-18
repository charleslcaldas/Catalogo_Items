import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Categoria, Linha, Acabamento, NCM, Item as BaseItem, AtributoLinha } from '@/types'
import { toast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'

export type Item = BaseItem & {
  descricao_base_id?: string
  unidade_id?: string
  ii?: number
  ipi?: number
  pis?: number
  cofins?: number
  comprimento_rosca_en?: string
}

export interface UnidadeMedida {
  id: string
  nome: string
}

export interface DescricaoBase {
  id: string
  codigo: string
  nome_pt: string
  nome_en: string
  categoria_id: string
  linha_id: string
  ncm_id: string
  ativo: boolean
}

interface DataContextType {
  categorias: Categoria[]
  linhas: Linha[]
  acabamentos: Acabamento[]
  ncms: NCM[]
  itens: Item[]
  atributosLinha: AtributoLinha[]
  unidadesMedida: UnidadeMedida[]
  descricoesBase: DescricaoBase[]
  saveItem: (item: Partial<Item>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  saveCategoria: (cat: Partial<Categoria>) => Promise<void>
  deleteCategoria: (id: string) => Promise<void>
  reloadMetadata: () => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [acabamentos, setAcabamentos] = useState<Acabamento[]>([])
  const [ncms, setNcms] = useState<NCM[]>([])
  const [itens, setItens] = useState<Item[]>([])
  const [atributosLinha, setAtributosLinha] = useState<AtributoLinha[]>([])
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadeMedida[]>([])
  const [descricoesBase, setDescricoesBase] = useState<DescricaoBase[]>([])
  const { isAuthenticated } = useAuth()

  const loadData = async () => {
    try {
      const [cats, lins, acabs, ncmData, atributosData, unids, descs] = await Promise.all([
        pb.collection('categorias').getFullList<Categoria>(),
        pb.collection('linhas').getFullList<Linha>({ expand: 'categoria_id' }),
        pb.collection('acabamentos').getFullList<Acabamento>(),
        pb.collection('ncm').getFullList<NCM>(),
        pb.collection('atributos_linha').getFullList<AtributoLinha>(),
        pb.collection('unidades_medida').getFullList<UnidadeMedida>(),
        pb.collection('descricoes_base').getFullList<DescricaoBase>(),
      ])
      setCategorias(cats)
      setLinhas(lins)
      setAcabamentos(acabs)
      setNcms(ncmData)
      setAtributosLinha(atributosData)
      setUnidadesMedida(unids)
      setDescricoesBase(descs)
    } catch (e) {
      console.error('Error loading base metadata', e)
    }

    try {
      const itemsData = await pb.collection('itens').getFullList<Item>({
        sort: '-created',
        expand: 'linha_id,linha_id.categoria_id,acabamento_id,ncm_id,descricao_base_id,unidade_id',
      })
      setItens(itemsData)
    } catch (e) {
      console.error('Error loading itens with relations', e)
      try {
        const fallbackItems = await pb.collection('itens').getFullList<Item>({ sort: '-created' })
        setItens(fallbackItems)
      } catch (err) {
        console.error('Error loading itens without relations', err)
      }
    }
  }

  const reloadMetadata = async () => {
    try {
      const [cats, lins, acabs, ncmData, atributosData, unids, descs] = await Promise.all([
        pb.collection('categorias').getFullList<Categoria>(),
        pb.collection('linhas').getFullList<Linha>({ expand: 'categoria_id' }),
        pb.collection('acabamentos').getFullList<Acabamento>(),
        pb.collection('ncm').getFullList<NCM>(),
        pb.collection('atributos_linha').getFullList<AtributoLinha>(),
        pb.collection('unidades_medida').getFullList<UnidadeMedida>(),
        pb.collection('descricoes_base').getFullList<DescricaoBase>(),
      ])
      setCategorias(cats)
      setLinhas(lins)
      setAcabamentos(acabs)
      setNcms(ncmData)
      setAtributosLinha(atributosData)
      setUnidadesMedida(unids)
      setDescricoesBase(descs)
    } catch (e) {
      console.error('Error reloading metadata', e)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    } else {
      setCategorias([])
      setLinhas([])
      setAcabamentos([])
      setNcms([])
      setItens([])
      setAtributosLinha([])
      setUnidadesMedida([])
      setDescricoesBase([])
    }
  }, [isAuthenticated])

  useRealtime<Item>(
    'itens',
    (e) => {
      if (isAuthenticated) {
        setItens((prev) => {
          if (e.action === 'create') {
            const exists = prev.some((i) => i.id === e.record.id)
            return exists
              ? prev.map((i) => (i.id === e.record.id ? e.record : i))
              : [e.record, ...prev]
          }
          if (e.action === 'update') {
            return prev.map((i) => (i.id === e.record.id ? e.record : i))
          }
          if (e.action === 'delete') {
            return prev.filter((i) => i.id !== e.record.id)
          }
          return prev
        })
      }
    },
    isAuthenticated,
  )

  const saveItem = async (item: Partial<Item>) => {
    if (item.id) {
      await pb.collection('itens').update(item.id, item)
    } else {
      await pb.collection('itens').create(item)
    }
  }

  const deleteItem = async (id: string) => {
    try {
      await pb.collection('itens').delete(id)
      toast({ title: 'Item excluído', variant: 'destructive' })
    } catch (e: any) {
      toast({ title: 'Erro ao excluir item', description: e.message, variant: 'destructive' })
    }
  }

  const saveCategoria = async (cat: Partial<Categoria>) => {
    try {
      if (cat.id) {
        const updated = await pb.collection('categorias').update<Categoria>(cat.id, cat)
        setCategorias((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        toast({ title: 'Categoria atualizada' })
      } else {
        const created = await pb.collection('categorias').create<Categoria>(cat)
        setCategorias((prev) => [created, ...prev])
        toast({ title: 'Categoria criada' })
      }
    } catch (e: any) {
      toast({ title: 'Erro ao salvar categoria', description: e.message, variant: 'destructive' })
    }
  }

  const deleteCategoria = async (id: string) => {
    try {
      await pb.collection('categorias').delete(id)
      setCategorias((prev) => prev.filter((c) => c.id !== id))
      toast({ title: 'Categoria excluída', variant: 'destructive' })
    } catch (e: any) {
      toast({ title: 'Erro ao excluir categoria', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <DataContext.Provider
      value={{
        categorias,
        linhas,
        acabamentos,
        ncms,
        itens,
        atributosLinha,
        unidadesMedida,
        descricoesBase,
        saveItem,
        deleteItem,
        saveCategoria,
        deleteCategoria,
        reloadMetadata,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used within DataProvider')
  return context
}
