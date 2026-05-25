import pb from '@/lib/pocketbase/client'
import type { Potencial, PotencialItem } from '@/types'

export const getPotenciais = () => {
  return pb.collection<Potencial>('potenciais').getFullList({ sort: '-created' })
}

export const addPotencialItens = async (items: Partial<PotencialItem>[]) => {
  return Promise.all(items.map((item) => pb.collection('potencial_itens').create(item)))
}
