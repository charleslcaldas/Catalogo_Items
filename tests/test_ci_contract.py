from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
RUNNER = REPO_ROOT / "scripts" / "ci" / "run-python-tests.py"


class PythonTestRunnerContractTest(unittest.TestCase):
    def run_runner(self, project: Path) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, "-B", str(RUNNER)],
            cwd=project,
            capture_output=True,
            text=True,
            check=False,
        )

    def test_missing_tests_directory_fails(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            result = self.run_runner(Path(directory))

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("tests/ directory is required", result.stderr)

    def test_empty_matching_module_fails(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            tests = project / "tests"
            tests.mkdir()
            (tests / "__init__.py").write_text("", encoding="utf-8")
            (tests / "test_empty.py").write_text("VALUE = 1\n", encoding="utf-8")

            result = self.run_runner(project)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unittest discovery found zero test cases", result.stderr)

    def test_non_package_test_directory_fails(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            tests = project / "tests"
            nested = tests / "nested"
            nested.mkdir(parents=True)
            (tests / "__init__.py").write_text("", encoding="utf-8")
            (nested / "test_sample.py").write_text(
                "import unittest\n\n"
                "class SampleTest(unittest.TestCase):\n"
                "    def test_true(self):\n"
                "        self.assertTrue(True)\n",
                encoding="utf-8",
            )

            result = self.run_runner(project)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Test directories must be importable packages", result.stderr)
        self.assertIn("tests/nested/__init__.py", result.stderr)

    def test_importable_unittest_suite_runs(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            tests = project / "tests"
            tests.mkdir()
            (tests / "__init__.py").write_text("", encoding="utf-8")
            (tests / "test_sample.py").write_text(
                "import unittest\n\n"
                "class SampleTest(unittest.TestCase):\n"
                "    def test_true(self):\n"
                "        self.assertTrue(True)\n",
                encoding="utf-8",
            )

            result = self.run_runner(project)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Validated 1 test modules and 1 test cases", result.stdout)


if __name__ == "__main__":
    unittest.main()
