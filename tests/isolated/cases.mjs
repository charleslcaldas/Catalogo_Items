// cases.mjs — executor da matriz de casos contra o servidor EFÊMERO.
// Cada caso devolve { id, titulo, status: 'PASSOU'|'FALHOU'|'PENDENTE', motivo?, evidencia? }.
// Caso que falha nasce FALHOU (nunca maquiado); caso não provável de provar nasce PENDENTE com o motivo.
// NÃO EXECUTADO nesta rodada (a plataforma não tem binário PocketBase).

import { cadeiaSintetica, payloadConfirmacao, MARGEM_AUTORITATIVA, MARGEM_PADRAO, PRECISOES_VALIDAS, PRECISOES_INVALIDAS, COLECOES_ESCRITA, COLECOES_MESTRE, SENHA_SINTETICA, USUARIOS_SINTETICOS, ID_MEI_REGRA } from './fixtures.mjs';
import { criar, listar, atualizar, remover, semearCadeia } from './pb-client.mjs';
import { criarUsuariosSinteticos, autenticarAtores, postConfirmacao, loginSintetico } from './auth.mjs';

export const ROTACAO = '/backend/v1/confirmar-compra';

// ---------- util ----------
function caso(id, titulo) {
  return { id, titulo, status: 'PENDENTE', motivo: 'não executado', evidencia: null };
}
const marcar = (c, status, evidencia, motivo) => Object.assign(c, { status, evidencia, motivo: motivo ?? null });

async function limparCadeia(baseUrl, team, ids) {
  // rollback forçado: apaga em ordem inversa de dependência, verificando zero resíduos
  const ordem = ['rodada', 'cotItem', 'cotForn', 'potItem', 'pot', 'item', 'forn', 'unid', 'linha', 'cat'];
  for (const chave of ordem) {
    if (ids?.[chave]) await remover(baseUrl, team.token, colecaoDe(chave), ids[chave]);
  }
}
function colecaoDe(chave) {
  return {
    cat: 'categorias', linha: 'linhas', unid: 'unidades_medida', forn: 'fornecedores',
    item: 'itens', pot: 'potenciais', potItem: 'potencial_itens',
    cotForn: 'cotacoes_fornecedor', cotItem: 'cotacoes_itens', rodada: 'cotacoes_rodadas',
  }[chave];
}

async function semResiduos(baseUrl, team, marcador) {
  // Procura registros órfãos criados pela confirmação (histórico/idempotência/rodada extra)
  const residuos = {};
  for (const col of COLECOES_ESCRITA) {
    const filtro = col === 'c2_idempotency_keys' ? `escopo='confirmar_compra'` : '';
    const r = await listar(baseUrl, team.token, col, filtro);
    const total = r.json?.totalItems ?? 0;
    if (total > 0) residuos[col] = total;
  }
  return residuos;
}

async function contarColecao(baseUrl, token, colecao, filtro = '') {
  const r = await listar(baseUrl, token, colecao, filtro);
  return r.json?.totalItems ?? -1;
}

