from __future__ import annotations

import base64
import hashlib
import http.client
import json
import secrets
import shutil
import socket
import sqlite3
import subprocess
import tempfile
import time
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
PB_BINARY = Path('/root/work/pocketbase-v0.39.0/bin/pocketbase')
FIXTURES = Path(__file__).resolve().parent / 'fixtures'
ROUTE_HOOK = REPO_ROOT / 'pocketbase/hooks/commercial_intake.pb.js'
COMMERCIAL_MIGRATION = REPO_ROOT / 'pocketbase/migrations/0055_create_commercial_intake_collections.js'


def canonical_json(value: object) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(',', ':'),
        sort_keys=True,
    ).encode('utf-8')


def potential_observations(manifest: dict[str, Any]) -> str:
    return '\n'.join(
        (
            f"Solicitação: {manifest['skip']['request_date']}",
            f"Fechamento previsto: {manifest['skip']['closing_date']}",
            f"CRM Account ID: {manifest['customer']['crm_account_id']}",
            f"CRM Deal ID: {manifest['runtime']['crm_deal_id']}",
            f"Operação: {manifest['operation_key']}",
            f"Aprovação: {manifest['approval']['reference']}",
            f"Payload aprovado SHA-256: {manifest['approval']['approved_payload_sha256']}",
        )
    )


def make_manifest(
    operation_key: str,
    *,
    item_1_id: str = 'itm000000000001',
    item_1_sku: str = 'FIXTURE-ONE',
    item_2_id: str = 'itm000000000002',
    item_2_sku: str = 'FIXTURE-TWO',
    crm_deal_id: str = '12345678901234567',
) -> dict[str, Any]:
    return {
        'approval': {
            'approved_payload_sha256': 'a' * 64,
            'reference': f'test/{operation_key}',
        },
        'customer': {
            'crm_account_id': '10000000000000001',
            'name': 'Sanitized Customer',
        },
        'operation': 'create_commercial_intake',
        'operation_key': operation_key,
        'runtime': {'crm_deal_id': crm_deal_id},
        'schema_version': 1,
        'skip': {
            'closing_date': '2026-10-22',
            'items': [
                {
                    'item_id': item_1_id,
                    'order': 1,
                    'quantity': 10,
                    'sku': item_1_sku,
                    'unit': 'KPC',
                },
                {
                    'item_id': item_2_id,
                    'order': 2,
                    'quantity': 30,
                    'sku': item_2_sku,
                    'unit': 'KPC',
                },
            ],
            'potential_name': f'Sanitized Potential {operation_key}',
            'request_date': '2026-09-22',
            'status': 'Solicitado Cotação',
        },
    }


@dataclass(frozen=True)
class ProvisionedIntake:
    manifest: dict[str, Any]
    token: str
    attempt_no: int = 1
    environment: str = 'production'
    write_expires_at: str = '2099-01-01 00:00:00.000Z'
    recovery_expires_at: str = '2099-01-02 00:00:00.000Z'

    @classmethod
    def create(cls, operation_key: str, **kwargs: Any) -> 'ProvisionedIntake':
        token = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b'=').decode('ascii')
        return cls(manifest=make_manifest(operation_key), token=token, **kwargs)

    @property
    def body(self) -> bytes:
        return canonical_json(self.manifest)

    def migration_projection(self) -> dict[str, Any]:
        manifest = self.manifest
        return {
            'operation': {
                'operation_key': manifest['operation_key'],
                'approval_ref': manifest['approval']['reference'],
                'approved_payload_sha256': manifest['approval']['approved_payload_sha256'],
                'customer_name': manifest['customer']['name'],
                'crm_account_id': manifest['customer']['crm_account_id'],
                'crm_deal_id': manifest['runtime']['crm_deal_id'],
                'request_date': manifest['skip']['request_date'],
                'closing_date': manifest['skip']['closing_date'],
                'potential_name': manifest['skip']['potential_name'],
                'status': manifest['skip']['status'],
                'potential_observations': potential_observations(manifest),
                'expected_item_count': 2,
            },
            'approval': {
                'attempt_no': self.attempt_no,
                'request_sha256': hashlib.sha256(self.body).hexdigest(),
                'capability_sha256': hashlib.sha256(self.token.encode('ascii')).hexdigest(),
                'environment': self.environment,
                'write_expires_at': self.write_expires_at,
                'recovery_expires_at': self.recovery_expires_at,
            },
        }


