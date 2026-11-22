/**
 * Executor da matriz de casos de confirmação de compra, rodando sobre o
 * harness isolado (PocketBase efêmero em loopback, dataDir temporário).
 *
 * Uso:
 *   node tests/isolated/run.mjs
 *   PB_EXEC=/caminho/pocketbase node tests/isolated/run.mjs
 *
 * IMPORTANTE: se o runtime PocketBase não estiver disponível nesta plataforma,
 * o executor imprime TODOS os casos como NAO_EXECUTADO com a razão — nunca
 * fabrica sucesso (exigência da rodada).
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import {
  startEphemeralPocketBase,
  stopEphemeralPocketBase,
  SYNTH_USERS,
} from './harness.mjs'
import { authHeaders, loginSynthetic } from './auth.mjs'
import { seedCenarioBase, seedCenario, seedUsuarios } from './fixtures.mjs'
import { verifyProductionInvariants } from './verify-real-file.mjs'
import { analyzeSuppressStore } from './suppress-store-review.mjs'

const CASES = [ ... ]
export async function runMatrix(...) { ... }
