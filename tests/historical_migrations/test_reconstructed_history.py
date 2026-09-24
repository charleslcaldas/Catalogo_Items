from __future__ import annotations

import json
import shutil
import sqlite3
import subprocess
import tempfile
import unittest
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = REPO_ROOT / 'pocketbase' / 'migrations'
PB_BINARY = Path('/root/work/pocketbase-v0.39.0/bin/pocketbase')
MIGRATION_0034 = MIGRATIONS / '0034_create_potencial_notas.js'
MIGRATION_0050 = MIGRATIONS / '0050_create_supplier_qualification_and_assessments.js'
AUTHENTICATED_RULE = "@request.auth.id != ''"

POTENCIAL_NOTAS_FIELDS = [
    ('potencial_id', 'relation', True, 'potenciais'),
    ('user_id', 'relation', True, 'users'),
    ('conteudo', 'text', True, None),
    ('created', 'autodate', None, None),
    ('updated', 'autodate', None, None),
    ('categoria', 'text', False, None),
    ('fornecedor_id', 'relation', False, 'fornecedores'),
]

SUPPLIER_ASSESSMENT_FIELDS = [
    ('supplier_id', 'relation', True, 'fornecedores'),
    ('assessment_type', 'text', True, None),
    ('assessment_date', 'date', True, None),
    ('c2_responsible', 'text', False, None),
    ('external_auditor_inspector', 'text', False, None),
    ('assessment_status', 'text', True, None),
    ('risk_level', 'text', False, None),
    ('result', 'text', False, None),
    ('number_of_alerts', 'number', False, None),
    ('critical_alert', 'bool', False, None),
    ('summary', 'text', False, None),
    ('findings', 'text', False, None),
    ('recommendations', 'text', False, None),
    ('corrective_actions_required', 'text', False, None),
    ('corrective_actions_completed', 'bool', False, None),
    ('source_of_information', 'text', False, None),
    ('next_review_date', 'date', False, None),
    ('approved_by', 'text', False, None),
    ('approval_date', 'date', False, None),
    ('internal_notes', 'text', False, None),
    ('attachments', 'file', False, None),
    ('photos', 'file', False, None),
    ('visit_factory_exists', 'bool', False, None),
    ('visit_own_production_confirmed', 'bool', False, None),
    ('visit_address_confirmed', 'bool', False, None),
    ('visit_score_production_org', 'number', False, None),
    ('visit_score_quality_control', 'number', False, None),
    ('visit_score_production_capacity', 'number', False, None),
    ('visit_score_equipment_condition', 'number', False, None),
    ('visit_score_technical_team', 'number', False, None),
    ('visit_score_warehouse_condition', 'number', False, None),
    ('visit_score_safety_conditions', 'number', False, None),
    ('visit_score_overall_impression', 'number', False, None),
    ('visit_conclusion', 'text', False, None),
    ('visit_video_url', 'text', False, None),
    ('audit_auditor_name', 'text', False, None),
    ('audit_company', 'text', False, None),
    ('audit_score', 'number', False, None),
    ('audit_major_non_conformities', 'number', False, None),
    ('audit_minor_non_conformities', 'number', False, None),
    ('audit_corrective_action_required', 'text', False, None),
    ('audit_corrective_action_deadline', 'date', False, None),
    ('audit_corrective_action_completed', 'bool', False, None),
    ('audit_final_result', 'text', False, None),
    ('dd_legal_company_name_confirmed', 'bool', False, None),
    ('dd_chinese_company_name', 'text', False, None),
    ('dd_uscc', 'text', False, None),
    ('dd_registration_status', 'text', False, None),
    ('dd_registered_capital', 'text', False, None),
    ('dd_paid_in_capital', 'text', False, None),
    ('dd_foundation_date', 'date', False, None),
    ('dd_legal_representative', 'text', False, None),
    ('dd_registered_address', 'text', False, None),
    ('dd_business_scope', 'text', False, None),
    ('dd_manufacturer_status_confirmed', 'bool', False, None),
    ('dd_export_capability', 'text', False, None),
    ('dd_litigation_found', 'bool', False, None),
    ('dd_court_cases', 'text', False, None),
    ('dd_admin_penalties', 'text', False, None),
    ('dd_abnormal_operation_records', 'text', False, None),
    ('dd_enforcement_records', 'text', False, None),
    ('dd_pledged_shares_equity_issues', 'text', False, None),
    ('dd_intellectual_property', 'text', False, None),
    ('dd_certifications', 'text', False, None),
    ('dd_other_risk_alerts', 'text', False, None),
    ('dd_source_platform', 'text', False, None),
    ('created', 'autodate', None, None),
    ('updated', 'autodate', None, None),
]

