/**
 * Fixtures 100% SINTÉTICAS para o harness de confirmação de compra.
 * Nenhum dado comercial real, nenhuma credencial real, nenhum segredo.
 * Cada fixture usa valores inventados e ids gerados no runtime efêmero.
 */

export const FIXTURES = {
  /** Cenário base válido (usado em vários casos) */
  base: {
    linha: { nome: 'Linha Sintética Teste', margem_padrao: 7.5 },
    unidade: { nome: 'MPC (sintético)' },
    item: { sku: 'SYN-0001', nome: 'Item Sintético 0001', preco_compra: 10.0 },
    fornecedor: { nome: 'Fornecedor Sintético A', contato: 'Contato Sintético' },
    potencial: {
      numero_potencial: 'SYN-POT-001',
      cliente: 'Cliente Sintético X',
      status: 'Em Negociação',
      moeda: 'USD',
    },
    potencialItens: [
      {
        quantidade: 100,
        preco_unitario: 0,
        unidade_medida: 'MPC',
        observacoes: '',
        situacao_item: 'pendente',
      },
    ],
    cotacaoFornecedor: {
      status: 'em_negociacao',
      oferta_moeda: 'USD',
      oferta_unidade: 'MPC',
    },
    cotacaoItens: [
      {
        preco_ofertado: 10.0,
        quantidade_minima: 0,
        vencedor: false,
        margem_negociada: 12.0,
        margem_versao: 1,
        precisao_negociada: 2,
      },
    ],
    rodadas: [
      // resposta do fabricante com prova (mesmo preço do alvo, autor e data)
      {
        numero_rodada: 1,
        tipo: 'resposta_fabricante',
        preco: 10.0,
        autor: 'Fabricante Sintético A',
        estado: 'recebida',
        moeda: 'USD',
        unidade: 'MPC',
        quantidade: 100,
        moq: 0,
      },
      { numero_rodada: 2, tipo: 'contraproposta_c2', preco: 10.0, autor: 'C2', estado: 'aguardando' },
    ],
  },
  /** Cenário: margem não persistida na oferta (vira pendencia_margem) */
  semMargem: {
    cotacaoItens: [
      {
        preco_ofertado: 10.0,
        quantidade_minima: 0,
        vencedor: false,
        // margem_negociada ausente
      },
    ],
  },
  /** Cenário: margem persistida inválida (>=100) */
  margemInvalida: {
    cotacaoItens: [
      { preco_ofertado: 10.0, margem_negociada: 100.0, margem_versao: 1, precisao_negociada: 2 },
    ],
  },
  /** Cenário: precisão fora de 2/3 */
  precisaoInvalida: {
    cotacaoItens: [
      { preco_ofertado: 10.0, margem_negociada: 12.0, margem_versao: 1, precisao_negociada: 4 },
    ],
  },
  /** Cenário: precisão ausente (nada persistido) */
  precisaoAusente: {
    cotacaoItens: [
      { preco_ofertado: 10.0, margem_negociada: 12.0, margem_versao: 1 },
    ],
  },
  /** Cenário: alvo (=preco_contraproposta) sem resposta registrada → negado */
  alvoSemResposta: {
    cotacaoItens: [
      {
        preco_ofertado: 10.0,
        preco_contraproposta: 10.0,
        margem_negociada: 12.0,
        margem_versao: 1,
        precisao_negociada: 2,
      },
    ],
    rodadas: [],
  },
  /** Cenário: alvo com resposta CONFIRMADA igual — igualdade numérica não prova nada; aqui HÁ prova */
  alvoComResposta: {
    cotacaoItens: [
      {
        preco_ofertado: 10.0,
        preco_contraproposta: 10.0,
        margem_negociada: 12.0,
        margem_versao: 1,
        precisao_negociada: 2,
      },
    ],
    rodadas: [
      {
        numero_rodada: 1,
        tipo: 'resposta_fabricante',
        preco: 10.0,
        autor: 'Fabricante Sintético A',
        estado: 'recebida',
        moeda: 'USD',
        unidade: 'MPC',
        quantidade: 100,
        moq: 0,
      },
    ],
  },
  /** Cenário: cadeia divergente — potencial_itens aponta para OUTRO potencial (sintético) */
  cadeiaDivergente: {
    outroPotencial: {
      numero_potencial: 'SYN-POT-OUTRO',
      cliente: 'Cliente Sintético Outro',
      status: 'Rascunho',
      moeda: 'USD',
    },
    potencialItens: [
      {
        // vínculo adulterado em runtime pelo executor (outro potencial)
        quantidade: 100,
        preco_unitario: 0,
        unidade_medida: 'MPC',
        observacoes: '',
        situacao_item: 'pendente',
      },
    ],
    cotacaoItens: [
      { preco_ofertado: 10.0, margem_negociada: 12.0, margem_versao: 1, precisao_negociada: 2 },
    ],
  },
  /** Cenário: legado sem dados suficientes (sem moeda/unidade/MOQ/validade) → pendências */
  legadoSemDados: {
    fornecedor: { nome: 'Fornecedor Sintético B', contato: '' },
    potencial: {
      numero_potencial: 'SYN-POT-002',
      cliente: 'Cliente Sintético Y',
      status: 'Em Negociação',
      moeda: '',
    },
    potencialItens: [
      { quantidade: 1, preco_unitario: 0, unidade_medida: '', observacoes: '', situacao_item: 'pendente' },
    ],
    cotacaoFornecedor: {
      status: 'em_negociacao',
      // oferta_moeda/oferta_unidade ausentes de propósito
    },
    cotacaoItens: [
      {
        preco_ofertado: 10.0,
        // quantidade_minima ausente (MOQ ausente)
        margem_negociada: 12.0,
        margem_versao: 1,
        precisao_negociada: 2,
      },
    ],
    rodadas: [],
  },
  /** Cenário: item do catálogo mestre que NÃO pode ser tocado */
  catalogoMestre: {
    item: { sku: 'SYN-0002', nome: 'Item Sintético 0002', preco_compra: 20.0 },
    cotacaoItens: [
      { preco_ofertado: 20.0, margem_negociada: 15.0, margem_versao: 1, precisao_negociada: 3 },
    ],
  },
}

/** Emails/domínios sintéticos — nunca o domínio real do time. */
export const SYNTH_DOMAIN = 'exemplo.test'
