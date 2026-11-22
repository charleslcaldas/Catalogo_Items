// pb-client.mjs — cliente HTTP mínimo do harness para o efêmero (fetch puro, sem SDK).
// NÃO EXECUTADO nesta rodada (a plataforma não tem binário PocketBase).

/** Requisição genérica autenticada. */
export async function api(baseUrl, token, metodo, caminho, corpo = null) {
  const resp = await fetch(new URL(caminho, baseUrl), {
    method: metodo,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: token } : {}),
    },
    body: corpo === null ? undefined : JSON.stringify(corpo),
  });
  const texto = await resp.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { /* resposta não-JSON */ }
  return { status: resp.status, ok: resp.ok, json, texto };
}

export const criar = (baseUrl, token, colecao, dados) =>
  api(baseUrl, token, 'POST', `/api/collections/${colecao}/records`, dados);

export const listar = (baseUrl, token, colecao, filtro = '', pagina = 1, porPagina = 200) =>
  api(baseUrl, token, 'GET', `/api/collections/${colecao}/records?page=${pagina}&perPage=${porPagina}${filtro ? `&filter=${encodeURIComponent(filtro)}` : ''}`);

export const atualizar = (baseUrl, token, colecao, id, dados) =>
  api(baseUrl, token, 'PATCH', `/api/collections/${colecao}/records/${id}`, dados);

export const remover = (baseUrl, token, colecao, id) =>
  api(baseUrl, token, 'DELETE', `/api/collections/${colecao}/records/${id}`);

/** Sobe a cadeia sintética inteira no efêmero, devolvendo ids reais criados. */
export async function semearCadeia(baseUrl, token, cadeia) {
  const cat = (await criar(baseUrl, token, 'categorias', cadeia.categoria)).json;
  const linha = (await criar(baseUrl, token, 'linhas', { ...cadeia.linha, categoria_id: cat.id })).json;
  const unid = (await criar(baseUrl, token, 'unidades_medida', cadeia.unidade)).json;
  const forn = (await criar(baseUrl, token, 'fornecedores', cadeia.fornecedor)).json;
  const item = (await criar(baseUrl, token, 'itens', { ...cadeia.item, linha_id: linha.id, unidade: unid.nome, ativo: true })).json;
  const pot = (await criar(baseUrl, token, 'potenciais', { ...cadeia.potencial, proprietario: 'Mei' })).json;
  const potItem = (await criar(baseUrl, token, 'potencial_itens', {
    ...cadeia.potencial_item,
    potencial_id: pot.id,
    item_id: item.id,
  })).json;
  const cotForn = (await criar(baseUrl, token, 'cotacoes_fornecedor', {
    ...cadeia.cotacao_fornecedor,
    potencial_id: pot.id,
    fornecedor_id: forn.id,
  })).json;
  const cotItem = (await criar(baseUrl, token, 'cotacoes_itens', {
    ...cadeia.cotacao_item,
    cotacao_fornecedor_id: cotForn.id,
    item_id: item.id,
  })).json;
  const rodada = (await criar(baseUrl, token, 'cotacoes_rodadas', {
    ...cadeia.rodada_oferta,
    cotacao_iten: cotItem.id,
    potencial: pot.id,
    fornecedor: forn.id,
    item: item.id,
  })).json;

  return {
    ids: { cat: cat.id, linha: linha.id, unid: unid.id, forn: forn.id, item: item.id, pot: pot.id, potItem: potItem.id, cotForn: cotForn.id, cotItem: cotItem.id, rodada: rodada.id },
    registros: { cat, linha, unid, forn, item, pot, potItem, cotForn, cotItem, rodada },
  };
}
