migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'charles@c2international.com.br')
    } catch (_) {
      const record = new Record(users)
      record.setEmail('charles@c2international.com.br')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Admin')
      app.save(record)
    }

    const catCol = app.findCollectionByNameOrId('categorias')
    const categoriasData = [
      { nome_pt: 'Fixadores', nome_en: 'Fasteners' },
      { nome_pt: 'Máquinas', nome_en: 'Machines' },
      { nome_pt: 'Ferramentas', nome_en: 'Tools' },
    ]
    let catFixadoresId = ''
    for (const c of categoriasData) {
      let rec
      try {
        rec = app.findFirstRecordByData('categorias', 'nome_pt', c.nome_pt)
      } catch (_) {
        rec = new Record(catCol)
        rec.set('nome_pt', c.nome_pt)
        rec.set('nome_en', c.nome_en)
        app.save(rec)
      }
      if (c.nome_pt === 'Fixadores') catFixadoresId = rec.id
    }

    const linCol = app.findCollectionByNameOrId('linhas')
    const linhasData = [
      {
        nome_pt: 'Parafuso Sextavado Interno',
        nome_en: 'Hex Socket Bolt',
        categoria_id: catFixadoresId,
        superlinha_pt: 'Sextavados',
        superlinha_en: 'Hex',
      },
      {
        nome_pt: 'Arruela Lisa',
        nome_en: 'Plain Washer',
        categoria_id: catFixadoresId,
        superlinha_pt: 'Arruelas',
        superlinha_en: 'Washers',
      },
    ]
    let linParafusoId = ''
    let linArruelaId = ''
    for (const l of linhasData) {
      let rec
      try {
        rec = app.findFirstRecordByData('linhas', 'nome_pt', l.nome_pt)
      } catch (_) {
        rec = new Record(linCol)
        rec.set('nome_pt', l.nome_pt)
        rec.set('nome_en', l.nome_en)
        rec.set('categoria_id', l.categoria_id)
        rec.set('superlinha_pt', l.superlinha_pt)
        rec.set('superlinha_en', l.superlinha_en)
        app.save(rec)
      }
      if (l.nome_pt === 'Parafuso Sextavado Interno') linParafusoId = rec.id
      if (l.nome_pt === 'Arruela Lisa') linArruelaId = rec.id
    }

    const acaCol = app.findCollectionByNameOrId('acabamentos')
    const acaData = [
      { codigo: 'PO', nome_pt: 'Polido', nome_en: 'Polished' },
      { codigo: 'ZB', nome_pt: 'Zincado Branco', nome_en: 'White Zinc Plated' },
      { codigo: 'PT', nome_pt: 'Preto', nome_en: 'Black' },
      { codigo: 'IN', nome_pt: 'Inox', nome_en: 'Stainless' },
      { codigo: 'GE', nome_pt: 'Geomet', nome_en: 'Geomet' },
    ]
    let acaPT = '',
      acaZB = '',
      acaPO = ''
    for (const a of acaData) {
      let rec
      try {
        rec = app.findFirstRecordByData('acabamentos', 'codigo', a.codigo)
      } catch (_) {
        rec = new Record(acaCol)
        rec.set('codigo', a.codigo)
        rec.set('nome_pt', a.nome_pt)
        rec.set('nome_en', a.nome_en)
        app.save(rec)
      }
      if (a.codigo === 'PT') acaPT = rec.id
      if (a.codigo === 'ZB') acaZB = rec.id
      if (a.codigo === 'PO') acaPO = rec.id
    }

    const ncmCol = app.findCollectionByNameOrId('ncm')
    const ncmData = [
      { codigo: '7318.15.00', ii: 18, ipi: 5, pis: 2.1, cofins: 9.65 },
      { codigo: '7318.22.00', ii: 16, ipi: 0, pis: 1.65, cofins: 7.6 },
    ]
    let ncm1 = '',
      ncm2 = ''
    for (const n of ncmData) {
      let rec
      try {
        rec = app.findFirstRecordByData('ncm', 'codigo', n.codigo)
      } catch (_) {
        rec = new Record(ncmCol)
        rec.set('codigo', n.codigo)
        rec.set('ii', n.ii)
        rec.set('ipi', n.ipi)
        rec.set('pis', n.pis)
        rec.set('cofins', n.cofins)
        app.save(rec)
      }
      if (n.codigo === '7318.15.00') ncm1 = rec.id
      if (n.codigo === '7318.22.00') ncm2 = rec.id
    }

    const itemCol = app.findCollectionByNameOrId('itens')
    const itensData = [
      {
        sku: 'PAR-SEX-INT-001',
        linha_id: linParafusoId,
        descr_pt: 'Parafuso Sextavado Interno M8x20',
        descr_en: 'Hex Socket Bolt M8x20',
        tamanho: 'M8x20',
        acabamento_id: acaPT,
        ncm_id: ncm1,
        material: 'Aço Carbono',
        preco_compra: 0.5,
        preco_venda: 1.2,
        item_id_books: 'ZOHO-001',
        foto_url: 'https://img.usecurling.com/p/200/200?q=bolt&color=gray',
        ativo: true,
        sincronizado_com_zoho: true,
        data_sincronizacao: '2024-05-01 10:00:00.000Z',
      },
      {
        sku: 'PAR-SEX-INT-002',
        linha_id: linParafusoId,
        descr_pt: 'Parafuso Sextavado Interno M10x30',
        descr_en: 'Hex Socket Bolt M10x30',
        tamanho: 'M10x30',
        acabamento_id: acaZB,
        ncm_id: ncm1,
        material: 'Aço Carbono',
        preco_compra: 0.8,
        preco_venda: 1.9,
        item_id_books: 'ZOHO-002',
        foto_url: 'https://img.usecurling.com/p/200/200?q=screw&color=white',
        ativo: true,
        sincronizado_com_zoho: true,
        data_sincronizacao: '2024-05-01 10:00:00.000Z',
      },
      {
        sku: 'ARR-LIS-001',
        linha_id: linArruelaId,
        descr_pt: 'Arruela Lisa M8',
        descr_en: 'Plain Washer M8',
        tamanho: 'M8',
        acabamento_id: acaZB,
        ncm_id: ncm2,
        material: 'Aço Carbono',
        preco_compra: 0.1,
        preco_venda: 0.3,
        item_id_books: '',
        foto_url: 'https://img.usecurling.com/p/200/200?q=washer&color=gray',
        ativo: true,
        sincronizado_com_zoho: false,
        data_sincronizacao: '',
      },
      {
        sku: 'ARR-LIS-002',
        linha_id: linArruelaId,
        descr_pt: 'Arruela Lisa M10',
        descr_en: 'Plain Washer M10',
        tamanho: 'M10',
        acabamento_id: acaPO,
        ncm_id: ncm2,
        material: 'Inox',
        preco_compra: 0.2,
        preco_venda: 0.6,
        item_id_books: 'ZOHO-004',
        foto_url: 'https://img.usecurling.com/p/200/200?q=washer&color=white',
        ativo: true,
        sincronizado_com_zoho: true,
        data_sincronizacao: '2024-05-01 10:00:00.000Z',
      },
      {
        sku: 'PAR-SEX-INT-003',
        linha_id: linParafusoId,
        descr_pt: 'Parafuso Sextavado Interno M12x40',
        descr_en: 'Hex Socket Bolt M12x40',
        tamanho: 'M12x40',
        acabamento_id: acaPT,
        ncm_id: ncm1,
        material: 'Aço Liga',
        preco_compra: 1.5,
        preco_venda: 3.5,
        item_id_books: '',
        foto_url: 'https://img.usecurling.com/p/200/200?q=bolt&color=black',
        ativo: true,
        sincronizado_com_zoho: false,
        data_sincronizacao: '',
      },
    ]

    for (const i of itensData) {
      let rec
      try {
        rec = app.findFirstRecordByData('itens', 'sku', i.sku)
      } catch (_) {
        rec = new Record(itemCol)
        rec.set('sku', i.sku)
        rec.set('linha_id', i.linha_id)
        rec.set('descr_pt', i.descr_pt)
        rec.set('descr_en', i.descr_en)
        rec.set('tamanho', i.tamanho)
        rec.set('acabamento_id', i.acabamento_id)
        rec.set('ncm_id', i.ncm_id)
        rec.set('material', i.material)
        rec.set('preco_compra', i.preco_compra)
        rec.set('preco_venda', i.preco_venda)
        rec.set('item_id_books', i.item_id_books)
        rec.set('foto_url', i.foto_url)
        rec.set('ativo', i.ativo)
        rec.set('sincronizado_com_zoho', i.sincronizado_com_zoho)
        if (i.data_sincronizacao) {
          rec.set('data_sincronizacao', i.data_sincronizacao)
        }
        app.save(rec)
      }
    }
  },
  (app) => {
    // Not removing data in down migration
  },
)
