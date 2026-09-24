/// <reference path="../pb_data/types.d.ts" />

// RECONSTRUCTED from a read-only export of the live schema because the original
// migration source is unavailable. Field IDs, relation cardinality/cascade
// options, file limits/MIME types, and the supplier_red_flags collection ID were
// not exposed; they are intentionally omitted and resolved by PocketBase v0.39.0.
migrate(
  (app) => {
    const authenticatedRule = "@request.auth.id != ''"
    const fornecedores = app.findCollectionByNameOrId('fornecedores')

    const assessments = new Collection({
      id: 'pbc_2674300931',
      name: 'supplier_assessments',
      type: 'base',
      listRule: authenticatedRule,
      viewRule: authenticatedRule,
      createRule: authenticatedRule,
      updateRule: authenticatedRule,
      deleteRule: authenticatedRule,
      fields: [
        {
          name: 'supplier_id',
          type: 'relation',
          required: true,
          collectionId: fornecedores.id,
        },
        { name: 'assessment_type', type: 'text', required: true },
        { name: 'assessment_date', type: 'date', required: true },
        { name: 'c2_responsible', type: 'text', required: false },
        { name: 'external_auditor_inspector', type: 'text', required: false },
        { name: 'assessment_status', type: 'text', required: true },
        { name: 'risk_level', type: 'text', required: false },
        { name: 'result', type: 'text', required: false },
        { name: 'number_of_alerts', type: 'number', required: false },
        { name: 'critical_alert', type: 'bool', required: false },
        { name: 'summary', type: 'text', required: false },
        { name: 'findings', type: 'text', required: false },
        { name: 'recommendations', type: 'text', required: false },
        { name: 'corrective_actions_required', type: 'text', required: false },
        { name: 'corrective_actions_completed', type: 'bool', required: false },
        { name: 'source_of_information', type: 'text', required: false },
        { name: 'next_review_date', type: 'date', required: false },
        { name: 'approved_by', type: 'text', required: false },
        { name: 'approval_date', type: 'date', required: false },
        { name: 'internal_notes', type: 'text', required: false },
        { name: 'attachments', type: 'file', required: false },
        { name: 'photos', type: 'file', required: false },
        { name: 'visit_factory_exists', type: 'bool', required: false },
        { name: 'visit_own_production_confirmed', type: 'bool', required: false },
        { name: 'visit_address_confirmed', type: 'bool', required: false },
        { name: 'visit_score_production_org', type: 'number', required: false },
        { name: 'visit_score_quality_control', type: 'number', required: false },
        { name: 'visit_score_production_capacity', type: 'number', required: false },
        { name: 'visit_score_equipment_condition', type: 'number', required: false },
        { name: 'visit_score_technical_team', type: 'number', required: false },
        { name: 'visit_score_warehouse_condition', type: 'number', required: false },
        { name: 'visit_score_safety_conditions', type: 'number', required: false },
        { name: 'visit_score_overall_impression', type: 'number', required: false },
        { name: 'visit_conclusion', type: 'text', required: false },
        { name: 'visit_video_url', type: 'text', required: false },
        { name: 'audit_auditor_name', type: 'text', required: false },
        { name: 'audit_company', type: 'text', required: false },
        { name: 'audit_score', type: 'number', required: false },
        { name: 'audit_major_non_conformities', type: 'number', required: false },
        { name: 'audit_minor_non_conformities', type: 'number', required: false },
        { name: 'audit_corrective_action_required', type: 'text', required: false },
        { name: 'audit_corrective_action_deadline', type: 'date', required: false },
        { name: 'audit_corrective_action_completed', type: 'bool', required: false },
        { name: 'audit_final_result', type: 'text', required: false },
        { name: 'dd_legal_company_name_confirmed', type: 'bool', required: false },
        { name: 'dd_chinese_company_name', type: 'text', required: false },
        { name: 'dd_uscc', type: 'text', required: false },
        { name: 'dd_registration_status', type: 'text', required: false },
        { name: 'dd_registered_capital', type: 'text', required: false },
        { name: 'dd_paid_in_capital', type: 'text', required: false },
        { name: 'dd_foundation_date', type: 'date', required: false },
        { name: 'dd_legal_representative', type: 'text', required: false },
        { name: 'dd_registered_address', type: 'text', required: false },
        { name: 'dd_business_scope', type: 'text', required: false },
        { name: 'dd_manufacturer_status_confirmed', type: 'bool', required: false },
        { name: 'dd_export_capability', type: 'text', required: false },
        { name: 'dd_litigation_found', type: 'bool', required: false },
        { name: 'dd_court_cases', type: 'text', required: false },
        { name: 'dd_admin_penalties', type: 'text', required: false },
        { name: 'dd_abnormal_operation_records', type: 'text', required: false },
        { name: 'dd_enforcement_records', type: 'text', required: false },
        { name: 'dd_pledged_shares_equity_issues', type: 'text', required: false },
        { name: 'dd_intellectual_property', type: 'text', required: false },
        { name: 'dd_certifications', type: 'text', required: false },
        { name: 'dd_other_risk_alerts', type: 'text', required: false },
        { name: 'dd_source_platform', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_assessments_supplier ON supplier_assessments (supplier_id)',
        'CREATE INDEX idx_assessments_type ON supplier_assessments (assessment_type)',
        'CREATE INDEX idx_assessments_date ON supplier_assessments (assessment_date)',
        'CREATE INDEX idx_assessments_status ON supplier_assessments (assessment_status)',
      ],
    })
    app.save(assessments)

    const redFlags = new Collection({
      name: 'supplier_red_flags',
      type: 'base',
      listRule: authenticatedRule,
      viewRule: authenticatedRule,
      createRule: authenticatedRule,
      updateRule: authenticatedRule,
      deleteRule: authenticatedRule,
      fields: [
        {
          name: 'supplier_id',
          type: 'relation',
          required: true,
          collectionId: fornecedores.id,
        },
        {
          name: 'assessment_id',
          type: 'relation',
          required: false,
          collectionId: assessments.id,
        },
        { name: 'category', type: 'text', required: true },
        { name: 'severity', type: 'text', required: true },
        { name: 'description', type: 'text', required: true },
        { name: 'action_required', type: 'text', required: false },
        { name: 'resolved', type: 'bool', required: false },
        { name: 'resolved_at', type: 'date', required: false },
        { name: 'resolved_by', type: 'text', required: false },
        { name: 'resolution_notes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_redflags_supplier ON supplier_red_flags (supplier_id)',
        'CREATE INDEX idx_redflags_severity ON supplier_red_flags (severity)',
        'CREATE INDEX idx_redflags_resolved ON supplier_red_flags (resolved)',
      ],
    })
    app.save(redFlags)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('supplier_red_flags'))
    app.delete(app.findCollectionByNameOrId('supplier_assessments'))
  },
)