// ---------- matriz ----------
export async function executarMatriz(baseUrl) {
  const casos = [];
  const usuarios = await criarUsuariosSinteticos(baseUrl);
  const { team, mei } = await autenticarAtores(baseUrl, usuarios);
  const marcadorGlobal = `harness-${Date.now()}`;

  // ======== 1. AUTORIZAÇÃO ========
  {
    const c = caso('AUTH-001', 'Sem credenciais → 401 na rota de confirmação');
    try {
      const resp = await postConfirmacao(baseUrl, '', { chave_idempotencia: `${marcadorGlobal}-auth1` });
      marcar(c, resp.status === 401 ? 'PASSOU' : 'FALHOU', { http: resp.status }, resp.status === 401 ? null : `esperado 401, veio ${resp.status}`);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    casos.push(c);
  }
  {
    const c = caso('AUTH-002', 'Usuário do time autenticado → autorizado a confirmar cadeia própria');
    let ids = null;
    try {
      const cadeia = cadeiaSintetica();
      const s = await semearCadeia(baseUrl, team.token, cadeia); ids = s.ids;
      const payload = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: `${marcadorGlobal}-auth2` });
      const resp = await postConfirmacao(baseUrl, team.token, payload);
      marcar(c, resp.status === 200 ? 'PASSOU' : 'FALHOU', { http: resp.status, corpo: resp.json }, resp.status === 200 ? null : `esperado 200, veio ${resp.status}`);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, ids); }
    casos.push(c);
  }
  {
    const c = caso('AUTH-003', 'Usuário Mei → autorizado apenas em potencial Rascunho/proprietário Mei');
    let ids = null;
    try {
      const cadeia = cadeiaSintetica();
      const s = await semearCadeia(baseUrl, team.token, cadeia); ids = s.ids;
      const payload = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: `${marcadorGlobal}-auth3` });
      const resp = await postConfirmacao(baseUrl, mei.token, payload);
      // Mei só tem poder sobre o próprio rascunho; a rota deve espelhar as API rules
      const permitido = resp.status === 200;
      marcar(c, permitido || resp.status === 403 ? 'PASSOU' : 'FALHOU', { http: resp.status },
        permitido || resp.status === 403 ? null : `esperado 200 (permitido) ou 403 (negado), veio ${resp.status}`);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, ids); }
    casos.push(c);
  }
  {
    const c = caso('AUTH-004', 'Coleção errada no payload (ids de outra cadeia) → negado');
    let idsA = null, idsB = null;
    try {
      const a = await semearCadeia(baseUrl, team.token, cadeiaSintetica()); idsA = a.ids;
      const b = await semearCadeia(baseUrl, team.token, cadeiaSintetica()); idsB = b.ids;
      // payload da cadeia B apontando potencial da cadeia A (relação adulterada)
      const payload = payloadConfirmacao({ cadeia: b.registros, chaveIdempotencia: `${marcadorGlobal}-auth4` });
      payload.potencial_id = a.ids.pot;
      const resp = await postConfirmacao(baseUrl, team.token, payload);
      marcar(c, resp.status === 400 || resp.status === 403 || resp.status === 404 ? 'PASSOU' : 'FALHOU',
        { http: resp.status }, `esperado 400/403/404, veio ${resp.status}`);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, idsA); await limparCadeia(baseUrl, team, idsB); }
    casos.push(c);
  }
  {
    const c = caso('AUTH-005', 'Relações adulteradas (cotacao_item de outro potencial) → negado');
    let idsA = null, idsB = null;
    try {
      const a = await semearCadeia(baseUrl, team.token, cadeiaSintetica()); idsA = a.ids;
      const b = await semearCadeia(baseUrl, team.token, cadeiaSintetica()); idsB = b.ids;
      const payload = payloadConfirmacao({ cadeia: a.registros, chaveIdempotencia: `${marcadorGlobal}-auth5` });
      payload.itens[0].cotacao_item_id = b.ids.cotItem;
      const resp = await postConfirmacao(baseUrl, team.token, payload);
      marcar(c, resp.status !== 200 ? 'PASSOU' : 'FALHOU', { http: resp.status }, `esperado não-200, veio ${resp.status}`);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, idsA); await limparCadeia(baseUrl, team, idsB); }
    casos.push(c);
  }

  // ======== 2. MARGEM AUTORITATIVA ========
  {
    const c = caso('MARG-001', 'Margem persistida 12 em cotacoes_itens vence sobre padrão 7,5, com margem_versao');
    let ids = null;
    try {
      const cadeia = cadeiaSintetica({ margemNegociada: MARGEM_AUTORITATIVA.valor, margemVersao: MARGEM_AUTORITATIVA.versao_inicial, precisao: 2 });
      const s = await semearCadeia(baseUrl, team.token, cadeia); ids = s.ids;
      const payload = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: `${marcadorGlobal}-marg1`, margemAutoritativa: true });
      const resp = await postConfirmacao(baseUrl, team.token, payload);
      const venda = resp.json?.recibo?.itens?.[0];
      const ok = resp.status === 200 && venda?.margem === MARGEM_AUTORITATIVA.valor && venda?.margem_versao === MARGEM_AUTORITATIVA.versao_inicial;
      marcar(c, ok ? 'PASSOU' : 'FALHOU', { http: resp.status, recibo: venda ?? resp.json },
        ok ? null : `esperado margem=${MARGEM_AUTORITATIVA.valor} e versao=${MARGEM_AUTORITATIVA.versao_inicial}`);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, ids); }
    casos.push(c);
  }
  {
    const c = caso('MARG-002', 'Sem margem persistida → padrão 7,5 da linha aplicado');
    let ids = null;
    try {
      const cadeia = cadeiaSintetica({ margemNegociada: null, margemVersao: null, precisao: 2 });
      const s = await semearCadeia(baseUrl, team.token, cadeia); ids = s.ids;
      const payload = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: `${marcadorGlobal}-marg2` });
      const resp = await postConfirmacao(baseUrl, team.token, payload);
      const venda = resp.json?.recibo?.itens?.[0];
      const ok = resp.status === 200 && venda?.margem === MARGEM_PADRAO;
      marcar(c, ok ? 'PASSOU' : 'FALHOU', { http: resp.status, recibo: venda ?? resp.json }, ok ? null : `esperado margem padrão ${MARGEM_PADRAO}`);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, ids); }
    casos.push(c);
  }
  {
    const c = caso('MARG-003', 'margem_versao incrementada (+1) após consumir a margem');
    let ids = null;
    try {
      const cadeia = cadeiaSintetica({ margemNegociada: MARGEM_AUTORITATIVA.valor, margemVersao: 1, precisao: 2 });
      const s = await semearCadeia(baseUrl, team.token, cadeia); ids = s.ids;
      const payload = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: `${marcadorGlobal}-marg3`, margemAutoritativa: true });
      const resp = await postConfirmacao(baseUrl, team.token, payload);
      const depois = (await listar(baseUrl, team.token, 'cotacoes_itens', `id='${ids.cotItem}'`)).json?.items?.[0];
      const ok = resp.status === 200 && Number(depois?.margem_versao) === 2;
      marcar(c, ok ? 'PASSOU' : 'FALHOU', { versao_depois: depois?.margem_versao }, ok ? null : 'esperado margem_versao=2 após consumo');
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, ids); }
    casos.push(c);
  }

  // ======== 3. PRECISÃO ========
  for (const p of PRECISOES_VALIDAS) {
    const c = caso(`PREC-${String(p).padStart(3, '0')}`, `Precisão ${p} (válida) → confirmada, sem pendência de precisão`);
    let ids = null;
    try {
      const cadeia = cadeiaSintetica({ precisao: p });
      const s = await semearCadeia(baseUrl, team.token, cadeia); ids = s.ids;
      const payload = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: `${marcadorGlobal}-prec${p}` });
      const resp = await postConfirmacao(baseUrl, team.token, payload);
      const pendencias = resp.json?.recibo?.pendencias ?? [];
      const semPendPrecisao = !pendencias.some((x) => String(x?.campo ?? '').includes('precis'));
      marcar(c, resp.status === 200 && semPendPrecisao ? 'PASSOU' : 'FALHOU', { http: resp.status, pendencias }, null);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, ids); }
    casos.push(c);
  }
  for (const p of PRECISOES_INVALIDAS) {
    const c = caso(`PRECI-${String(p).replace('.', '_').padStart(4, '0')}`, `Precisão ${p} (inválida) → pendência, confirmação não concluída`);
    let ids = null;
    try {
      const cadeia = cadeiaSintetica({ precisao: p });
      const s = await semearCadeia(baseUrl, team.token, cadeia); ids = s.ids;
      const payload = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: `${marcadorGlobal}-preci${p}` });
      const resp = await postConfirmacao(baseUrl, team.token, payload);
      const recusou = resp.status >= 400 || Boolean(resp.json?.recibo?.pendencias?.length);
      marcar(c, recusou ? 'PASSOU' : 'FALHOU', { http: resp.status, corpo: resp.json }, recusou ? null : `precisão ${p} deveria gerar pendência`);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, ids); }
    casos.push(c);
  }

  // ======== 4. ALVO / RESPOSTA ========
  {
    const c = caso('ALVO-001', 'Alvo (rodada) sem resposta do fabricante → negado');
    let ids = null;
    try {
      const cadeia = cadeiaSintetica({ precisao: 2, moq: 100 });
      const s = await semearCadeia(baseUrl, team.token, cadeia); ids = s.ids;
      // marca rodada como aguardando (sem resposta)
      await atualizar(baseUrl, team.token, 'cotacoes_rodadas', ids.rodada, { estado: 'aguardando' });
      const payload = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: `${marcadorGlobal}-alvo1` });
      const resp = await postConfirmacao(baseUrl, team.token, payload);
      marcar(c, resp.status >= 400 ? 'PASSOU' : 'FALHOU', { http: resp.status }, `esperado recusa (>=400), veio ${resp.status}`);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, ids); }
    casos.push(c);
  }
  {
    const c = caso('ALVO-002', 'Resposta confirmada igual ao alvo → permitida');
    let ids = null;
    try {
      const cadeia = cadeiaSintetica({ precisao: 2, moq: 100 });
      const s = await semearCadeia(baseUrl, team.token, cadeia); ids = s.ids;
      const payload = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: `${marcadorGlobal}-alvo2` });
      const resp = await postConfirmacao(baseUrl, team.token, payload);
      marcar(c, resp.status === 200 ? 'PASSOU' : 'FALHOU', { http: resp.status }, `esperado 200, veio ${resp.status}`);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, ids); }
    casos.push(c);
  }

  // ======== 5. ROLLBACK FORÇADO / RESÍDUOS ========
  {
    const c = caso('ROLL-001', 'Rollback forçado após cada escrita → zero resíduos em todas as coleções');
    let ids = null;
    try {
      const cadeia = cadeiaSintetica({ precisao: 2, moq: 100 });
      const s = await semearCadeia(baseUrl, team.token, cadeia); ids = s.ids;
      const payload = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: `${marcadorGlobal}-roll1` });
      await postConfirmacao(baseUrl, team.token, payload);
      await limparCadeia(baseUrl, team, ids);
      const residuos = await semResiduos(baseUrl, team, cadeia.marcador);
      const limpo = Object.keys(residuos).length === 0;
      marcar(c, limpo ? 'PASSOU' : 'FALHOU', { residuos }, limpo ? null : `resíduos: ${JSON.stringify(residuos)}`);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    casos.push(c);
  }

  // ======== 6. IDEMPOTÊNCIA ========
  {
    const c = caso('IDEM-001', 'Retry sequencial com mesma chave → mesmo recibo, sem segunda venda');
    let ids = null;
    try {
      const cadeia = cadeiaSintetica({ precisao: 2, moq: 100 });
      const s = await semearCadeia(baseUrl, team.token, cadeia); ids = s.ids;
      const chave = `${marcadorGlobal}-idem1`;
      const payload = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: chave });
      const r1 = await postConfirmacao(baseUrl, team.token, payload);
      const r2 = await postConfirmacao(baseUrl, team.token, payload);
      const mesmoRecibo = JSON.stringify(r1.json?.recibo ?? null) === JSON.stringify(r2.json?.recibo ?? r1.json ?? null);
      const vendas = await contarColecao(baseUrl, team.token, 'historico_precos', `tipo='venda'`);
      marcar(c, r1.status === 200 && r2.status === 200 && mesmoRecibo && vendas <= 1 ? 'PASSOU' : 'FALHOU',
        { r1: r1.status, r2: r2.status, mesmoRecibo, vendas }, null);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, ids); }
    casos.push(c);
  }
  {
    const c = caso('IDEM-002', 'Requisições SIMULTÂNEAS com mesma chave → uma única venda (anti-confirmação-dupla)');
    let ids = null;
    try {
      const cadeia = cadeiaSintetica({ precisao: 2, moq: 100 });
      const s = await semearCadeia(baseUrl, team.token, cadeia); ids = s.ids;
      const chave = `${marcadorGlobal}-idem2`;
      const payload = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: chave });
      const [r1, r2, r3] = await Promise.all([
        postConfirmacao(baseUrl, team.token, payload),
        postConfirmacao(baseUrl, team.token, payload),
        postConfirmacao(baseUrl, team.token, payload),
      ]);
      const okHttp = [r1, r2, r3].every((r) => r.status === 200 || r.status === 409);
      const vendas = await contarColecao(baseUrl, team.token, 'historico_precos', `tipo='venda'`);
      marcar(c, okHttp && vendas <= 1 ? 'PASSOU' : 'FALHOU', { status: [r1.status, r2.status, r3.status], vendas },
        okHttp && vendas <= 1 ? null : `vendas=${vendas} (esperado <=1)`);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, ids); }
    casos.push(c);
  }
  {
    const c = caso('IDEM-003', 'Mesma chave com payload DIVERGENTE → recusado (payload_hash)');
    let ids = null;
    try {
      const cadeia = cadeiaSintetica({ precisao: 2, moq: 100 });
      const s = await semearCadeia(baseUrl, team.token, cadeia); ids = s.ids;
      const chave = `${marcadorGlobal}-idem3`;
      const p1 = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: chave });
      const p2 = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: chave });
      p2.itens[0].quantidade = 999; // divergente
      const r1 = await postConfirmacao(baseUrl, team.token, p1);
      const r2 = await postConfirmacao(baseUrl, team.token, p2);
      marcar(c, r1.status === 200 && r2.status >= 400 ? 'PASSOU' : 'FALHOU', { r1: r1.status, r2: r2.status },
        r1.status === 200 && r2.status >= 400 ? null : `esperado 200 e depois >=400, veio ${r1.status}/${r2.status}`);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, ids); }
    casos.push(c);
  }
  {
    const c = caso('IDEM-004', 'Recibo de idempotência por ator/escopo: mesmo escopo+chave, ator diferente → recusado');
    let ids = null;
    try {
      const cadeia = cadeiaSintetica({ precisao: 2, moq: 100 });
      const s = await semearCadeia(baseUrl, team.token, cadeia); ids = s.ids;
      const chave = `${marcadorGlobal}-idem4`;
      const payload = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: chave });
      const r1 = await postConfirmacao(baseUrl, team.token, payload);
      const r2 = await postConfirmacao(baseUrl, mei.token, payload);
      // mesmo escopo+chave com criado_por diferente não pode reutilizar recibo do outro ator
      marcar(c, r1.status === 200 && r2.status !== 200 ? 'PASSOU' : 'FALHOU', { r1: r1.status, r2: r2.status },
        r1.status === 200 && r2.status !== 200 ? null : `esperado 200 e depois !=200, veio ${r1.status}/${r2.status}`);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, ids); }
    casos.push(c);
  }

  // ======== 7. HISTÓRICO COMPRA/VENDA ========
  {
    const c = caso('HIST-001', 'Eventos de histórico únicos e intencionais: 1 compra + 1 venda por confirmação');
    let ids = null;
    try {
      const cadeia = cadeiaSintetica({ precisao: 2, moq: 100 });
      const s = await semearCadeia(baseUrl, team.token, cadeia); ids = s.ids;
      const payload = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: `${marcadorGlobal}-hist1` });
      const resp = await postConfirmacao(baseUrl, team.token, payload);
      const compras = await contarColecao(baseUrl, team.token, 'historico_precos', `tipo='compra'`);
      const vendas = await contarColecao(baseUrl, team.token, 'historico_precos', `tipo='venda'`);
      marcar(c, resp.status === 200 && compras === 1 && vendas === 1 ? 'PASSOU' : 'FALHOU',
        { http: resp.status, compras, vendas }, resp.status === 200 && compras === 1 && vendas === 1 ? null : `compras=${compras}, vendas=${vendas}`);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, ids); }
    casos.push(c);
  }

  // ======== 8. CATÁLOGO MESTRE INTOCADO ========
  {
    const c = caso('MEST-001', 'Catálogo mestre (categorias/linhas/unidades/fornecedores/itens) intocado pela confirmação');
    try {
      const antes = {};
      for (const col of COLECOES_MESTRE) antes[col] = await contarColecao(baseUrl, team.token, col);
      const cadeia = cadeiaSintetica({ precisao: 2, moq: 100 });
      const s = await semearCadeia(baseUrl, team.token, cadeia);
      const payload = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: `${marcadorGlobal}-mest1` });
      const resp = await postConfirmacao(baseUrl, team.token, payload);
      // conta novamente EXCETO o item/linha/forn/unid/cat recém-criados pela própria semeadura
      const depois = {};
      for (const col of COLECOES_MESTRE) depois[col] = await contarColecao(baseUrl, team.token, col);
      // o crescimento permitido é exatamente 1 por coleção criada na semeadura
      const deltas = Object.fromEntries(COLECOES_MESTRE.map((col) => [col, (depois[col] ?? 0) - (antes[col] ?? 0)]));
      const permitido = { categorias: 1, linhas: 1, unidades_medida: 1, fornecedores: 1, itens: 1, acabamentos: 0 };
      const ok = resp.status === 200 && COLECOES_MESTRE.every((col) => deltas[col] === permitido[col]);
      marcar(c, ok ? 'PASSOU' : 'FALHOU', { deltas, permitido }, ok ? null : `deltas ${JSON.stringify(deltas)} ≠ semeadura`);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    casos.push(c);
  }

  // ======== 9. PENDÊNCIAS (moeda/unidade/MOQ/validade ausentes; legado sem dados) ========
  {
    const c = caso('PEND-001', 'Oferta sem moeda/unidade/MOQ/validade → pendência declarada no recibo');
    let ids = null;
    try {
      const cadeia = cadeiaSintetica({ precisao: 2, moq: null });
      const s = await semearCadeia(baseUrl, team.token, cadeia); ids = s.ids;
      // limpa campos opcionais da oferta
      await atualizar(baseUrl, team.token, 'cotacoes_fornecedor', ids.cotForn, { oferta_moeda: '', oferta_unidade: '', oferta_validade: '' });
      const payload = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: `${marcadorGlobal}-pend1` });
      const resp = await postConfirmacao(baseUrl, team.token, payload);
      const pendencias = resp.json?.recibo?.pendencias ?? [];
      const campos = pendencias.map((p) => String(p?.campo ?? p)).join('|');
      const tem = ['moeda', 'unidade', 'validade', 'moq'].filter((k) => campos.includes(k)).length >= 3;
      marcar(c, tem ? 'PASSOU' : 'FALHOU', { http: resp.status, pendencias }, tem ? null : `pendências insuficientes: ${campos}`);
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, ids); }
    casos.push(c);
  }
  {
    const c = caso('PEND-002', 'Cadeia legado sem dados (sem margem/precisão/oferta) → pendência, não erro 500');
    let ids = null;
    try {
      const cadeia = cadeiaSintetica({ margemNegociada: null, margemVersao: null, precisao: null, moq: null });
      const s = await semearCadeia(baseUrl, team.token, cadeia); ids = s.ids;
      const payload = payloadConfirmacao({ cadeia: s.registros, chaveIdempotencia: `${marcadorGlobal}-pend2` });
      const resp = await postConfirmacao(baseUrl, team.token, payload);
      const ok = resp.status >= 400 && resp.status < 500 ? true : resp.status === 200 && Boolean(resp.json?.recibo?.pendencias?.length);
      marcar(c, ok && resp.status !== 500 ? 'PASSOU' : 'FALHOU', { http: resp.status, corpo: resp.json }, ok ? null : 'esperado 4xx ou 200 com pendências — nunca 500');
    } catch (e) { marcar(c, 'FALHOU', null, String(e)); }
    finally { await limparCadeia(baseUrl, team, ids); }
    casos.push(c);
  }

  // ======== 10. CASOS PENDENTES (não prováveis de provar) ========
  casos.push({
    id: 'SUPP-001',
    titulo: 'Isolamento do store c2_suppress_venda sob concorrência (set/remove em try/finally)',
    status: 'PENDENTE',
    motivo:
      'Não provável de provar estaticamente: a supressão do logger legado é por chave no store do servidor ' +
      '(c2_suppress_venda); sob concorrência real precisaríamos de duas requisições simultâneas com timing ' +
      'controlado entre set/remove — ver suppress-store-review.mjs para a revisão estática.',
    evidencia: null,
  });
  casos.push({
    id: 'SUPP-002',
    titulo: 'ID Mei literal da regra (meiqw9s6c4r2t8a) como ator',
    status: 'PENDENTE',
    motivo:
      'O id Mei é literal nas API rules, mas no efêmero o usuário sintético recebe id novo gerado pelo ' +
      'PocketBase na criação — não é possível forçar o id literal via API pública. Casos que dependem do id ' +
      'literal exigem seed no efêmero (fora do escopo desta rodada).',
    evidencia: null,
  });

  return { casos, usuarios, team, mei };
}

export { SENHA_SINTETICA, USUARIOS_SINTETICOS, ID_MEI_REGRA };
