import pb from '@/lib/pocketbase/client'
import type { Potencial, PotencialItem } from '@/types'
import { buildFieldAccentCondition } from '@/lib/utils'

export const getPotenciais = () => {
  return pb
    .collection<Potencial>('potenciais')
    .getFullList({ sort: '-created', expand: 'estagio_id' })
}

export const searchPotenciais = (term: string) => {
  let filter = ''
  if (term) {
    const tokens = term
      .split(/\s+/)
      .map((t) => t.trim().replace(/"/g, ''))
      .filter(Boolean)
    const fields = [
      'numero_potencial',
      'cliente',
      'nome_potencial',
      'proprietario',
      'nome_comprador',
    ]
    if (tokens.length > 0) {
      filter = tokens
        .map((token) => {
          const clauses = fields.map((f) => buildFieldAccentCondition(f, token, 2)).filter(Boolean)
          return `(${clauses.join(' || ')})`
        })
        .filter((clause) => clause !== '()')
        .join(' && ')
    }
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

  // Retain line identities: confirmation receipts and historical links reference these ids.
  // Plan all retained/removed lines before writing, never delete-and-recreate a saved quote.
  const oldItems = potencialId
    ? await pb
        .collection('potencial_itens')
        .getFullList({ filter: pb.filter('potencial_id={:id}', { id: potencialId }) })
    : []
  const retained = new Set<string>()
  const plan = itemsData.map((item) => {
    let old = item.id ? oldItems.find((row) => row.id === item.id) : undefined
    if (item.id && !old) throw new Error('Uma linha da cotação mudou. Recarregue antes de salvar.')
    if (!item.id) {
      const matching = oldItems.filter(
        (row) => row.item_id === item.item_id && !retained.has(row.id),
      )
      if (matching.length > 1)
        throw new Error('Há linhas repetidas para o produto. Recarregue antes de salvar.')
      old = matching[0]
    }
    if (old) {
      if (retained.has(old.id)) throw new Error('Linha duplicada no salvamento.')
      retained.add(old.id)
    }
    return { item, old }
  })
  savedPotencial = potencialId
    ? await pb.collection('potenciais').update(potencialId, dataToSave)
    : await pb.collection('potenciais').create(dataToSave)
  for (const { item, old } of plan) {
    const payload: Record<string, any> = { ...item, potencial_id: savedPotencial.id }
    delete payload.id
    delete payload.expand
    delete payload.created
    delete payload.updated
    // Skip unchanged fields: preserves update timestamps and avoids spurious history.
    const changed = old
      ? Object.fromEntries(
          Object.entries(payload).filter(([k, v]) => v !== undefined && old[k] !== v),
        )
      : payload
    if (old) {
      if (Object.keys(changed).length)
        await pb.collection('potencial_itens').update(old.id, changed)
    } else await pb.collection('potencial_itens').create(payload)
  }
  // Only explicit removals are deleted, after retained/new lines have saved successfully.
  for (const old of oldItems) {
    if (!retained.has(old.id)) await pb.collection('potencial_itens').delete(old.id)
  }

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

  // incoterm_cliente, condicao_pagamento_cliente, tempo_fabricacao_cliente são mantidos automaticamente no duplicatedData
  const newPotencial = await pb.collection('potenciais').create(duplicatedData)

  await Promise.all(
    items.map((item) => {
      const duplicatedItem: Record<string, any> = { ...item, potencial_id: newPotencial.id }
      delete duplicatedItem.id
      delete duplicatedItem.created
      delete duplicatedItem.updated
      delete duplicatedItem.expand
      if (item.referencia_preco !== undefined)
        duplicatedItem.referencia_preco = item.referencia_preco
      if (item.referencia_fornecedor !== undefined)
        duplicatedItem.referencia_fornecedor = item.referencia_fornecedor
      if (item.referencia_data !== undefined) duplicatedItem.referencia_data = item.referencia_data
      return pb.collection('potencial_itens').create(duplicatedItem)
    }),
  )

  return newPotencial
}
