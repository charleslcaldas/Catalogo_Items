import { Categoria, Linha, Acabamento, NCM, Item } from '@/types'

const now = new Date().toISOString()

export const mockCategorias: Categoria[] = [
  { id: 'cat-1', nome_pt: 'Fixadores', nome_en: 'Fasteners', criado_em: now, atualizado_em: now },
  { id: 'cat-2', nome_pt: 'Máquinas', nome_en: 'Machines', criado_em: now, atualizado_em: now },
  { id: 'cat-3', nome_pt: 'Ferramentas', nome_en: 'Tools', criado_em: now, atualizado_em: now },
]

export const mockLinhas: Linha[] = [
  {
    id: 'lin-1',
    categoria_id: 'cat-1',
    nome_pt: 'Parafuso Sextavado',
    nome_en: 'Hex Bolt',
    superlinha_pt: 'Parafusos',
    superlinha_en: 'Bolts',
    criado_em: now,
    atualizado_em: now,
  },
  {
    id: 'lin-2',
    categoria_id: 'cat-1',
    nome_pt: 'Arruela Lisa',
    nome_en: 'Flat Washer',
    superlinha_pt: 'Arruelas',
    superlinha_en: 'Washers',
    criado_em: now,
    atualizado_em: now,
  },
]

export const mockAcabamentos: Acabamento[] = [
  {
    id: 'aca-1',
    codigo: 'PO',
    nome_pt: 'Polido',
    nome_en: 'Polished',
    criado_em: now,
    atualizado_em: now,
  },
  {
    id: 'aca-2',
    codigo: 'ZB',
    nome_pt: 'Zincado Branco',
    nome_en: 'White Zinc',
    criado_em: now,
    atualizado_em: now,
  },
  {
    id: 'aca-3',
    codigo: 'PT',
    nome_pt: 'Preto',
    nome_en: 'Black',
    criado_em: now,
    atualizado_em: now,
  },
]

export const mockNCM: NCM[] = [
  {
    id: 'ncm-1',
    codigo: '7318.15.00',
    ii: 18,
    ipi: 5,
    pis: 2,
    cofins: 10,
    criado_em: now,
    atualizado_em: now,
  },
  {
    id: 'ncm-2',
    codigo: '7318.22.00',
    ii: 16,
    ipi: 5,
    pis: 2,
    cofins: 10,
    criado_em: now,
    atualizado_em: now,
  },
]

export const mockItens: Item[] = [
  {
    id: 'itm-1',
    sku: 'PAR-SEX-8X30-ZB',
    linha_id: 'lin-1',
    descr_pt: 'Parafuso Sextavado M8x30',
    descr_en: 'Hex Bolt M8x30',
    tamanho: 'M8x30',
    acabamento_id: 'aca-2',
    ncm_id: 'ncm-1',
    material: 'Aço Carbono',
    preco_compra: 0.15,
    preco_venda: 0.45,
    item_id_books: 'ZBK-1001',
    foto_url: 'https://img.usecurling.com/p/200/200?q=hex%20bolt&color=gray',
    ativo: true,
    sincronizado_com_zoho: true,
    data_sincronizacao: now,
    criado_em: now,
    atualizado_em: now,
  },
  {
    id: 'itm-2',
    sku: 'ARR-LIS-M8-ZB',
    linha_id: 'lin-2',
    descr_pt: 'Arruela Lisa M8',
    descr_en: 'Flat Washer M8',
    tamanho: 'M8',
    acabamento_id: 'aca-2',
    ncm_id: 'ncm-2',
    material: 'Aço Carbono',
    preco_compra: 0.05,
    preco_venda: 0.12,
    item_id_books: '',
    foto_url: 'https://img.usecurling.com/p/200/200?q=metal%20washer&color=gray',
    ativo: true,
    sincronizado_com_zoho: false,
    data_sincronizacao: null,
    criado_em: now,
    atualizado_em: now,
  },
]