SUPPLIER_RED_FLAG_FIELDS = [
    ('supplier_id', 'relation', True, 'fornecedores'),
    ('assessment_id', 'relation', False, 'supplier_assessments'),
    ('category', 'text', True, None),
    ('severity', 'text', True, None),
    ('description', 'text', True, None),
    ('action_required', 'text', False, None),
    ('resolved', 'bool', False, None),
    ('resolved_at', 'date', False, None),
    ('resolved_by', 'text', False, None),
    ('resolution_notes', 'text', False, None),
    ('created', 'autodate', None, None),
    ('updated', 'autodate', None, None),
]

ASSESSMENT_INDEXES = {
    'idx_assessments_supplier',
    'idx_assessments_type',
    'idx_assessments_date',
    'idx_assessments_status',
}
RED_FLAG_INDEXES = {
    'idx_redflags_supplier',
    'idx_redflags_severity',
    'idx_redflags_resolved',
}
ASSESSMENT_INDEX_SQL = {
    'idx_assessments_supplier': 'CREATE INDEX idx_assessments_supplier ON supplier_assessments (supplier_id)',
    'idx_assessments_type': 'CREATE INDEX idx_assessments_type ON supplier_assessments (assessment_type)',
    'idx_assessments_date': 'CREATE INDEX idx_assessments_date ON supplier_assessments (assessment_date)',
    'idx_assessments_status': 'CREATE INDEX idx_assessments_status ON supplier_assessments (assessment_status)',
}
RED_FLAG_INDEX_SQL = {
    'idx_redflags_supplier': 'CREATE INDEX idx_redflags_supplier ON supplier_red_flags (supplier_id)',
    'idx_redflags_severity': 'CREATE INDEX idx_redflags_severity ON supplier_red_flags (severity)',
    'idx_redflags_resolved': 'CREATE INDEX idx_redflags_resolved ON supplier_red_flags (resolved)',
}
EXPORTED_SCHEMA_PATH = Path(__file__).resolve().parent / 'fixtures' / 'exported_schema.json'
EXPORTED_SCHEMA = json.loads(EXPORTED_SCHEMA_PATH.read_text(encoding='utf-8'))
RULE_KEYS = ('list', 'view', 'create', 'update', 'delete')


