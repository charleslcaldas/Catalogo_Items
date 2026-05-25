import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Categoria, Linha, Acabamento, NCM, Item } from '@/types'
import { mockCategorias, mockLinhas, mockAcabamentos, mockNCM, mockItens } from '@/data/mock'
import { toast } from '@/hooks/use-toast'

interface DataContextType {
  categorias: Categoria[]
  linhas: Linha[]
  acabamentos: Acabamento[]
  ncms: NCM[]
  itens: Item[]
  saveItem: (item: Partial<Item>) => void
  deleteItem: (id: string) => void
  saveCategoria: (cat: Partial<Categoria>) => void
  deleteCategoria: (id: string) => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [categorias, setCategorias] = useState<Categoria[]>(mockCategorias)
  const [linhas, setLinhas] = useState<Linha[]>(mockLinhas)
  const [acabamentos, setAcabamentos] = useState<Acabamento[]>(mockAcabamentos)
  const [ncms, setNcms] = useState<NCM[]>(mockNCM)
  const [itens, setItens] = useState<Item[]>(mockItens)

  const saveItem = (item: Partial<Item>) => {
    if (item.id) {
      setItens((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? ({ ...i, ...item, atualizado_em: new Date().toISOString() } as Item)
            : i,
        ),
      )
      toast({ title: 'Item atualizado', description: 'O item foi salvo com sucesso.' })
    } else {
      const newItem = {
        ...item,
        id: `itm-${Date.now()}`,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      } as Item
      setItens((prev) => [newItem, ...prev])
      toast({ title: 'Item criado', description: 'Novo item adicionado ao catálogo.' })
    }
  }

  const deleteItem = (id: string) => {
    setItens((prev) => prev.filter((i) => i.id !== id))
    toast({ title: 'Item excluído', variant: 'destructive' })
  }

  const saveCategoria = (cat: Partial<Categoria>) => {
    if (cat.id) {
      setCategorias((prev) =>
        prev.map((c) =>
          c.id === cat.id
            ? ({ ...c, ...cat, atualizado_em: new Date().toISOString() } as Categoria)
            : c,
        ),
      )
      toast({ title: 'Categoria atualizada' })
    } else {
      const newCat = {
        ...cat,
        id: `cat-${Date.now()}`,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      } as Categoria
      setCategorias((prev) => [newCat, ...prev])
      toast({ title: 'Categoria criada' })
    }
  }

  const deleteCategoria = (id: string) => {
    setCategorias((prev) => prev.filter((c) => c.id !== id))
    toast({ title: 'Categoria excluída', variant: 'destructive' })
  }

  return (
    <DataContext.Provider
      value={{
        categorias,
        linhas,
        acabamentos,
        ncms,
        itens,
        saveItem,
        deleteItem,
        saveCategoria,
        deleteCategoria,
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
