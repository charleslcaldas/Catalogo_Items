routerAdd(
  'POST',
  '/backend/v1/foto-catalogo/merge',
  (e) => {
    const body = e.requestInfo().body || {}
    const sourceFotoIds = body.sourceFotoIds || []
    const targetFotoId = body.targetFotoId

    if (!targetFotoId) {
      return e.badRequestError('targetFotoId é obrigatório')
    }

    if (!Array.isArray(sourceFotoIds) || sourceFotoIds.length === 0) {
      return e.badRequestError('sourceFotoIds é obrigatório e deve conter pelo menos um ID')
    }

    // Validar se o target existe
    let targetFoto
    try {
      targetFoto = $app.findRecordById('foto_catalogo', targetFotoId)
    } catch (err) {
      return e.badRequestError('Foto de destino (oficial) não encontrada')
    }

    // Filtrar IDs de origem para excluir o próprio target
    const toMergeIds = []
    for (let i = 0; i < sourceFotoIds.length; i++) {
      const id = sourceFotoIds[i]
      if (id && id !== targetFotoId && toMergeIds.indexOf(id) === -1) {
        toMergeIds.push(id)
      }
    }

    if (toMergeIds.length === 0) {
      return e.badRequestError(
        'Nenhuma foto diferente da foto oficial foi fornecida para mesclagem',
      )
    }

    let reassignedItemsCount = 0
    let removedFotosCount = 0
    const errors = []

    // Para cada foto a mesclar:
    // 1. Encontrar todos os itens vinculados e reatribuir para targetFotoId
    // 2. Deletar a foto antiga
    for (let i = 0; i < toMergeIds.length; i++) {
      const srcId = toMergeIds[i]
      try {
        // Buscar itens apontando para esta foto
        const items = $app.findRecordsByFilter(
          'itens',
          'foto_catalogo_id = {:srcId}',
          '-created',
          0,
          0,
          { srcId: srcId },
        )

        for (let j = 0; j < items.length; j++) {
          const item = items[j]
          try {
            item.set('foto_catalogo_id', targetFotoId)
            $app.save(item)
            reassignedItemsCount++
          } catch (itemErr) {
            errors.push('Erro ao atualizar item ' + item.id + ': ' + String(itemErr))
          }
        }

        // Excluir a foto mesclada
        try {
          const fotoRecord = $app.findRecordById('foto_catalogo', srcId)
          $app.delete(fotoRecord)
          removedFotosCount++
        } catch (fotoErr) {
          errors.push('Erro ao excluir foto mesclada ' + srcId + ': ' + String(fotoErr))
        }
      } catch (err) {
        errors.push('Erro ao processar foto ' + srcId + ': ' + String(err))
      }
    }

    return e.json(200, {
      success: true,
      targetFotoId: targetFotoId,
      reassignedItems: reassignedItemsCount,
      removedFotos: removedFotosCount,
      errors: errors,
    })
  },
  $apis.requireAuth(),
)
