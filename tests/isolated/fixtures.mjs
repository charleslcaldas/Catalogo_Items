// fixtures.mjs — usuários sintéticos + cadeia sintética oferta→confirmação, 100% inventados.
// Nenhum dado real do projeto: valores, ids e e-mails são exclusivos do harness.
// NÃO EXECUTADO nesta rodada (a plataforma não tem binário PocketBase).

import { randomUUID } from 'node:crypto';

// ---- Usuários sintéticos (criados via API no efêmero; nada de seed real) ----
export const SENHA_SINTETICA = 'Harness#Isolado!2026';

export const USUARIOS_SINTETICOS = [
  { email: 'harness.team.a@isolado.teste', name: 'Team A (harness)', papel: 'team' },
  { email: 'harness.team.b@isolado.teste', name: 'Team B (harness)', papel: 'team' },
  { email: 'harness.mei@isolado.teste', name: 'Mei (harness)', papel: 'mei' },
];

// Nota: a API rule de potenciais/potencial_itens trata o ID LITERAL "meiqw9s6c4r2t8a"
// como Mei. O harness usa esse id ESPELHANDO a regra auditada (não é um usuário real;
// no efêmero o usuário sintético Mei recebe um id novo — os casos que dependem do id
// literal ficam PENDENTES, pois o id é gerado pelo PocketBase na criação).
export const ID_MEI_REGRA = 'meiqw9s6c4r2t8a';

// ---- Cadeia sintética mínima (um item, uma rodada, uma oferta confirmada) ----
export function cadeiaSintetica({ margemNegociada = null, margemVersao = null, precisao = null, moq = null } = {}) {
  return {
    marcador: `harness-${randomUUID()}`,
    categoria: { nome_pt: 'H Categoria', nome_en: 'H Category' },
    linha: { nome_pt: 'H Linha', nome_en: 'H Line', margem_padrao: 7.5 },
    unidade: { nome: 'H Pcs' },
    fornecedor: { nome: 'H Fornecedor Sintético' },
    item: { sku: `HSKU-${Date.now()}`, descr_pt: 'H Item sintético', ativo: true, unidade: 'H Pcs' },
    potencial: {
      numero_potencial: `H-${randomUUID().slice(0, 8)}`,
      cliente: 'H Cliente Sintético',
      status: 'Rascunho',
      proprietario: 'Mei',
      situacao_cotacao: 'Cotações recebidas',
    },
    potencial_item: {
      quantidade: 100,
      preco_unitario: 10.5,
      unidade_medida: 'Pcs',
      precisao_preco: precisao, // 2 ou 3; null = ausente (gera pendência)
      moeda_compra: 'USD',
    },
    cotacao_fornecedor: {
      status: 'Recebida',
      oferta_moeda: 'USD',
      oferta_unidade: 'Pcs',
      oferta_validade: null, // absent = pendência no caso específico
      oferta_condicoes: 'H FOB',
    },
    cotacao_item: {
      preco_ofertado: 8.2,
      vencedor: true,
      quantidade_minima: moq, // null = ausente (gera pendência de MOQ)
      margem_negociada: margemNegociada, // 12 no caso com margem autoritativa
      margem_versao: margemVersao, // >=1 quando há margem persistida
      precisao_negociada: precisao, // 2/3; inválida em caso dedicado
      rodada_atual: 1,
    },
    rodada_oferta: {
      tipo: 'oferta_confirmada',
      estado: 'confirmada',
      preco: 8.2,
      moeda: 'USD',
      unidade: 'Pcs',
      quantidade: 100,
      moq, // null = ausente (pendência)
      numero_rodada: 1,
    },
  };
}

// ---- Casos de margem ----
export const MARGEM_AUTORITATIVA = { valor: 12, versao_inicial: 1 };
export const MARGEM_PADRAO = 7.5;

// ---- Precisão ----
export const PRECISOES_VALIDAS = [2, 3];
export const PRECISOES_INVALIDAS = [1, 4, 0, -2, 2.5];

// ---- Payload de confirmação sintético (mesma forma do contrato TS) ----
export function payloadConfirmacao({ cadeia, chaveIdempotencia, margemAutoritativa = false } = {}) {
  return {
    chave_idempotencia: chaveIdempotencia,
    escopo: 'confirmar_compra',
    potencial_id: cadeia.potencial.id,
    cotacao_item_id: cadeia.cotacao_item.id,
    rodada_id: cadeia.rodada_oferta.id,
    // A margem NUNCA viaja no payload: o servidor lê cotacoes_itens.margem_negociada
    // (autoritativa) com margem_versao, ou aplica o padrão 7,5 da linha.
    itens: [
      {
        item_id: cadeia.item.id,
        potencial_item_id: cadeia.potencial_item.id,
        cotacao_item_id: cadeia.cotacao_item.id,
        rodada_id: cadeia.rodada_oferta.id,
        quantidade: cadeia.potencial_item.quantidade,
        preco_unitario: cadeia.cotacao_item.preco_ofertado,
      },
    ],
    esperado: margemAutoritativa
      ? { margem_fonte: 'cotacoes_itens', margem: MARGEM_AUTORITATIVA.valor, margem_versao: MARGEM_AUTORITATIVA.versao_inicial }
      : { margem_fonte: 'padrao_linha', margem: MARGEM_PADRAO },
  };
}

// ---- Colecções alvo do rollback/limpeza ----
export const COLECOES_ESCRITA = [
  'potenciais',
  'potencial_itens',
  'cotacoes_fornecedor',
  'cotacoes_itens',
  'cotacoes_rodadas',
  'historico_precos',
  'c2_idempotency_keys',
];

// ---- Coleções de catálogo mestre (devem ficar INTOCADAS) ----
export const COLECOES_MESTRE = ['categorias', 'linhas', 'unidades_medida', 'fornecedores', 'itens', 'acabamentos'];