class PocketBaseHarness:
    def __init__(
        self,
        provisioned: list[ProvisionedIntake] | None = None,
        *,
        schema_drift: str | None = None,
    ) -> None:
        self._tmp = tempfile.TemporaryDirectory(prefix='commercial-intake-')
        self.root = Path(self._tmp.name)
        self.data_dir = self.root / 'pb_data'
        self.hooks_dir = self.root / 'pb_hooks'
        self.migrations_dir = self.root / 'pb_migrations'
        self.public_dir = self.root / 'pb_public'
        for directory in (self.data_dir, self.hooks_dir, self.migrations_dir, self.public_dir):
            directory.mkdir()
        shutil.copy2(FIXTURES / '0001_sanitized_base.js', self.migrations_dir / '0001_sanitized_base.js')
        if COMMERCIAL_MIGRATION.exists():
            shutil.copy2(COMMERCIAL_MIGRATION, self.migrations_dir / COMMERCIAL_MIGRATION.name)
        if schema_drift:
            self._write_schema_drift_migration(schema_drift)
        if provisioned:
            self._write_provisioning_migration(provisioned)
        for name in ('potencial_itens_reference.js', 'potencial_itens_price.js'):
            source = REPO_ROOT / 'pocketbase/hooks' / name
            shutil.copy2(source, self.hooks_dir / name.replace('.js', '.pb.js'))
        for source in FIXTURES.glob('*.pb.js'):
            shutil.copy2(source, self.hooks_dir / source.name)
        if ROUTE_HOOK.exists():
            shutil.copy2(ROUTE_HOOK, self.hooks_dir / ROUTE_HOOK.name)
        self.port = self._free_port()
        self.base_url = f'http://127.0.0.1:{self.port}'
        self.log_path = self.root / 'pocketbase.log'
        self._log = self.log_path.open('w+', encoding='utf-8')
        self.process: subprocess.Popen[str] | None = None

    def _write_schema_drift_migration(self, drift: str) -> None:
        mutations = {
            'index': """
  const collection = app.findCollectionByNameOrId('commercial_intake_results')
  collection.removeIndex('idx_commercial_intake_results_operation_id')
  app.save(collection)
""",
            'field': """
  const collection = app.findCollectionByNameOrId('commercial_intake_results')
  collection.fields.getByName('crm_deal_id').required = false
  app.save(collection)
""",
            'rule': """
  const collection = app.findCollectionByNameOrId('commercial_intake_results')
  collection.listRule = ''
  app.save(collection)
""",
            'relation': """
  const collection = app.findCollectionByNameOrId('commercial_intake_results')
  collection.fields.getByName('line_1_id').maxSelect = 2
  app.save(collection)
""",
            'autodate': """
  const collection = app.findCollectionByNameOrId('commercial_intake_results')
  collection.fields.removeByName('created')
  app.save(collection)
""",
            'autodate_operations_options': """
  const collection = app.findCollectionByNameOrId('commercial_intake_operations')
  collection.fields.getByName('created').onCreate = false
  collection.fields.getByName('created').onUpdate = true
  app.save(collection)
""",
            'autodate_approvals_options': """
  const collection = app.findCollectionByNameOrId('commercial_intake_approvals')
  collection.fields.getByName('created').onCreate = false
  collection.fields.getByName('created').onUpdate = true
  app.save(collection)
""",
            'autodate_results_options': """
  const collection = app.findCollectionByNameOrId('commercial_intake_results')
  collection.fields.getByName('created').onCreate = false
  collection.fields.getByName('created').onUpdate = true
  app.save(collection)
""",
            'trigger': """
  app.db().newQuery('DROP TRIGGER trg_commercial_intake_result_update').execute()
  app.db().newQuery(`
    CREATE TRIGGER trg_commercial_intake_result_update
    BEFORE UPDATE ON commercial_intake_results
    WHEN 0
    BEGIN SELECT RAISE(IGNORE); END
  `).execute()
""",
        }
        if drift not in mutations:
            raise ValueError(f'unknown schema drift: {drift}')
        script = f"migrate((app) => {{{mutations[drift]}}})\n"
        (self.migrations_dir / '0055z_test_schema_drift.js').write_text(script, encoding='utf-8')

    def _write_provisioning_migration(self, provisioned: list[ProvisionedIntake]) -> None:
        projections = [item.migration_projection() for item in provisioned]
        serialized = json.dumps(projections, ensure_ascii=False, separators=(',', ':'))
        script = f"""/// <reference path=\"../../pb_data/types.d.ts\" />

const fixtures = {serialized}

migrate((app) => {{
  const operations = app.findCollectionByNameOrId('commercial_intake_operations')
  const approvals = app.findCollectionByNameOrId('commercial_intake_approvals')
  const operationByKey = {{}}

  for (const fixture of fixtures) {{
    let operation = operationByKey[fixture.operation.operation_key]
    if (!operation) {{
      operation = new Record(operations)
      for (const [key, value] of Object.entries(fixture.operation)) {{
        operation.set(key, value)
      }}
      app.save(operation)
      operationByKey[fixture.operation.operation_key] = operation
    }}

    const approval = new Record(approvals)
    approval.set('operation_id', operation.id)
    for (const [key, value] of Object.entries(fixture.approval)) {{
      approval.set(key, value)
    }}
    app.save(approval)
  }}
}})
"""
        path = self.migrations_dir / '0056_test_provisioning.js'
        path.write_text(script, encoding='utf-8')
        for item in provisioned:
            if item.token in script:
                raise AssertionError('synthetic capability leaked into migration')

    @staticmethod
    def _free_port() -> int:
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            return int(sock.getsockname()[1])

    def start(self) -> None:
        command = [
            str(PB_BINARY),
            'serve',
            '--http',
            f'127.0.0.1:{self.port}',
            '--dir',
            str(self.data_dir),
            '--hooksDir',
            str(self.hooks_dir),
            '--hooksWatch=false',
            '--migrationsDir',
            str(self.migrations_dir),
            '--publicDir',
            str(self.public_dir),
        ]
        self.process = subprocess.Popen(
            command,
            cwd=REPO_ROOT,
            stdout=self._log,
            stderr=subprocess.STDOUT,
            text=True,
        )
        deadline = time.monotonic() + 10
        last_error: Exception | None = None
        while time.monotonic() < deadline:
            if self.process.poll() is not None:
                break
            try:
                with urllib.request.urlopen(f'{self.base_url}/api/health', timeout=0.5) as response:
                    if response.status == 200:
                        return
            except Exception as exc:  # server is still starting
                last_error = exc
                time.sleep(0.05)
        raise RuntimeError(f'PocketBase did not start: {last_error}\n{self.logs()}')

    def close(self) -> None:
        self.stop()
        self._log.close()
        self._tmp.cleanup()

    def stop(self) -> None:
        if self.process is not None and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=5)

    def migrate_down(self, count: int = 1) -> subprocess.CompletedProcess[str]:
        self.stop()
        command = [
            str(PB_BINARY),
            'migrate',
            'down',
            str(count),
            '--dir',
            str(self.data_dir),
            '--hooksDir',
            str(self.hooks_dir),
            '--migrationsDir',
            str(self.migrations_dir),
        ]
        return subprocess.run(
            command,
            cwd=REPO_ROOT,
            capture_output=True,
            input='y\n',
            text=True,
            timeout=15,
            check=False,
        )

    def logs(self) -> str:
        self._log.flush()
        return self.log_path.read_text(encoding='utf-8', errors='replace')

    def request(
        self,
        method: str,
        path: str,
        body: bytes = b'',
        headers: dict[str, str] | list[tuple[str, str]] | None = None,
    ) -> tuple[int, dict[str, Any]]:
        connection = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
        if isinstance(headers, list):
            connection.putrequest(method, path)
            for name, value in headers:
                connection.putheader(name, value)
            if not any(name.lower() == 'content-length' for name, _ in headers):
                connection.putheader('Content-Length', str(len(body)))
            connection.endheaders(body)
        else:
            connection.request(method, path, body=body, headers=headers or {})
        response = connection.getresponse()
        raw = response.read()
        connection.close()
        parsed = json.loads(raw.decode('utf-8')) if raw else {}
        return response.status, parsed

    def request_chunked(
        self,
        method: str,
        path: str,
        body: bytes,
        headers: dict[str, str] | None = None,
    ) -> tuple[int, dict[str, Any]]:
        connection = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
        connection.putrequest(method, path)
        for name, value in (headers or {}).items():
            connection.putheader(name, value)
        connection.putheader('Transfer-Encoding', 'chunked')
        connection.endheaders()
        midpoint = max(1, len(body) // 2)
        for chunk in (body[:midpoint], body[midpoint:]):
            if chunk:
                connection.send(f'{len(chunk):X}\r\n'.encode('ascii'))
                connection.send(chunk)
                connection.send(b'\r\n')
        connection.send(b'0\r\n\r\n')
        response = connection.getresponse()
        raw = response.read()
        connection.close()
        parsed = json.loads(raw.decode('utf-8')) if raw else {}
        return response.status, parsed

    def execute(self, query: str, params: tuple[Any, ...] = ()) -> None:
        with sqlite3.connect(self.data_dir / 'data.db', timeout=5) as connection:
            connection.execute(query, params)
            connection.commit()

    def execute_bypassing_terminal_guards(
        self,
        query: str,
        params: tuple[Any, ...] = (),
    ) -> None:
        """Inject storage corruption while restoring production guards atomically."""
        with sqlite3.connect(self.data_dir / 'data.db', timeout=5) as connection:
            definitions = connection.execute(
                "SELECT name, sql FROM sqlite_master WHERE type = 'trigger' "
                "AND name LIKE 'trg_commercial_intake_%' ORDER BY name"
            ).fetchall()
            if not definitions:
                raise AssertionError('commercial intake terminal guards are absent')
            for name, _ in definitions:
                connection.execute(f'DROP TRIGGER {name}')
            connection.execute(query, params)
            for _, sql in definitions:
                connection.execute(sql)
            connection.commit()

    def rows(self, query: str, params: tuple[Any, ...] = ()) -> list[tuple[Any, ...]]:
        with sqlite3.connect(self.data_dir / 'data.db', timeout=5) as connection:
            return connection.execute(query, params).fetchall()

    def scalar(self, query: str, params: tuple[Any, ...] = ()) -> Any:
        with sqlite3.connect(self.data_dir / 'data.db', timeout=5) as connection:
            row = connection.execute(query, params).fetchone()
            return None if row is None else row[0]

    def __enter__(self) -> 'PocketBaseHarness':
        self.start()
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
