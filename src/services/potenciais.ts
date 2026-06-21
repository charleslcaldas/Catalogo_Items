import pb from '@/lib/pocketbase/client'
import type { Potencial, PotencialItem } from '@/types'

export const getPotenciais = () => {
  return pb
    .collection<Potencial>('potenciais')
    .getFullList({ sort: '-created', expand: 'estagio_id' })
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
    expand: 'estagio_id',
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
  potencialData: Partial<Potencial>,
  itemsData: Partial<PotencialItem>[],
) => {
  let savedPotencial: Potencial

  const dataToSave = { ...potencialData }
  delete dataToSave.expand
  delete dataToSave.anexos
  delete (dataToSave as any).novos_anexos

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

export const duplicatePotencial = async (potencialId: string) => {
  const original = await pb.collection('potenciais').getOne<Potencial>(potencialId)
  const items = await pb.collection('potencial_itens').getFullList<PotencialItem>({
    filter: `potencial_id = "${potencialId}"`,
  })

  const duplicatedData = { ...original, numero_potencial: `${original.numero_potencial}-COPY` }
  delete (duplicatedData as any).id
  delete (duplicatedData as any).created
  delete (duplicatedData as any).updated
  delete (duplicatedData as any).anexos
  delete (duplicatedData as any).expand

  const newPotencial = await pb.collection('potenciais').create(duplicatedData)

  await Promise.all(
    items.map((item) => {
      const duplicatedItem = { ...item, potencial_id: newPotencial.id }
      delete (duplicatedItem as any).id
      delete (duplicatedItem as any).created
      delete (duplicatedItem as any).updated
      delete (duplicatedItem as any).expand
      return pb.collection('potencial_itens').create(duplicatedItem)
    }),
  )

  return newPotencial
}
