/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

class FakeFields {
  values: Array<{ name: string }>

  constructor(values: Array<{ name: string }> = []) {
    this.values = values
  }

  add(field: { name: string }) {
    this.values.push(field)
  }

  getByName(name: string) {
    return this.values.find((field) => field.name === name)
  }

  removeByName(name: string) {
    this.values = this.values.filter((field) => field.name !== name)
  }
}

class FakeField {
  name: string;
  [key: string]: unknown

  constructor(options: Record<string, unknown>) {
    Object.assign(this, options)
    this.name = String(options.name)
  }
}

class FakeCollection {
  id: string
  name: string
  fields: FakeFields | Array<Record<string, unknown>>;
  [key: string]: unknown

  constructor(options: Record<string, unknown>) {
    Object.assign(this, options)
    this.name = String(options.name)
    this.id = String(options.id || options.name)
    this.fields = (options.fields as Array<Record<string, unknown>>) || []
  }
}

function loadMigration() {
  const source = readFileSync(
    new URL('../../../pocketbase/migrations/0050_create_item_intelligence_mvp.js', import.meta.url),
    'utf8',
  )
  let up: ((app: ReturnType<typeof makeApp>) => void) | undefined
  let down: ((app: ReturnType<typeof makeApp>) => void) | undefined

  const context = {
    Collection: FakeCollection,
    TextField: FakeField,
    SelectField: FakeField,
    migrate: (
      upCallback: (app: ReturnType<typeof makeApp>) => void,
      downCallback: (app: ReturnType<typeof makeApp>) => void,
    ) => {
      up = upCallback
      down = downCallback
    },
  }

  vm.runInNewContext(source, context)
  return { up: up!, down: down! }
}

function makeApp() {
  const collections = new Map<string, FakeCollection | Record<string, any>>()
  const saved: string[] = []
  const deleted: string[] = []
  const queries: string[] = []
  for (const [name, id] of [
    ['itens', 'itens-id'],
    ['fornecedores', 'fornecedores-id'],
    ['potenciais', 'potenciais-id'],
    ['users', '_pb_users_auth_'],
  ]) {
    collections.set(name, {
      id,
      name,
      fields: new FakeFields(name === 'itens' ? [{ name: 'descr_pt' }] : []),
    })
  }

  return {
    collections,
    saved,
    deleted,
    queries,
    findCollectionByNameOrId(name: string) {
      const collection = collections.get(name)
      if (!collection) throw new Error(`missing collection ${name}`)
      return collection
    },
    save(collection: FakeCollection | Record<string, any>) {
      saved.push(collection.name)
      collections.set(collection.name, collection)
    },
    delete(collection: FakeCollection | Record<string, any>) {
      deleted.push(collection.name)
      collections.delete(collection.name)
    },
    db() {
      return {
        newQuery(sql: string) {
          queries.push(sql)
          return { execute: () => undefined }
        },
      }
    },
  }
}

const NEW_COLLECTIONS = [
  'clientes',
  'item_clientes',
  'item_fornecedores',
  'documentos',
  'documento_revisoes',
  'documento_vinculos',
  'item_eventos_comerciais',
]
const AUTHENTICATED_RULE = "@request.auth.id != ''"

const fieldNames = (collection: FakeCollection) =>
  (collection.fields as Array<Record<string, unknown>>).map((field) => field.name)