class DisposablePocketBase:
    def __init__(self) -> None:
        self._tmp = tempfile.TemporaryDirectory(prefix='reconstructed-history-')
        self.root = Path(self._tmp.name)
        self.data_dir = self.root / 'pb_data'
        self.hooks_dir = self.root / 'pb_hooks'
        self.migrations_dir = self.root / 'pb_migrations'
        for directory in (self.data_dir, self.hooks_dir, self.migrations_dir):
            directory.mkdir()

    def close(self) -> None:
        self._tmp.cleanup()

    def copy_full_history(self) -> None:
        for source in sorted(MIGRATIONS.glob('*.js')):
            shutil.copy2(source, self.migrations_dir / source.name)

    def write_fixture(self, name: str, source: str) -> None:
        (self.migrations_dir / name).write_text(source, encoding='utf-8')

    def copy_migration(self, source: Path) -> None:
        shutil.copy2(source, self.migrations_dir / source.name)

    def migrate_up(self) -> subprocess.CompletedProcess[str]:
        return self._run('up')

    def migrate_down(self, count: int = 1) -> subprocess.CompletedProcess[str]:
        return self._run('down', str(count), input_text='y\n')

    def _run(self, *args: str, input_text: str | None = None) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                str(PB_BINARY),
                'migrate',
                *args,
                '--dir',
                str(self.data_dir),
                '--hooksDir',
                str(self.hooks_dir),
                '--migrationsDir',
                str(self.migrations_dir),
            ],
            cwd=REPO_ROOT,
            capture_output=True,
            input=input_text,
            text=True,
            timeout=60,
            check=False,
        )

    def rows(self, query: str, params: tuple[Any, ...] = ()) -> list[tuple[Any, ...]]:
        with sqlite3.connect(self.data_dir / 'data.db') as connection:
            return connection.execute(query, params).fetchall()

    def collection(self, name: str) -> dict[str, Any]:
        rows = self.rows(
            'SELECT id, name, type, system, listRule, viewRule, createRule, updateRule, '
            'deleteRule, fields FROM _collections WHERE name = ?',
            (name,),
        )
        if len(rows) != 1:
            raise AssertionError(f'expected one collection named {name}, got {len(rows)}')
        row = rows[0]
        return {
            'id': row[0],
            'name': row[1],
            'type': row[2],
            'system': bool(row[3]),
            'rules': row[4:9],
            'fields': json.loads(row[9]),
        }

    def collection_exists(self, name: str) -> bool:
        return self.rows('SELECT count(*) FROM _collections WHERE name = ?', (name,))[0][0] == 1

    def index_names(self, table: str) -> set[str]:
        return {
            row[0]
            for row in self.rows(
                "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = ? "
                "AND sql IS NOT NULL",
                (table,),
            )
        }

    def index_definitions(self, table: str) -> dict[str, str]:
        return {
            row[0]: ' '.join(row[1].replace('`', '').split())
            for row in self.rows(
                "SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ? "
                "AND sql IS NOT NULL",
                (table,),
            )
        }

    def migration_marker_exists(self, file_name: str) -> bool:
        count = self.rows('SELECT count(*) FROM _migrations WHERE file = ?', (file_name,))[0][0]
        return count == 1

    def __enter__(self) -> 'DisposablePocketBase':
        return self

    def __exit__(self, *_: object) -> None:
        self.close()


