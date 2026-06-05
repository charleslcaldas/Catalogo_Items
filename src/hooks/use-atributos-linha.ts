import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import type { AtributoLinha } from '@/types'

export function useAtributosLinha() {
  const [atributos, setAtributos] = useState<AtributoLinha[]>([])

  const loadData = async () => {
    try {
      const records = await pb.collection('atributos_linha').getFullList<AtributoLinha>()
      setAtributos(records)
    } catch (err) {
      console.error('Failed to load atributos_linha', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('atributos_linha', () => {
    loadData()
  })

  return atributos
}
