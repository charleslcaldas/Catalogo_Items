from __future__ import annotations

import copy
import json
import unittest
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from tests.commercial_intake.harness import (
    PocketBaseHarness,
    ProvisionedIntake,
    canonical_json,
)


class CommercialIntakeRouteTest(unittest.TestCase):
    @staticmethod
    def headers(intake: ProvisionedIntake) -> dict[str, str]:
        return {
            'Authorization': f'C2Capability {intake.token}',
            'Content-Type': 'application/json',
        }

    def test_migration_creates_private_collections_and_unique_indexes(self) -> None:
        with PocketBaseHarness() as server:
            for table in (
                'commercial_intake_operations',
                'commercial_intake_approvals',
                'commercial_intake_results',
            ):
                self.assertEqual(
                    server.scalar(
                        "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = ?",
                        (table,),
                    ),
                    1,
                )

            unique_indexes = {
                row[0]
                for row in server.rows(
                    "SELECT name FROM sqlite_master "
                    "WHERE type = 'index' AND name LIKE 'idx_commercial_intake_%' "
                    "AND sql LIKE 'CREATE UNIQUE INDEX%'"
                )
            }
            self.assertEqual(
                unique_indexes,
                {
                    'idx_commercial_intake_operations_operation_key',
                    'idx_commercial_intake_approvals_capability_sha256',
                    'idx_commercial_intake_approvals_operation_attempt',
                    'idx_commercial_intake_results_operation_id',
                },
            )

            triggers = {
                row[0]
                for row in server.rows(
                    "SELECT name FROM sqlite_master WHERE type = 'trigger' "
                    "AND name LIKE 'trg_commercial_intake_%'"
                )
            }
            self.assertEqual(
                triggers,
                {
                    'trg_commercial_intake_approval_update',
                    'trg_commercial_intake_approval_delete',
                    'trg_commercial_intake_history_insert',
                    'trg_commercial_intake_history_update',
                    'trg_commercial_intake_line_insert_terminal',
                    'trg_commercial_intake_line_order_insert',
                    'trg_commercial_intake_line_order_update',
                    'trg_commercial_intake_line_update',
                    'trg_commercial_intake_line_delete',
                    'trg_commercial_intake_operation_update',
                    'trg_commercial_intake_operation_delete',
                    'trg_commercial_intake_potential_update',
                    'trg_commercial_intake_potential_delete',
                    'trg_commercial_intake_result_update',
                    'trg_commercial_intake_result_delete',
                },
            )

            for name in (
                'commercial_intake_operations',
                'commercial_intake_approvals',
                'commercial_intake_results',
            ):
                rules = server.rows(
                    'SELECT listRule, viewRule, createRule, updateRule, deleteRule '
                    'FROM _collections WHERE name = ?',
                    (name,),
                )
                self.assertEqual(rules, [(None, None, None, None, None)])

    def test_migration_down_removes_only_commercial_intake_collections(self) -> None:
        with PocketBaseHarness() as server:
            self.assertEqual(server.scalar('SELECT count(*) FROM itens'), 3)
            result = server.migrate_down(1)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            for table in (
                'commercial_intake_operations',
                'commercial_intake_approvals',
                'commercial_intake_results',
            ):
                self.assertEqual(
                    server.scalar(
                        "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = ?",
                        (table,),
                    ),
                    0,
                )
            self.assertEqual(server.scalar('SELECT count(*) FROM itens'), 3)
            self.assertEqual(server.scalar('SELECT count(*) FROM historico_precos'), 1)
            self.assertEqual(
                server.scalar(
                    "SELECT count(*) FROM sqlite_master WHERE type = 'trigger' "
                    "AND name LIKE 'trg_commercial_intake_%'"
                ),
                0,
            )

    def test_migration_down_fails_visibly_when_schema_is_incomplete(self) -> None:
        with PocketBaseHarness() as server:
            server.stop()
            server.execute("DELETE FROM _collections WHERE name = 'commercial_intake_results'")
            result = server.migrate_down(1)
            output = result.stdout + result.stderr
            self.assertIn('failed to revert migration 0055_create_commercial_intake_collections.js', output)
            self.assertEqual(
                server.scalar(
                    "SELECT count(*) FROM _migrations "
                    "WHERE file = '0055_create_commercial_intake_collections.js'"
                ),
                1,
            )
            self.assertEqual(
                server.scalar(
                    'SELECT count(*) FROM _collections WHERE name = ?',
                    ('commercial_intake_approvals',),
                ),
                1,
            )
            self.assertEqual(
                server.scalar(
                    'SELECT count(*) FROM _collections WHERE name = ?',
                    ('commercial_intake_operations',),
                ),
                1,
            )
            self.assertEqual(
                server.scalar(
                    "SELECT count(*) FROM sqlite_master WHERE type = 'trigger' "
                    "AND name LIKE 'trg_commercial_intake_%'"
                ),
                15,
            )

    def test_schema_field_rule_or_index_drift_fails_closed(self) -> None:
        for drift in (
            'field',
            'rule',
            'index',
            'relation',
            'autodate',
            'autodate_operations_options',
            'autodate_approvals_options',
            'autodate_results_options',
            'trigger',
        ):
            with self.subTest(drift=drift):
                intake = ProvisionedIntake.create(f"schema-{drift.replace('_', '-')}-0001")
                with PocketBaseHarness([intake], schema_drift=drift) as server:
                    status, payload = server.request(
                        'POST',
                        '/api/c2/v1/commercial-intakes',
                        body=intake.body,
                        headers=self.headers(intake),
                    )
                    self.assertEqual((status, payload), (500, {'code': 'internal_error'}))
                    self.assertEqual(server.scalar('SELECT count(*) FROM potenciais'), 0)
                    self.assertEqual(server.scalar('SELECT count(*) FROM potencial_itens'), 0)
                    self.assertEqual(server.scalar('SELECT count(*) FROM commercial_intake_results'), 0)

    def test_live_items_must_exist_be_active_and_match_sku(self) -> None:
        missing = ProvisionedIntake.create('item-missing-0001')
        missing.manifest['skip']['items'][0]['item_id'] = 'itm999999999999'
        inactive = ProvisionedIntake.create('item-inactive-0001')
        inactive.manifest['skip']['items'][0]['item_id'] = 'itm000000000003'
        inactive.manifest['skip']['items'][0]['sku'] = 'FIXTURE-OFF'
        mismatch = ProvisionedIntake.create('item-mismatch-0001')
        mismatch.manifest['skip']['items'][0]['sku'] = 'WRONG-SKU'

        with PocketBaseHarness([missing, inactive, mismatch]) as server:
            for intake in (missing, inactive, mismatch):
                with self.subTest(operation_key=intake.manifest['operation_key']):
                    status, payload = server.request(
                        'POST',
                        '/api/c2/v1/commercial-intakes',
                        body=intake.body,
                        headers=self.headers(intake),
                    )
                    self.assertEqual((status, payload), (400, {'code': 'invalid_request'}))
            self.assertEqual(server.scalar('SELECT count(*) FROM potenciais'), 0)
            self.assertEqual(server.scalar('SELECT count(*) FROM potencial_itens'), 0)
            self.assertEqual(server.scalar('SELECT count(*) FROM commercial_intake_results'), 0)

    def test_operation_projection_mismatch_is_conflict_without_write(self) -> None:
        intake = ProvisionedIntake.create('operation-binding-0001')
        with PocketBaseHarness([intake]) as server:
            server.execute(
                "UPDATE commercial_intake_operations SET customer_name = 'Tampered' "
                'WHERE operation_key = ?',
                (intake.manifest['operation_key'],),
            )
            status, payload = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=intake.body,
                headers=self.headers(intake),
            )
            self.assertEqual((status, payload), (409, {'code': 'idempotency_conflict'}))
            self.assertEqual(server.scalar('SELECT count(*) FROM potenciais'), 0)
            self.assertEqual(server.scalar('SELECT count(*) FROM potencial_itens'), 0)
            self.assertEqual(server.scalar('SELECT count(*) FROM commercial_intake_results'), 0)

    def test_capability_is_not_persisted_or_logged_by_the_harness(self) -> None:
        intake = ProvisionedIntake.create('capability-memory-0001')
        needle = intake.token.encode('ascii')
        with PocketBaseHarness([intake]) as server:
            status, _ = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=intake.body,
                headers=self.headers(intake),
            )
            self.assertEqual(status, 201)
            server.logs()
            for path in server.root.rglob('*'):
                if path.is_file():
                    self.assertNotIn(needle, path.read_bytes(), str(path))

    def test_only_post_is_registered_for_the_endpoint(self) -> None:
        with PocketBaseHarness() as server:
            for method in ('GET', 'PUT', 'PATCH', 'DELETE'):
                with self.subTest(method=method):
                    status, _ = server.request(method, '/api/c2/v1/commercial-intakes')
                    self.assertEqual(status, 404)
            self.assertEqual(server.scalar('SELECT count(*) FROM potenciais'), 0)

    def test_known_capability_reaches_request_validation(self) -> None:
        intake = ProvisionedIntake.create('auth-known-0001')
        with PocketBaseHarness([intake]) as server:
            status, payload = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=b'{}',
                headers={
                    'Authorization': f'C2Capability {intake.token}',
                    'Content-Type': 'application/json',
                },
            )

        self.assertEqual(status, 400)
        self.assertEqual(payload, {'code': 'invalid_request'})

    def test_exact_replay_reconciles_the_same_identifiers(self) -> None:
        intake = ProvisionedIntake.create('replay-exact-0001')
        with PocketBaseHarness([intake]) as server:
            first_status, first = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=intake.body,
                headers=self.headers(intake),
            )
            replay_status, replay = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=intake.body,
                headers=self.headers(intake),
            )

            self.assertEqual(first_status, 201)
            self.assertEqual(replay_status, 200)
            self.assertEqual(replay['code'], 'reconciled')
            self.assertEqual(
                {key: replay[key] for key in ('operation_key', 'potential_id', 'line_1_id', 'line_2_id')},
                {key: first[key] for key in ('operation_key', 'potential_id', 'line_1_id', 'line_2_id')},
            )
            self.assertEqual(
                server.scalar(
                    'SELECT count(*) FROM potenciais WHERE numero_potencial = ?',
                    (intake.manifest['operation_key'],),
                ),
                1,
            )
            self.assertEqual(server.scalar('SELECT count(*) FROM commercial_intake_results'), 1)

    def test_replay_requires_the_complete_untampered_aggregate(self) -> None:
        intakes = [
            ProvisionedIntake.create(f'replay-tamper-{index:04d}')
            for index in range(1, 9)
        ]
        with PocketBaseHarness(intakes) as server:
            created: list[dict[str, object]] = []
            for intake in intakes:
                status, payload = server.request(
                    'POST',
                    '/api/c2/v1/commercial-intakes',
                    body=intake.body,
                    headers=self.headers(intake),
                )
                self.assertEqual(status, 201)
                created.append(payload)

            server.execute_bypassing_terminal_guards(
                "UPDATE potenciais SET status = 'Tampered' WHERE id = ?",
                (created[0]['potential_id'],),
            )
            server.execute_bypassing_terminal_guards(
                'UPDATE potencial_itens SET quantidade = 999 WHERE id = ?',
                (created[1]['line_1_id'],),
            )
            server.execute_bypassing_terminal_guards(
                "UPDATE commercial_intake_results SET crm_deal_id = '99999999999999999' "
                'WHERE potential_id = ?',
                (created[2]['potential_id'],),
            )
            server.execute_bypassing_terminal_guards(
                'INSERT INTO potencial_itens '
                '(id, potencial_id, item_id, quantidade, unidade_medida, ordem, preco_unitario, '
                'observacoes, referencia_preco, referencia_fornecedor, referencia_data, created, updated) '
                "SELECT 'extra0000000001', potencial_id, item_id, quantidade, unidade_medida, 3, 0, "
                "'', 0, '', '', created, updated FROM potencial_itens WHERE id = ?",
                (created[3]['line_1_id'],),
            )
            server.execute_bypassing_terminal_guards(
                'UPDATE historico_precos SET potencial_id = ? WHERE tipo = ?',
                (created[4]['potential_id'], 'compra'),
            )
            server.execute_bypassing_terminal_guards(
                'DELETE FROM potencial_itens WHERE id = ?',
                (created[5]['line_2_id'],),
            )
            server.execute_bypassing_terminal_guards(
                "UPDATE potenciais SET estagio_id = 'stg000000000001' WHERE id = ?",
                (created[6]['potential_id'],),
            )
            server.execute_bypassing_terminal_guards(
                "UPDATE potenciais SET anexos = '[\"tampered.pdf\"]' WHERE id = ?",
                (created[7]['potential_id'],),
            )

            for intake in intakes:
                with self.subTest(operation_key=intake.manifest['operation_key']):
                    status, payload = server.request(
                        'POST',
                        '/api/c2/v1/commercial-intakes',
                        body=intake.body,
                        headers=self.headers(intake),
                    )
                    self.assertEqual((status, payload), (409, {'code': 'recovery_required'}))

            self.assertEqual(server.scalar('SELECT count(*) FROM commercial_intake_results'), 8)

    def test_terminal_result_parent_and_lines_cannot_be_deleted(self) -> None:
        intake = ProvisionedIntake.create('replay-terminal-delete-0001')
        with PocketBaseHarness([intake]) as server:
            created_status, created = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=intake.body,
                headers=self.headers(intake),
            )
            self.assertEqual(created_status, 201)

            server.execute(
                'DELETE FROM commercial_intake_results WHERE potential_id = ?',
                (created['potential_id'],),
            )
            server.execute(
                'DELETE FROM potencial_itens WHERE potencial_id = ?',
                (created['potential_id'],),
            )
            server.execute(
                'DELETE FROM potenciais WHERE id = ?',
                (created['potential_id'],),
            )

            self.assertEqual(server.scalar('SELECT count(*) FROM potenciais'), 1)
            self.assertEqual(server.scalar('SELECT count(*) FROM potencial_itens'), 2)
            self.assertEqual(server.scalar('SELECT count(*) FROM commercial_intake_results'), 1)

            status, payload = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=intake.body,
                headers=self.headers(intake),
            )
            self.assertEqual(status, 200)
            self.assertEqual(payload['code'], 'reconciled')
            self.assertEqual(payload['potential_id'], created['potential_id'])

    def test_rebound_result_is_recovery_required_for_both_operations(self) -> None:
        original = ProvisionedIntake.create('replay-rebound-original-0001')
        target = ProvisionedIntake.create('replay-rebound-target-0001')
        with PocketBaseHarness([original, target]) as server:
            created_status, _ = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=original.body,
                headers=self.headers(original),
            )
            self.assertEqual(created_status, 201)
            server.execute_bypassing_terminal_guards(
                'UPDATE commercial_intake_results SET operation_id = '
                '(SELECT id FROM commercial_intake_operations WHERE operation_key = ?) ',
                (target.manifest['operation_key'],),
            )

            for intake in (original, target):
                with self.subTest(operation_key=intake.manifest['operation_key']):
                    status, payload = server.request(
                        'POST',
                        '/api/c2/v1/commercial-intakes',
                        body=intake.body,
                        headers=self.headers(intake),
                    )
                    self.assertEqual((status, payload), (409, {'code': 'recovery_required'}))

            self.assertEqual(server.scalar('SELECT count(*) FROM potenciais'), 1)
            self.assertEqual(server.scalar('SELECT count(*) FROM potencial_itens'), 2)
            self.assertEqual(server.scalar('SELECT count(*) FROM commercial_intake_results'), 1)

    def test_replay_survives_write_expiry_but_not_recovery_expiry(self) -> None:
        intake = ProvisionedIntake.create('replay-expiry-0001')
        with PocketBaseHarness([intake]) as server:
            status, created = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=intake.body,
                headers=self.headers(intake),
            )
            self.assertEqual(status, 201)

            server.execute(
                "UPDATE commercial_intake_approvals SET write_expires_at = '2000-01-01 00:00:00.000Z'"
            )
            status, replay = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=intake.body,
                headers=self.headers(intake),
            )
            self.assertEqual(status, 200)
            self.assertEqual(replay['code'], 'reconciled')
            self.assertEqual(replay['potential_id'], created['potential_id'])

            server.execute(
                "UPDATE commercial_intake_approvals SET recovery_expires_at = '2000-01-02 00:00:00.000Z'"
            )
            status, payload = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=intake.body,
                headers=self.headers(intake),
            )
            self.assertEqual((status, payload), (401, {'code': 'unauthorized'}))

    def test_new_immutable_attempt_can_replace_an_expired_attempt(self) -> None:
        old = ProvisionedIntake.create(
            'renewed-attempt-0001',
            write_expires_at='2000-01-01 00:00:00.000Z',
            recovery_expires_at='2000-01-02 00:00:00.000Z',
        )
        token_source = ProvisionedIntake.create('unused-token-source')
        renewed = ProvisionedIntake(
            manifest=copy.deepcopy(old.manifest),
            token=token_source.token,
            attempt_no=2,
        )
        with PocketBaseHarness([old, renewed]) as server:
            old_status, old_payload = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=old.body,
                headers=self.headers(old),
            )
            new_status, new_payload = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=renewed.body,
                headers=self.headers(renewed),
            )

            self.assertEqual((old_status, old_payload), (401, {'code': 'unauthorized'}))
            self.assertEqual(new_status, 201)
            self.assertEqual(new_payload['code'], 'created')
            self.assertEqual(
                server.rows('SELECT attempt_no FROM commercial_intake_approvals ORDER BY attempt_no'),
                [(1,), (2,)],
            )

    def test_suppression_context_does_not_disable_normal_autofill(self) -> None:
        with PocketBaseHarness() as server:
            status, payload = server.request('POST', '/__test/normal-potential-item')

            self.assertEqual(status, 201)
            line = server.rows(
                'SELECT preco_unitario, referencia_preco, referencia_fornecedor, referencia_data '
                'FROM potencial_itens WHERE id = ?',
                (payload['line_id'],),
            )
            self.assertEqual(len(line), 1)
            self.assertGreater(line[0][0], 100)
            self.assertEqual(line[0][1], 100)
            self.assertEqual(line[0][2], 'Sanitized Supplier')
            self.assertNotEqual(line[0][3], '')
            self.assertEqual(
                server.scalar(
                    "SELECT count(*) FROM historico_precos WHERE potencial_id = ? AND tipo = 'venda'",
                    (payload['potential_id'],),
                ),
                1,
            )

    def test_hook_failures_at_every_write_stage_roll_back_the_batch(self) -> None:
        intakes = [
            ProvisionedIntake.create('rollback-parent-0001'),
            ProvisionedIntake.create('rollback-line1-0001'),
            ProvisionedIntake.create('rollback-line2-0001'),
            ProvisionedIntake.create('rollback-result-0001'),
        ]
        with PocketBaseHarness(intakes) as server:
            for intake in intakes:
                with self.subTest(operation_key=intake.manifest['operation_key']):
                    status, payload = server.request(
                        'POST',
                        '/api/c2/v1/commercial-intakes',
                        body=intake.body,
                        headers=self.headers(intake),
                    )
                    self.assertEqual((status, payload), (500, {'code': 'internal_error'}))
                    self.assertNotIn(intake.token, str(payload))
                    self.assertEqual(
                        server.scalar(
                            'SELECT count(*) FROM potenciais WHERE numero_potencial = ?',
                            (intake.manifest['operation_key'],),
                        ),
                        0,
                    )
            self.assertEqual(server.scalar('SELECT count(*) FROM potencial_itens'), 0)
            self.assertEqual(server.scalar('SELECT count(*) FROM commercial_intake_results'), 0)
            self.assertEqual(
                server.scalar("SELECT count(*) FROM historico_precos WHERE tipo = 'venda'"),
                0,
            )

    def test_hook_mutations_of_protected_parent_or_result_fields_roll_back(self) -> None:
        intakes = [
            ProvisionedIntake.create('mutate-parent-0001'),
            ProvisionedIntake.create('mutate-line-0001'),
            ProvisionedIntake.create('mutate-result-0001'),
        ]
        with PocketBaseHarness(intakes) as server:
            for intake in intakes:
                with self.subTest(operation_key=intake.manifest['operation_key']):
                    status, payload = server.request(
                        'POST',
                        '/api/c2/v1/commercial-intakes',
                        body=intake.body,
                        headers=self.headers(intake),
                    )
                    self.assertEqual((status, payload), (500, {'code': 'internal_error'}))
            self.assertEqual(server.scalar('SELECT count(*) FROM potenciais'), 0)
            self.assertEqual(server.scalar('SELECT count(*) FROM potencial_itens'), 0)
            self.assertEqual(server.scalar('SELECT count(*) FROM commercial_intake_results'), 0)

    def test_terminal_guards_suppress_after_success_mutations_and_side_effects(self) -> None:
        intakes = [
            ProvisionedIntake.create('late-parent-mutation-0001'),
            ProvisionedIntake.create('late-side-effects-0001'),
        ]
        with PocketBaseHarness(intakes) as server:
            for intake in intakes:
                with self.subTest(operation_key=intake.manifest['operation_key']):
                    status, payload = server.request(
                        'POST',
                        '/api/c2/v1/commercial-intakes',
                        body=intake.body,
                        headers=self.headers(intake),
                    )
                    self.assertEqual(status, 201)
                    self.assertEqual(
                        server.scalar(
                            'SELECT status FROM potenciais WHERE id = ?',
                            (payload['potential_id'],),
                        ),
                        'Solicitado Cotação',
                    )
                    self.assertEqual(
                        server.scalar(
                            'SELECT count(*) FROM potencial_itens WHERE potencial_id = ?',
                            (payload['potential_id'],),
                        ),
                        2,
                    )
                    self.assertEqual(
                        server.scalar(
                            'SELECT count(*) FROM historico_precos WHERE potencial_id = ?',
                            (payload['potential_id'],),
                        ),
                        0,
                    )
                    replay_status, replay = server.request(
                        'POST',
                        '/api/c2/v1/commercial-intakes',
                        body=intake.body,
                        headers=self.headers(intake),
                    )
                    self.assertEqual(replay_status, 200)
                    self.assertEqual(replay['potential_id'], payload['potential_id'])
            self.assertEqual(server.scalar('SELECT count(*) FROM potenciais'), 2)
            self.assertEqual(server.scalar('SELECT count(*) FROM potencial_itens'), 4)
            self.assertEqual(server.scalar('SELECT count(*) FROM commercial_intake_results'), 2)
            self.assertEqual(server.scalar('SELECT count(*) FROM historico_precos'), 1)

    def test_fractional_order_hook_rolls_back_the_aggregate(self) -> None:
        intake = ProvisionedIntake.create('fractional-order-0001')
        with PocketBaseHarness([intake]) as server:
            status, payload = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=intake.body,
                headers=self.headers(intake),
            )
            self.assertEqual((status, payload), (500, {'code': 'internal_error'}))
            self.assertEqual(server.scalar('SELECT count(*) FROM potenciais'), 0)
            self.assertEqual(server.scalar('SELECT count(*) FROM potencial_itens'), 0)
            self.assertEqual(server.scalar('SELECT count(*) FROM commercial_intake_results'), 0)

    def test_concurrent_requests_leave_one_complete_aggregate(self) -> None:
        intake = ProvisionedIntake.create('concurrency-unique-0001')
        barrier = Barrier(2)
        with PocketBaseHarness([intake]) as server:
            def submit() -> tuple[int, dict[str, object]]:
                barrier.wait(timeout=5)
                return server.request(
                    'POST',
                    '/api/c2/v1/commercial-intakes',
                    body=intake.body,
                    headers=self.headers(intake),
                )

            with ThreadPoolExecutor(max_workers=2) as executor:
                responses = list(executor.map(lambda _: submit(), range(2)))

            self.assertEqual(sorted(status for status, _ in responses), [200, 201])
            identifiers = [
                (body['potential_id'], body['line_1_id'], body['line_2_id'])
                for _, body in responses
            ]
            self.assertEqual(identifiers[0], identifiers[1])
            potential_id = identifiers[0][0]
            self.assertEqual(
                server.scalar(
                    'SELECT count(*) FROM potenciais WHERE numero_potencial = ?',
                    (intake.manifest['operation_key'],),
                ),
                1,
            )
            self.assertEqual(
                server.scalar('SELECT count(*) FROM potencial_itens WHERE potencial_id = ?', (potential_id,)),
                2,
            )
            self.assertEqual(server.scalar('SELECT count(*) FROM commercial_intake_results'), 1)
            self.assertEqual(
                server.scalar('SELECT count(*) FROM historico_precos WHERE potencial_id = ?', (potential_id,)),
                0,
            )

    def test_success_creates_one_complete_transactional_aggregate(self) -> None:
        intake = ProvisionedIntake.create('success-aggregate-0001')
        with PocketBaseHarness([intake]) as server:
            status, payload = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=intake.body,
                headers=self.headers(intake),
            )

            self.assertEqual(status, 201)
            self.assertEqual(
                set(payload),
                {'code', 'operation_key', 'potential_id', 'line_1_id', 'line_2_id'},
            )
            self.assertEqual(payload['code'], 'created')
            self.assertEqual(payload['operation_key'], intake.manifest['operation_key'])

            parent = server.rows(
                'SELECT id, numero_potencial, cliente, status, nome_potencial, observacoes, '
                'proprietario, nome_comprador, notas, estagio_id, incoterm_cliente, '
                'condicao_pagamento_cliente, tempo_fabricacao_cliente, anexos '
                'FROM potenciais WHERE numero_potencial = ?',
                (intake.manifest['operation_key'],),
            )
            self.assertEqual(
                parent,
                [
                    (
                        payload['potential_id'],
                        intake.manifest['operation_key'],
                        intake.manifest['customer']['name'],
                        'Solicitado Cotação',
                        intake.manifest['skip']['potential_name'],
                        intake.migration_projection()['operation']['potential_observations'],
                        '',
                        '',
                        '',
                        '',
                        '',
                        '',
                        '',
                        '[]',
                    )
                ],
            )

            lines = server.rows(
                'SELECT id, item_id, quantidade, unidade_medida, ordem, preco_unitario, '
                'observacoes, referencia_preco, referencia_fornecedor, referencia_data '
                'FROM potencial_itens WHERE potencial_id = ? ORDER BY ordem',
                (payload['potential_id'],),
            )
            self.assertEqual(
                lines,
                [
                    (payload['line_1_id'], 'itm000000000001', 10, 'KPC', 1, 0, '', 0, '', ''),
                    (payload['line_2_id'], 'itm000000000002', 30, 'KPC', 2, 0, '', 0, '', ''),
                ],
            )

            result = server.rows(
                'SELECT r.request_sha256, r.potential_id, r.line_1_id, r.line_2_id, r.crm_deal_id '
                'FROM commercial_intake_results r '
                'JOIN commercial_intake_operations o ON o.id = r.operation_id '
                'WHERE o.operation_key = ?',
                (intake.manifest['operation_key'],),
            )
            self.assertEqual(len(result), 1)
            self.assertEqual(result[0][1:], (
                payload['potential_id'],
                payload['line_1_id'],
                payload['line_2_id'],
                intake.manifest['runtime']['crm_deal_id'],
            ))
            self.assertEqual(
                server.scalar(
                    'SELECT count(*) FROM historico_precos WHERE potencial_id = ?',
                    (payload['potential_id'],),
                ),
                0,
            )

    def test_route_rejects_missing_capability(self) -> None:
        with PocketBaseHarness() as server:
            status, payload = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=b'{}',
                headers={'Content-Type': 'application/json'},
            )

        self.assertEqual(status, 401)
        self.assertEqual(payload, {'code': 'unauthorized'})

    def test_authentication_is_generic_hash_bound_and_expiry_checked(self) -> None:
        valid = ProvisionedIntake.create('auth-contract-0001')
        staging = ProvisionedIntake.create('auth-staging-0001', environment='staging')
        expired = ProvisionedIntake.create(
            'auth-expired-0001',
            write_expires_at='2000-01-01 00:00:00.000Z',
            recovery_expires_at='2000-01-02 00:00:00.000Z',
        )
        write_expired = ProvisionedIntake.create(
            'auth-write-expired-0001',
            write_expires_at='2000-01-01 00:00:00.000Z',
        )
        unknown = ProvisionedIntake.create('auth-unknown-0001')

        with PocketBaseHarness([valid, staging, expired, write_expired]) as server:
            cases = [
                ('malformed prefix', {'Authorization': f'Bearer {valid.token}', 'Content-Type': 'application/json'}),
                ('padding', {'Authorization': f'C2Capability {valid.token}=', 'Content-Type': 'application/json'}),
                ('short', {'Authorization': f'C2Capability {valid.token[:-1]}', 'Content-Type': 'application/json'}),
                ('unknown', self.headers(unknown)),
                ('staging', self.headers(staging)),
                ('recovery expired', self.headers(expired)),
            ]
            for label, headers in cases:
                with self.subTest(label=label):
                    status, payload = server.request(
                        'POST', '/api/c2/v1/commercial-intakes', body=b'not-json', headers=headers
                    )
                    self.assertEqual((status, payload), (401, {'code': 'unauthorized'}))
                    self.assertNotIn(valid.token, str(payload))

            status, payload = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=valid.body,
                headers=[
                    ('Authorization', f'C2Capability {valid.token}'),
                    ('Authorization', f'C2Capability {valid.token}'),
                    ('Content-Type', 'application/json'),
                ],
            )
            self.assertEqual((status, payload), (401, {'code': 'unauthorized'}))

            status, payload = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=write_expired.body,
                headers=self.headers(write_expired),
            )
            self.assertEqual((status, payload), (401, {'code': 'unauthorized'}))

            self.assertEqual(server.scalar('SELECT count(*) FROM potenciais'), 0)
            self.assertEqual(server.scalar('SELECT count(*) FROM commercial_intake_results'), 0)

    def test_content_headers_are_exact_after_capability_lookup(self) -> None:
        intake = ProvisionedIntake.create('header-contract-0001')
        with PocketBaseHarness([intake]) as server:
            cases = [
                {'Authorization': f'C2Capability {intake.token}'},
                {**self.headers(intake), 'Content-Type': 'application/json; charset=utf-8'},
                {**self.headers(intake), 'Content-Encoding': 'gzip'},
            ]
            for headers in cases:
                with self.subTest(headers=sorted(headers)):
                    status, payload = server.request(
                        'POST', '/api/c2/v1/commercial-intakes', body=intake.body, headers=headers
                    )
                    self.assertEqual((status, payload), (400, {'code': 'invalid_request'}))
            status, payload = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=intake.body,
                headers=[
                    ('Authorization', f'C2Capability {intake.token}'),
                    ('Content-Type', 'application/json'),
                    ('Content-Type', 'application/json'),
                ],
            )
            self.assertEqual((status, payload), (400, {'code': 'invalid_request'}))
            self.assertEqual(server.scalar('SELECT count(*) FROM potenciais'), 0)

    def test_canonical_utf8_and_closed_schema_rejections_are_zero_write(self) -> None:
        intake = ProvisionedIntake.create('validation-contract-0001')
        valid = intake.manifest
        extra = copy.deepcopy(valid)
        extra['unexpected'] = True
        extra_approval = copy.deepcopy(valid)
        extra_approval['approval']['unexpected'] = True
        extra_item = copy.deepcopy(valid)
        extra_item['skip']['items'][0]['unexpected'] = True
        float_quantity = copy.deepcopy(valid)
        float_quantity['skip']['items'][0]['quantity'] = 1.5
        unsafe_quantity = copy.deepcopy(valid)
        unsafe_quantity['skip']['items'][0]['quantity'] = 9007199254740992
        invalid_item_id = copy.deepcopy(valid)
        invalid_item_id['skip']['items'][0]['item_id'] = 'INVALID'
        invalid_crm_id = copy.deepcopy(valid)
        invalid_crm_id['runtime']['crm_deal_id'] = '123'
        invalid_date = copy.deepcopy(valid)
        invalid_date['skip']['closing_date'] = '2026-02-30'
        wrong_order = copy.deepcopy(valid)
        wrong_order['skip']['items'][0]['order'] = 2
        wrong_unit = copy.deepcopy(valid)
        wrong_unit['skip']['items'][0]['unit'] = 'PCS'
        wrong_status = copy.deepcopy(valid)
        wrong_status['skip']['status'] = 'Other'
        nfd_name = copy.deepcopy(valid)
        nfd_name['customer']['name'] = 'Cafe\u0301'
        control_name = copy.deepcopy(valid)
        control_name['customer']['name'] = 'Bad\u0001Name'
        one_item = copy.deepcopy(valid)
        one_item['skip']['items'] = one_item['skip']['items'][:1]

        duplicate_item = intake.body.replace(
            b'"unit":"KPC"', b'"unit":"KPC","unit":"KPC"', 1
        )
        duplicate_root = intake.body.replace(
            b'{"approval":', b'{"approval":{},"approval":', 1
        )
        duplicate_nested = intake.body.replace(
            b'"crm_account_id":"10000000000000001"',
            b'"crm_account_id":"10000000000000001","crm_account_id":"10000000000000001"',
            1,
        )
        noncanonical_order = json.dumps(
            dict(reversed(list(valid.items()))),
            ensure_ascii=False,
            separators=(',', ':'),
        ).encode('utf-8')
        cases = [
            ('whitespace', intake.body + b'\n'),
            ('duplicate root key', duplicate_root),
            ('duplicate nested key', duplicate_nested),
            ('duplicate item key', duplicate_item),
            ('invalid utf8', b'"\xff"'),
            ('malformed json', b'{'),
            ('noncanonical key order', noncanonical_order),
            ('extra root field', canonical_json(extra)),
            ('extra approval field', canonical_json(extra_approval)),
            ('extra item field', canonical_json(extra_item)),
            ('float quantity', canonical_json(float_quantity)),
            ('unsafe quantity', canonical_json(unsafe_quantity)),
            ('invalid item id', canonical_json(invalid_item_id)),
            ('invalid crm id', canonical_json(invalid_crm_id)),
            ('invalid date', canonical_json(invalid_date)),
            ('wrong order', canonical_json(wrong_order)),
            ('wrong unit', canonical_json(wrong_unit)),
            ('wrong status', canonical_json(wrong_status)),
            ('non-nfc name', canonical_json(nfd_name)),
            ('control character', canonical_json(control_name)),
            ('wrong item count', canonical_json(one_item)),
        ]
        with PocketBaseHarness([intake]) as server:
            for label, body in cases:
                with self.subTest(label=label):
                    status, payload = server.request(
                        'POST',
                        '/api/c2/v1/commercial-intakes',
                        body=body,
                        headers=self.headers(intake),
                    )
                    self.assertEqual((status, payload), (400, {'code': 'invalid_request'}))
            self.assertEqual(server.scalar('SELECT count(*) FROM potenciais'), 0)
            self.assertEqual(server.scalar('SELECT count(*) FROM potencial_itens'), 0)
            self.assertEqual(server.scalar('SELECT count(*) FROM commercial_intake_results'), 0)

    def test_body_limit_precedes_authentication(self) -> None:
        with PocketBaseHarness() as server:
            status, payload = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=b'x' * 8193,
                headers={'Content-Type': 'application/json'},
            )
            self.assertEqual((status, payload), (413, {'code': 'invalid_request'}))
            self.assertNotIn('stack', str(payload).lower())

    def test_chunked_body_limit_precedes_authentication(self) -> None:
        with PocketBaseHarness() as server:
            status, payload = server.request_chunked(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=b'x' * 8193,
                headers={'Content-Type': 'application/json'},
            )
            self.assertEqual((status, payload), (413, {'code': 'invalid_request'}))
            self.assertNotIn('stack', str(payload).lower())

    def test_valid_but_different_body_is_idempotency_conflict(self) -> None:
        intake = ProvisionedIntake.create('hash-conflict-0001')
        changed = copy.deepcopy(intake.manifest)
        changed['skip']['items'][0]['quantity'] = 11
        with PocketBaseHarness([intake]) as server:
            status, payload = server.request(
                'POST',
                '/api/c2/v1/commercial-intakes',
                body=canonical_json(changed),
                headers=self.headers(intake),
            )
            self.assertEqual((status, payload), (409, {'code': 'idempotency_conflict'}))
            self.assertEqual(server.scalar('SELECT count(*) FROM potenciais'), 0)


if __name__ == '__main__':
    unittest.main()