describe('0050 item intelligence migration', () => {
  it('creates seven read-only collections without changing existing collections', () => {
    const app = makeApp()
    const existingFields = Object.fromEntries(
      ['itens', 'fornecedores', 'potenciais', 'users'].map((name) => [
        name,
        [
          ...((app.collections.get(name) as Record<string, any>).fields.values as Array<{
            name: string
          }>),
        ],
      ]),
    )
    const { up } = loadMigration()

    up(app)

    expect(NEW_COLLECTIONS.every((name) => app.collections.has(name))).toBe(true)
    for (const name of NEW_COLLECTIONS) {
      const collection = app.collections.get(name) as FakeCollection
      expect(collection.listRule, `${name} listRule`).toBe(AUTHENTICATED_RULE)
      expect(collection.viewRule, `${name} viewRule`).toBe(AUTHENTICATED_RULE)
      expect(collection.createRule, `${name} createRule`).toBeNull()
      expect(collection.updateRule, `${name} updateRule`).toBeNull()
      expect(collection.deleteRule, `${name} deleteRule`).toBeNull()
    }

    for (const [name, fields] of Object.entries(existingFields)) {
      expect((app.collections.get(name) as Record<string, any>).fields.values).toEqual(fields)
    }
    expect(app.saved).toEqual(NEW_COLLECTIONS)
    expect(
      (app.collections.get('itens') as Record<string, any>).fields.getByName('aplicacao'),
    ).toBe(undefined)
    expect((app.collections.get('users') as Record<string, any>).fields.getByName('role')).toBe(
      undefined,
    )
  })

  it('creates the item intelligence fields and database integrity triggers', () => {
    const app = makeApp()
    const { up } = loadMigration()

    up(app)

    const clientLinks = app.collections.get('item_clientes') as FakeCollection
    expect(fieldNames(clientLinks)).toEqual(
      expect.arrayContaining([
        'item_id',
        'cliente_id',
        'codigo_original',
        'codigo_normalizado',
        'descricao_original',
        'status_validacao',
        'validado_por',
        'validado_em',
      ]),
    )

    const events = app.collections.get('item_eventos_comerciais') as FakeCollection
    expect(fieldNames(events)).toEqual(
      expect.arrayContaining([
        'tipo',
        'item_id',
        'cliente_id',
        'fornecedor_id',
        'ocorrido_em',
        'valor_unitario_micros',
        'moeda',
        'sistema_origem',
        'chave_origem',
      ]),
    )
    expect(
      app.queries.filter((sql) => sql.includes('validate_item_eventos_books_origin')),
    ).toHaveLength(2)
    expect(
      app.queries
        .filter((sql) => sql.includes('validate_item_eventos_books_origin'))
        .every(
          (sql) =>
            sql.includes("NEW.tipo IN ('compra_books', 'venda_books')") &&
            sql.includes("NEW.sistema_origem IS NOT 'zoho_books'"),
        ),
    ).toBe(true)

    const revisions = app.collections.get('documento_revisoes') as FakeCollection
    expect(fieldNames(revisions)).toEqual(
      expect.arrayContaining(['documento_id', 'revisao', 'workdrive_url', 'sha256', 'vigente']),
    )
    const workDriveUrl = (revisions.fields as Array<Record<string, unknown>>).find(
      (field) => field.name === 'workdrive_url',
    )
    expect(workDriveUrl).toMatchObject({
      type: 'url',
      required: true,
      onlyDomains: expect.arrayContaining(['workdrive.zoho.com', 'workdrive.zohoexternal.com']),
    })
    expect(
      app.queries.filter((sql) => sql.includes('validate_documento_revisoes_https')),
    ).toHaveLength(2)
    expect(
      app.queries
        .filter((sql) => sql.includes('validate_documento_revisoes_https'))
        .every((sql) => sql.includes("NEW.workdrive_url NOT LIKE 'https://%'")),
    ).toBe(true)

    const database = new DatabaseSync(':memory:')
    database.exec(`
      CREATE TABLE item_eventos_comerciais (tipo TEXT, sistema_origem TEXT);
      CREATE TABLE documento_revisoes (workdrive_url TEXT);
    `)
    for (const query of app.queries) database.exec(query)

    expect(() =>
      database.exec("INSERT INTO item_eventos_comerciais VALUES ('compra_books', 'zoho_books')"),
    ).not.toThrow()
    expect(() =>
      database.exec("INSERT INTO item_eventos_comerciais VALUES ('venda_books', 'importacao')"),
    ).toThrow(/Books transactions require sistema_origem zoho_books/)
    expect(() =>
      database.exec("INSERT INTO item_eventos_comerciais VALUES ('compra_books', NULL)"),
    ).toThrow(/Books transactions require sistema_origem zoho_books/)
    expect(() =>
      database.exec(
        "UPDATE item_eventos_comerciais SET sistema_origem = 'zoho_crm' WHERE tipo = 'compra_books'",
      ),
    ).toThrow(/Books transactions require sistema_origem zoho_books/)
    expect(() =>
      database.exec(
        "INSERT INTO documento_revisoes VALUES ('https://workdrive.zoho.com/document-1')",
      ),
    ).not.toThrow()
    expect(() =>
      database.exec(
        "INSERT INTO documento_revisoes VALUES ('http://workdrive.zoho.com/document-1')",
      ),
    ).toThrow(/workdrive_url must use HTTPS/)
    expect(() =>
      database.exec("UPDATE documento_revisoes SET workdrive_url = 'http://workdrive.zoho.com/a'"),
    ).toThrow(/workdrive_url must use HTTPS/)
    database.close()
  })

  it('deletes only the seven new collections in reverse order on rollback', () => {
    const app = makeApp()
    const { up, down } = loadMigration()

    up(app)
    down(app)

    expect(app.deleted).toEqual([...NEW_COLLECTIONS].reverse())
    expect(NEW_COLLECTIONS.every((name) => !app.collections.has(name))).toBe(true)
    expect(app.collections.has('itens')).toBe(true)
    expect(app.collections.has('users')).toBe(true)
    expect(
      (app.collections.get('itens') as Record<string, any>).fields.getByName('descr_pt'),
    ).toBeTruthy()
  })

  it('fails closed and stops rollback when deleting a collection fails', () => {
    const app = makeApp()
    const { up, down } = loadMigration()
    up(app)
    const deleteCollection = app.delete
    app.delete = (collection: FakeCollection | Record<string, any>) => {
      if (collection.name === 'documento_vinculos') throw new Error('delete failed')
      deleteCollection(collection)
    }

    expect(() => down(app)).toThrow('delete failed')
    expect(app.deleted).toEqual(['item_eventos_comerciais'])
    expect(app.collections.has('documento_revisoes')).toBe(true)
    expect(app.collections.has('clientes')).toBe(true)
  })
})