class ReconstructedHistoryTest(unittest.TestCase):
    def test_exported_schema_fixture_is_internally_consistent(self) -> None:
        collections = EXPORTED_SCHEMA['collections']
        expected = {
            'potencial_notas': (
                POTENCIAL_NOTAS_FIELDS,
                [],
                'pbc_1767808957',
            ),
            'supplier_assessments': (
                SUPPLIER_ASSESSMENT_FIELDS,
                list(ASSESSMENT_INDEX_SQL.values()),
                'pbc_2674300931',
            ),
            'supplier_red_flags': (
                SUPPLIER_RED_FLAG_FIELDS,
                list(RED_FLAG_INDEX_SQL.values()),
                None,
            ),
        }

        for name, (expected_fields, expected_indexes, expected_id) in expected.items():
            with self.subTest(collection=name):
                exported = collections[name]
                exported_fields = [
                    (field['name'], field['type'], field['required'], field['target'])
                    for field in exported['fields']
                ]
                self.assertEqual(exported['field_count'], len(exported_fields))
                self.assertEqual(len({field[0] for field in exported_fields}), len(exported_fields))
                self.assertEqual(exported_fields, expected_fields)
                self.assertEqual(exported['indexes'], expected_indexes)
                self.assertEqual(exported['id'], expected_id)
                self.assertEqual(tuple(exported['rules']), RULE_KEYS)

        self.assertEqual(
            tuple(collections['potencial_notas']['rules'].values()),
            (
                AUTHENTICATED_RULE,
                AUTHENTICATED_RULE,
                AUTHENTICATED_RULE,
                "@request.auth.id != '' && user_id = @request.auth.id",
                "@request.auth.id != '' && user_id = @request.auth.id",
            ),
        )
        self.assertEqual(
            tuple(collections['supplier_assessments']['rules'].values()),
            (AUTHENTICATED_RULE,) * 5,
        )
        self.assertEqual(
            tuple(collections['supplier_red_flags']['rules'].values()),
            (AUTHENTICATED_RULE,) * 5,
        )

    def assert_collection_matches(
        self,
        db: DisposablePocketBase,
        name: str,
        expected_fields: list[tuple[str, str, bool | None, str | None]],
        expected_rules: tuple[str, ...],
    ) -> None:
        collection = db.collection(name)
        self.assertEqual(collection['type'], 'base')
        self.assertFalse(collection['system'])
        self.assertEqual(collection['rules'], expected_rules)

        user_fields = [field for field in collection['fields'] if not field.get('system')]
        self.assertEqual([field['name'] for field in user_fields], [item[0] for item in expected_fields])
        self.assertEqual(len(user_fields), len(expected_fields))

        collection_names = {
            row[0]: row[1] for row in db.rows('SELECT id, name FROM _collections')
        }
        for field, (expected_name, expected_type, expected_required, expected_target) in zip(
            user_fields, expected_fields, strict=True
        ):
            self.assertEqual(field['name'], expected_name)
            self.assertEqual(field['type'], expected_type)
            self.assertEqual(field.get('required'), expected_required)
            if expected_target is not None:
                self.assertEqual(collection_names[field['collectionId']], expected_target)
            if expected_name == 'created':
                self.assertTrue(field['onCreate'])
                self.assertFalse(field['onUpdate'])
            if expected_name == 'updated':
                self.assertTrue(field['onCreate'])
                self.assertTrue(field['onUpdate'])

    def test_full_history_applies_and_matches_exported_schema(self) -> None:
        with DisposablePocketBase() as db:
            db.copy_full_history()
            result = db.migrate_up()
            output = result.stdout + result.stderr
            self.assertEqual(result.returncode, 0, output)
            self.assertNotIn('failed to apply migration', output)
            self.assertIn('Applied 0034_create_potencial_notas.js', output)
            self.assertIn('Applied 0050_create_supplier_qualification_and_assessments.js', output)

            self.assert_collection_matches(
                db,
                'potencial_notas',
                POTENCIAL_NOTAS_FIELDS,
                (
                    AUTHENTICATED_RULE,
                    AUTHENTICATED_RULE,
                    AUTHENTICATED_RULE,
                    "@request.auth.id != '' && user_id = @request.auth.id",
                    "@request.auth.id != '' && user_id = @request.auth.id",
                ),
            )
            self.assert_collection_matches(
                db,
                'supplier_assessments',
                SUPPLIER_ASSESSMENT_FIELDS,
                (AUTHENTICATED_RULE,) * 5,
            )
            self.assert_collection_matches(
                db,
                'supplier_red_flags',
                SUPPLIER_RED_FLAG_FIELDS,
                (AUTHENTICATED_RULE,) * 5,
            )
            self.assertEqual(db.index_names('potencial_notas'), set())
            self.assertEqual(db.index_names('supplier_assessments'), ASSESSMENT_INDEXES)
            self.assertEqual(db.index_names('supplier_red_flags'), RED_FLAG_INDEXES)
            self.assertEqual(db.index_definitions('supplier_assessments'), ASSESSMENT_INDEX_SQL)
            self.assertEqual(db.index_definitions('supplier_red_flags'), RED_FLAG_INDEX_SQL)
            self.assertEqual(db.collection('potencial_notas')['id'], 'pbc_1767808957')
            self.assertEqual(db.collection('supplier_assessments')['id'], 'pbc_2674300931')

    def test_0034_applies_and_reverts_without_removing_prerequisites(self) -> None:
        with DisposablePocketBase() as db:
            db.write_fixture(
                '0033z_test_potencial_notas_prerequisites.js',
                """migrate((app) => {
  const potenciais = new Collection({
    name: 'potenciais',
    type: 'base',
    fields: [{ name: 'numero_potencial', type: 'text', required: true }],
  })
  app.save(potenciais)
})
""",
            )
            fixture_result = db.migrate_up()
            fixture_output = fixture_result.stdout + fixture_result.stderr
            self.assertEqual(fixture_result.returncode, 0, fixture_output)
            self.assertNotIn('failed to apply migration', fixture_output)
            potenciais_before = db.collection('potenciais')
            users_before = db.collection('users')
            self.assertTrue(
                db.migration_marker_exists('0033z_test_potencial_notas_prerequisites.js')
            )

            db.copy_migration(MIGRATION_0034)
            result = db.migrate_up()
            output = result.stdout + result.stderr
            self.assertEqual(result.returncode, 0, output)
            self.assertNotIn('failed to apply migration', output)
            self.assertIn('Applied 0034_create_potencial_notas.js', output)
            self.assert_collection_matches(
                db,
                'potencial_notas',
                POTENCIAL_NOTAS_FIELDS[:5],
                (
                    AUTHENTICATED_RULE,
                    AUTHENTICATED_RULE,
                    AUTHENTICATED_RULE,
                    "@request.auth.id != '' && user_id = @request.auth.id",
                    "@request.auth.id != '' && user_id = @request.auth.id",
                ),
            )

            result = db.migrate_down(1)
            output = result.stdout + result.stderr
            self.assertEqual(result.returncode, 0, output)
            self.assertNotIn('failed to revert migration', output)
            self.assertIn('Reverted 0034_create_potencial_notas.js', output)
            self.assertFalse(db.collection_exists('potencial_notas'))
            self.assertEqual(db.collection('potenciais'), potenciais_before)
            self.assertEqual(db.collection('users'), users_before)
            self.assertFalse(db.migration_marker_exists('0034_create_potencial_notas.js'))
            self.assertTrue(
                db.migration_marker_exists('0033z_test_potencial_notas_prerequisites.js')
            )

    def test_0050_applies_and_reverts_without_removing_fornecedores(self) -> None:
        with DisposablePocketBase() as db:
            db.write_fixture(
                '0049z_test_supplier_prerequisites.js',
                """migrate((app) => {
  const fornecedores = new Collection({
    name: 'fornecedores',
    type: 'base',
    fields: [{ name: 'nome', type: 'text', required: true }],
  })
  app.save(fornecedores)
})
""",
            )
            fixture_result = db.migrate_up()
            fixture_output = fixture_result.stdout + fixture_result.stderr
            self.assertEqual(fixture_result.returncode, 0, fixture_output)
            self.assertNotIn('failed to apply migration', fixture_output)
            fornecedores_before = db.collection('fornecedores')
            self.assertTrue(db.migration_marker_exists('0049z_test_supplier_prerequisites.js'))

            db.copy_migration(MIGRATION_0050)
            result = db.migrate_up()
            output = result.stdout + result.stderr
            self.assertEqual(result.returncode, 0, output)
            self.assertNotIn('failed to apply migration', output)
            self.assertIn('Applied 0050_create_supplier_qualification_and_assessments.js', output)
            self.assert_collection_matches(
                db,
                'supplier_assessments',
                SUPPLIER_ASSESSMENT_FIELDS,
                (AUTHENTICATED_RULE,) * 5,
            )
            self.assert_collection_matches(
                db,
                'supplier_red_flags',
                SUPPLIER_RED_FLAG_FIELDS,
                (AUTHENTICATED_RULE,) * 5,
            )
            self.assertEqual(db.index_names('supplier_assessments'), ASSESSMENT_INDEXES)
            self.assertEqual(db.index_names('supplier_red_flags'), RED_FLAG_INDEXES)

            result = db.migrate_down(1)
            output = result.stdout + result.stderr
            self.assertEqual(result.returncode, 0, output)
            self.assertNotIn('failed to revert migration', output)
            self.assertIn('Reverted 0050_create_supplier_qualification_and_assessments.js', output)
            self.assertFalse(db.collection_exists('supplier_red_flags'))
            self.assertFalse(db.collection_exists('supplier_assessments'))
            self.assertEqual(db.collection('fornecedores'), fornecedores_before)
            self.assertFalse(
                db.migration_marker_exists(
                    '0050_create_supplier_qualification_and_assessments.js'
                )
            )
            self.assertTrue(db.migration_marker_exists('0049z_test_supplier_prerequisites.js'))


if __name__ == '__main__':
    unittest.main()
