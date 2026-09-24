/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const operations = new Collection({
      name: 'commercial_intake_operations',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'operation_key', type: 'text', required: true },
        { name: 'approval_ref', type: 'text', required: true },
        { name: 'approved_payload_sha256', type: 'text', required: true },
        { name: 'customer_name', type: 'text', required: true },
        { name: 'crm_account_id', type: 'text', required: true },
        { name: 'crm_deal_id', type: 'text', required: true },
        { name: 'request_date', type: 'text', required: true },
        { name: 'closing_date', type: 'text', required: true },
        { name: 'potential_name', type: 'text', required: true },
        { name: 'status', type: 'text', required: true },
        { name: 'potential_observations', type: 'text', required: true },
        { name: 'expected_item_count', type: 'number', required: true, onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_commercial_intake_operations_operation_key ON commercial_intake_operations (operation_key)',
      ],
    })
    app.save(operations)

    const approvals = new Collection({
      name: 'commercial_intake_approvals',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'operation_id',
          type: 'relation',
          required: true,
          collectionId: operations.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'attempt_no', type: 'number', required: true, min: 1, onlyInt: true },
        { name: 'request_sha256', type: 'text', required: true },
        { name: 'capability_sha256', type: 'text', required: true },
        { name: 'environment', type: 'text', required: true },
        { name: 'write_expires_at', type: 'date', required: true },
        { name: 'recovery_expires_at', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_commercial_intake_approvals_capability_sha256 ON commercial_intake_approvals (capability_sha256)',
        'CREATE UNIQUE INDEX idx_commercial_intake_approvals_operation_attempt ON commercial_intake_approvals (operation_id, attempt_no)',
      ],
    })
    app.save(approvals)

    const results = new Collection({
      name: 'commercial_intake_results',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'operation_id',
          type: 'relation',
          required: true,
          collectionId: operations.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'request_sha256', type: 'text', required: true },
        {
          name: 'approval_id',
          type: 'relation',
          required: true,
          collectionId: approvals.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'potential_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('potenciais').id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'line_1_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('potencial_itens').id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'line_2_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('potencial_itens').id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'crm_deal_id', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_commercial_intake_results_operation_id ON commercial_intake_results (operation_id)',
      ],
    })
    app.save(results)

    const terminalGuards = [
      `CREATE TRIGGER trg_commercial_intake_operation_update
       BEFORE UPDATE ON commercial_intake_operations
       WHEN EXISTS (
         SELECT 1 FROM commercial_intake_results WHERE operation_id = OLD.id
       )
       BEGIN SELECT RAISE(IGNORE); END`,
      `CREATE TRIGGER trg_commercial_intake_operation_delete
       BEFORE DELETE ON commercial_intake_operations
       WHEN EXISTS (
         SELECT 1 FROM commercial_intake_results WHERE operation_id = OLD.id
       )
       BEGIN SELECT RAISE(IGNORE); END`,
      `CREATE TRIGGER trg_commercial_intake_approval_update
       BEFORE UPDATE ON commercial_intake_approvals
       WHEN EXISTS (
         SELECT 1 FROM commercial_intake_results WHERE approval_id = OLD.id
       ) AND (
         NEW.operation_id IS NOT OLD.operation_id OR
         NEW.attempt_no IS NOT OLD.attempt_no OR
         NEW.request_sha256 IS NOT OLD.request_sha256 OR
         NEW.capability_sha256 IS NOT OLD.capability_sha256 OR
         NEW.environment IS NOT OLD.environment OR
         julianday(NEW.write_expires_at) > julianday(OLD.write_expires_at) OR
         julianday(NEW.recovery_expires_at) > julianday(OLD.recovery_expires_at)
       )
       BEGIN SELECT RAISE(IGNORE); END`,
      `CREATE TRIGGER trg_commercial_intake_approval_delete
       BEFORE DELETE ON commercial_intake_approvals
       WHEN EXISTS (
         SELECT 1 FROM commercial_intake_results WHERE approval_id = OLD.id
       )
       BEGIN SELECT RAISE(IGNORE); END`,
      `CREATE TRIGGER trg_commercial_intake_result_update
       BEFORE UPDATE ON commercial_intake_results
       BEGIN SELECT RAISE(IGNORE); END`,
      `CREATE TRIGGER trg_commercial_intake_result_delete
       BEFORE DELETE ON commercial_intake_results
       BEGIN SELECT RAISE(IGNORE); END`,
      `CREATE TRIGGER trg_commercial_intake_potential_update
       BEFORE UPDATE ON potenciais
       WHEN EXISTS (
         SELECT 1 FROM commercial_intake_results WHERE potential_id = OLD.id
       )
       BEGIN SELECT RAISE(IGNORE); END`,
      `CREATE TRIGGER trg_commercial_intake_potential_delete
       BEFORE DELETE ON potenciais
       WHEN EXISTS (
         SELECT 1 FROM commercial_intake_results WHERE potential_id = OLD.id
       )
       BEGIN SELECT RAISE(IGNORE); END`,
      `CREATE TRIGGER trg_commercial_intake_line_insert_terminal
       BEFORE INSERT ON potencial_itens
       WHEN EXISTS (
         SELECT 1 FROM commercial_intake_results WHERE potential_id = NEW.potencial_id
       )
       BEGIN SELECT RAISE(IGNORE); END`,
      `CREATE TRIGGER trg_commercial_intake_line_update
       BEFORE UPDATE ON potencial_itens
       WHEN EXISTS (
         SELECT 1 FROM commercial_intake_results
         WHERE potential_id = OLD.potencial_id OR potential_id = NEW.potencial_id
       )
       BEGIN SELECT RAISE(IGNORE); END`,
      `CREATE TRIGGER trg_commercial_intake_line_delete
       BEFORE DELETE ON potencial_itens
       WHEN EXISTS (
         SELECT 1 FROM commercial_intake_results WHERE potential_id = OLD.potencial_id
       )
       BEGIN SELECT RAISE(IGNORE); END`,
      `CREATE TRIGGER trg_commercial_intake_history_insert
       BEFORE INSERT ON historico_precos
       WHEN EXISTS (
         SELECT 1 FROM commercial_intake_results WHERE potential_id = NEW.potencial_id
       )
       BEGIN SELECT RAISE(IGNORE); END`,
      `CREATE TRIGGER trg_commercial_intake_history_update
       BEFORE UPDATE ON historico_precos
       WHEN EXISTS (
         SELECT 1 FROM commercial_intake_results
         WHERE potential_id = OLD.potencial_id OR potential_id = NEW.potencial_id
       )
       BEGIN SELECT RAISE(IGNORE); END`,
      `CREATE TRIGGER trg_commercial_intake_line_order_insert
       BEFORE INSERT ON potencial_itens
       WHEN NEW.ordem IS NOT NULL
         AND NEW.ordem != CAST(NEW.ordem AS INTEGER)
         AND EXISTS (
           SELECT 1
           FROM potenciais p
           JOIN commercial_intake_operations o ON o.operation_key = p.numero_potencial
           WHERE p.id = NEW.potencial_id
         )
       BEGIN SELECT RAISE(ABORT, 'commercial intake line order must be integer'); END`,
      `CREATE TRIGGER trg_commercial_intake_line_order_update
       BEFORE UPDATE OF ordem, potencial_id ON potencial_itens
       WHEN NEW.ordem IS NOT NULL
         AND NEW.ordem != CAST(NEW.ordem AS INTEGER)
         AND EXISTS (
           SELECT 1
           FROM potenciais p
           JOIN commercial_intake_operations o ON o.operation_key = p.numero_potencial
           WHERE p.id = NEW.potencial_id
         )
       BEGIN SELECT RAISE(ABORT, 'commercial intake line order must be integer'); END`,
    ]

    for (const sql of terminalGuards) {
      app.db().newQuery(sql).execute()
    }
  },
  (app) => {
    for (const name of [
      'trg_commercial_intake_history_update',
      'trg_commercial_intake_history_insert',
      'trg_commercial_intake_line_order_update',
      'trg_commercial_intake_line_order_insert',
      'trg_commercial_intake_line_delete',
      'trg_commercial_intake_line_update',
      'trg_commercial_intake_line_insert_terminal',
      'trg_commercial_intake_potential_delete',
      'trg_commercial_intake_potential_update',
      'trg_commercial_intake_result_delete',
      'trg_commercial_intake_result_update',
      'trg_commercial_intake_approval_delete',
      'trg_commercial_intake_approval_update',
      'trg_commercial_intake_operation_delete',
      'trg_commercial_intake_operation_update',
    ]) {
      app.db().newQuery(`DROP TRIGGER ${name}`).execute()
    }

    for (const name of [
      'commercial_intake_results',
      'commercial_intake_approvals',
      'commercial_intake_operations',
    ]) {
      app.delete(app.findCollectionByNameOrId(name))
    }
  },
)
