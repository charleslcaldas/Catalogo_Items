import pb from '@/lib/pocketbase/client'
import type { Potencial, PotencialItem } from '@/types'

export const getPotenciais = () => {
  return pb.collection<Potencial>('potenciais').getFullList({ sort: '-created' })
}

export const searchPotenciais = (term: string) => {
  let filter = ''
  if (term) {
    const t = term.replace(/"/g, '')
    filter = `numero_potencial ~ "${t}" || cliente ~ "${t}" || nome_potencial ~ "${t}" || proprietario ~ "${t}" || nome_comprador ~ "${t}"`
  }
  return pb.collection<Potencial>('potenciais').getList(1, 50, {
    filter,
    sort: '-created',
  })
}

export const getPotencialItens = (potencialId: string) => {
  return pb.collection<PotencialItem>('potencial_itens').getFullList({
    filter: `potencial_id = "${potencialId}"`,
    sort: 'ordem',
    expand: 'item_id,item_id.acabamento_id',
  })
}

export const savePotencialFull = async (
  potencialId: string | null,
  potencialData: Partial<Potencial> & { novos_anexos?: File[] },
  itemsData: Partial<PotencialItem>[],
) => {
  let savedPotencial: Potencial

  let dataToSave: any = { ...potencialData }
  if (potencialData.novos_anexos && potencialData.novos_anexos.length > 0) {
    dataToSave = new FormData()
    Object.keys(potencialData).forEach((key) => {
      if (key !== 'novos_anexos' && key !== 'expand' && key !== 'anexos') {
        const val = (potencialData as any)[key]
        if (val !== undefined && val !== null) {
          dataToSave.append(key, String(val))
        }
      }
    })
    potencialData.novos_anexos.forEach((file) => {
      dataToSave.append('anexos+', file)
    })
  } else {
    delete dataToSave.novos_anexos
    delete dataToSave.expand
    delete dataToSave.anexos
  }

  if (potencialId) {
    savedPotencial = await pb.collection('potenciais').update(potencialId, dataToSave)
    const oldItems = await pb
      .collection('potencial_itens')
      .getFullList({ filter: `potencial_id = "${potencialId}"` })
    await Promise.all(oldItems.map((i) => pb.collection('potencial_itens').delete(i.id)))
  } else {
    savedPotencial = await pb.collection('potenciais').create(dataToSave)
  }

  await Promise.all(
    itemsData.map((item) =>
      pb.collection('potencial_itens').create({
        ...item,
        potencial_id: savedPotencial.id,
      }),
    ),
  )

  return savedPotencial
}

export const addPotencialItens = async (items: Partial<PotencialItem>[]) => {
  return Promise.all(items.map((item) => pb.collection('potencial_itens').create(item)))
}
