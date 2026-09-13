/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const authenticated = "@request.auth.id != ''"

    const users = app.findCollectionByNameOrId('users')
    const itens = app.findCollectionByNameOrId('itens')
    const fornecedores = app.findCollectionByNameOrId('fornecedores')

    const clientes = new Collection({
      name: 'clientes',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'zoho_crm_id', type: 'text' },
        { name: 'zoho_books_id', type: 'text' },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_clientes_crm_id ON clientes (zoho_crm_id) WHERE zoho_crm_id != ''",
        "CREATE UNIQUE INDEX idx_clientes_books_id ON clientes (zoho_books_id) WHERE zoho_books_id != ''",
      ],
    })
    app.save(clientes)

    const itemClientes = new Collection({
      name: 'item_clientes',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'item_id',
          type: 'relation',
          required: true,
          collectionId: itens.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientes.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'codigo_original', type: 'text' },
        { name: 'codigo_normalizado', type: 'text' },
        { name: 'descricao_original', type: 'text', required: true },
        { name: 'idioma', type: 'text' },
        { name: 'unidade_cliente', type: 'text' },
        {
          name: 'status_validacao',
          type: 'select',
          required: true,
          values: ['proposto', 'validado', 'rejeitado', 'inativo'],
          maxSelect: 1,
        },
        { name: 'origem', type: 'text' },
        {
          name: 'validado_por',
          type: 'relation',
          collectionId: users.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'validado_em', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_item_clientes_item ON item_clientes (item_id)',
        'CREATE INDEX idx_item_clientes_cliente_status ON item_clientes (cliente_id, status_validacao)',
        "CREATE UNIQUE INDEX idx_item_clientes_codigo_validado ON item_clientes (cliente_id, codigo_normalizado) WHERE codigo_normalizado != '' AND status_validacao = 'validado'",
      ],
    })
    app.save(itemClientes)

    const itemFornecedores = new Collection({
      name: 'item_fornecedores',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'item_id',
          type: 'relation',
          required: true,
          collectionId: itens.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'fornecedor_id',
          type: 'relation',
          required: true,
          collectionId: fornecedores.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'codigo_original', type: 'text' },
        { name: 'codigo_normalizado', type: 'text' },
        { name: 'descricao_original', type: 'text', required: true },
        { name: 'idioma', type: 'text' },
        { name: 'unidade_fornecedor', type: 'text' },
        { name: 'principal', type: 'bool' },
        {
          name: 'status_validacao',
          type: 'select',
          required: true,
          values: ['proposto', 'validado', 'rejeitado', 'inativo'],
          maxSelect: 1,
        },
        { name: 'origem', type: 'text' },
        {
          name: 'validado_por',
          type: 'relation',
          collectionId: users.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'validado_em', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_item_fornecedores_item ON item_fornecedores (item_id)',
        'CREATE INDEX idx_item_fornecedores_fornecedor_status ON item_fornecedores (fornecedor_id, status_validacao)',
        "CREATE UNIQUE INDEX idx_item_fornecedores_codigo_validado ON item_fornecedores (fornecedor_id, codigo_normalizado) WHERE codigo_normalizado != '' AND status_validacao = 'validado'",
      ],
    })
    app.save(itemFornecedores)

    const documentos = new Collection({
      name: 'documentos',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'codigo', type: 'text' },
        { name: 'titulo', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'desenho',
            'especificacao',
            'certificado',
            'embalagem',
            'etiqueta',
            'manual',
            'outro',
          ],
          maxSelect: 1,
        },
        {
          name: 'origem_tipo',
          type: 'select',
          required: true,
          values: ['c2', 'cliente', 'fornecedor'],
          maxSelect: 1,
        },
        {
          name: 'cliente_id',
          type: 'relation',
          collectionId: clientes.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'fornecedor_id',
          type: 'relation',
          collectionId: fornecedores.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_documentos_codigo ON documentos (codigo) WHERE codigo != ''",
        'CREATE INDEX idx_documentos_origem ON documentos (origem_tipo, cliente_id, fornecedor_id)',
      ],
    })
    app.save(documentos)

    const documentoRevisoes = new Collection({
      name: 'documento_revisoes',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'documento_id',
          type: 'relation',
          required: true,
          collectionId: documentos.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'revisao', type: 'text', required: true },
        {
          name: 'workdrive_url',
          type: 'url',
          required: true,
          onlyDomains: [
            'workdrive.zoho.com',
            'workdrive.zoho.eu',
            'workdrive.zoho.in',
            'workdrive.zoho.com.au',
            'workdrive.zoho.jp',
            'workdrive.zoho.ca',
            'workdrive.zoho.sa',
            'workdrive.zohoexternal.com',
            'workdrive.zohoexternal.eu',
            'workdrive.zohoexternal.in',
            'workdrive.zohoexternal.com.au',
            'workdrive.zohoexternal.jp',
            'workdrive.zohoexternal.ca',
            'workdrive.zohoexternal.sa',
          ],
        },
        { name: 'workdrive_file_id', type: 'text' },
        { name: 'sha256', type: 'text', required: true },
        { name: 'mime_type', type: 'text' },
        { name: 'tamanho_bytes', type: 'number' },
        { name: 'vigente', type: 'bool' },
        { name: 'data_documento', type: 'date' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_documento_revisoes_versao ON documento_revisoes (documento_id, revisao)',
        'CREATE UNIQUE INDEX idx_documento_revisoes_hash ON documento_revisoes (documento_id, sha256)',
        'CREATE UNIQUE INDEX idx_documento_revisoes_vigente ON documento_revisoes (documento_id) WHERE vigente = 1',
      ],
    })
    app.save(documentoRevisoes)

    for (const operation of ['insert', 'update']) {
      app
        .db()
        .newQuery(
          `CREATE TRIGGER validate_documento_revisoes_https_${operation}
          BEFORE ${operation.toUpperCase()} ON documento_revisoes
          WHEN NEW.workdrive_url NOT LIKE 'https://%'
          BEGIN
            SELECT RAISE(ABORT, 'workdrive_url must use HTTPS');
          END`,
        )
        .execute()
    }

    const documentoVinculos = new Collection({
      name: 'documento_vinculos',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'documento_revisao_id',
          type: 'relation',
          required: true,
          collectionId: documentoRevisoes.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'item_id',
          type: 'relation',
          required: true,
          collectionId: itens.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'cliente_id',
          type: 'relation',
          collectionId: clientes.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'fornecedor_id',
          type: 'relation',
          collectionId: fornecedores.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'tipo_vinculo',
          type: 'select',
          required: true,
          values: ['c2', 'cliente', 'fornecedor', 'aplicacao'],
          maxSelect: 1,
        },
        { name: 'aplicacao', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_documento_vinculos_item ON documento_vinculos (item_id)',
        'CREATE INDEX idx_documento_vinculos_revisao ON documento_vinculos (documento_revisao_id)',
      ],
    })
    app.save(documentoVinculos)

    const itemEventosComerciais = new Collection({
      name: 'item_eventos_comerciais',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['cotacao_fornecedor', 'compra_books', 'cotacao_cliente', 'venda_books'],
          maxSelect: 1,
        },
        {
          name: 'item_id',
          type: 'relation',
          required: true,
          collectionId: itens.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'cliente_id',
          type: 'relation',
          collectionId: clientes.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'fornecedor_id',
          type: 'relation',
          collectionId: fornecedores.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'ocorrido_em', type: 'date', required: true },
        { name: 'quantidade', type: 'number' },
        { name: 'unidade', type: 'text' },
        { name: 'valor_unitario_micros', type: 'number', required: true },
        { name: 'moeda', type: 'text', required: true },
        {
          name: 'sistema_origem',
          type: 'select',
          required: true,
          values: ['skip', 'zoho_books', 'zoho_crm', 'importacao'],
          maxSelect: 1,
        },
        { name: 'chave_origem', type: 'text', required: true },
        {
          name: 'documento_revisao_id',
          type: 'relation',
          collectionId: documentoRevisoes.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_item_eventos_origem ON item_eventos_comerciais (sistema_origem, chave_origem)',
        'CREATE INDEX idx_item_eventos_item_tipo_data ON item_eventos_comerciais (item_id, tipo, ocorrido_em DESC)',
        'CREATE INDEX idx_item_eventos_cliente_data ON item_eventos_comerciais (cliente_id, ocorrido_em DESC)',
        'CREATE INDEX idx_item_eventos_fornecedor_data ON item_eventos_comerciais (fornecedor_id, ocorrido_em DESC)',
      ],
    })
    app.save(itemEventosComerciais)

    for (const operation of ['insert', 'update']) {
      app
        .db()
        .newQuery(
          `CREATE TRIGGER validate_item_eventos_books_origin_${operation}
          BEFORE ${operation.toUpperCase()} ON item_eventos_comerciais
          WHEN NEW.tipo IN ('compra_books', 'venda_books')
            AND NEW.sistema_origem IS NOT 'zoho_books'
          BEGIN
            SELECT RAISE(ABORT, 'Books transactions require sistema_origem zoho_books');
          END`,
        )
        .execute()
    }
  },
  (app) => {
    for (const name of [
      'item_eventos_comerciais',
      'documento_vinculos',
      'documento_revisoes',
      'documentos',
      'item_fornecedores',
      'item_clientes',
      'clientes',
    ]) {
      app.delete(app.findCollectionByNameOrId(name))
    }
  },
)
