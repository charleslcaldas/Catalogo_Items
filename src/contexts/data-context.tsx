import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Categoria, Linha, Acabamento, NCM, Item, AtributoLinha } from '@/types'
import { toast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'

interface DataContextType {
  categorias: Categoria[]
  linhas: Linha[]
  acabamentos: Acabamento[]
  ncms: NCM[]
  itens: Item[]
  atributosLinha: AtributoLinha[]
  saveItem: (item: Partial<Item>) => void
  deleteItem: (id: string) => void
  saveCategoria: (cat: Partial<Categoria>) => void
  deleteCategoria: (id: string) => void
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
  const { isAuthenticated } = useAuth()

  const loadData = async () => {
    try {
      const [cats, lins, acabs, ncmData, itemsData, atributosData] = await Promise.all([
        pb.collection('categorias').getFullList<Categoria>(),
        pb.collection('linhas').getFullList<Linha>({ expand: 'categoria_id,ncm_id' }),
        pb.collection('acabamentos').getFullList<Acabamento>(),
        pb.collection('ncm').getFullList<NCM>(),
        pb.collection('itens').getFullList<Item>({ sort: '-created' }),
        pb.collection('atributos_linha').getFullList<AtributoLinha>(),
      ])
      setCategorias(cats)
      setLinhas(lins)
      setAcabamentos(acabs)
      setNcms(ncmData)
      setItens(itemsData)
      setAtributosLinha(atributosData)
    } catch (e) {
      console.error('Error loading data', e)
    }
  }

  const reloadMetadata = async () => {
    try {
      const [cats, lins, acabs, ncmData, atributosData] = await Promise.all([
        pb.collection('categorias').getFullList<Categoria>(),
        pb.collection('linhas').getFullList<Linha>({ expand: 'categoria_id,ncm_id' }),
        pb.collection('acabamentos').getFullList<Acabamento>(),
        pb.collection('ncm').getFullList<NCM>(),
        pb.collection('atributos_linha').getFullList<AtributoLinha>(),
      ])
      setCategorias(cats)
      setLinhas(lins)
      setAcabamentos(acabs)
      setNcms(ncmData)
      setAtributosLinha(atributosData)
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
    }
  }, [isAuthenticated])

  useRealtime(
    'itens',
    () => {
      if (isAuthenticated) {
        pb.collection('itens').getFullList<Item>({ sort: '-created' }).then(setItens)
      }
    },
    isAuthenticated,
  )

  const saveItem = async (item: Partial<Item>) => {
    try {
      if (item.id) {
        await pb.collection('itens').update(item.id, item)
        toast({ title: 'Item atualizado', description: 'O item foi salvo com sucesso.' })
      } else {
        await pb.collection('itens').create(item)
        toast({ title: 'Item criado', description: 'Novo item adicionado ao catálogo.' })
      }
    } catch (e: any) {
      toast({ title: 'Erro ao salvar item', description: e.message, variant: 'destructive' })
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
