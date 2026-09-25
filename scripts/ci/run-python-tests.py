#!/usr/bin/env python3
"""Discover and run the repository's unittest suite without silent skips."""

from __future__ import annotations

import sys
import unittest
from collections.abc import Iterator
from pathlib import Path

TEST_PATTERN = "test_*.py"


def iter_test_cases(suite: unittest.TestSuite) -> Iterator[unittest.TestCase]:
    """Yield every test case from a potentially nested suite."""
    for test in suite:
        if isinstance(test, unittest.TestSuite):
            yield from iter_test_cases(test)
        else:
            yield test


def module_name(path: Path, repo_root: Path) -> str:
    """Return the import name for a Python file below the repository root."""
    return ".".join(path.relative_to(repo_root).with_suffix("").parts)


def main() -> int:
    repo_root = Path.cwd().resolve()
    tests_dir = repo_root / "tests"

    if not tests_dir.exists():
        print("tests/ directory is required", file=sys.stderr)
        return 1

    if not tests_dir.is_dir():
        print("tests/ exists but is not a directory", file=sys.stderr)
        return 1

    test_files = sorted(path for path in tests_dir.rglob(TEST_PATTERN) if path.is_file())
    if not test_files:
        print(f"tests/ exists but contains no {TEST_PATTERN} files", file=sys.stderr)
        return 1

    missing_package_markers: set[Path] = set()
    for test_file in test_files:
        directory = test_file.parent
        while directory != repo_root:
            marker = directory / "__init__.py"
            if not marker.is_file():
                missing_package_markers.add(marker)
            directory = directory.parent

    if missing_package_markers:
        print("Test directories must be importable packages; missing:", file=sys.stderr)
        for marker in sorted(missing_package_markers):
            print(f"  {marker.relative_to(repo_root)}", file=sys.stderr)
        return 1

    loader = unittest.TestLoader()
    suite = loader.discover(
        start_dir=str(tests_dir),
        pattern=TEST_PATTERN,
        top_level_dir=str(repo_root),
    )
    cases = list(iter_test_cases(suite))

    if not cases:
        print("unittest discovery found zero test cases", file=sys.stderr)
        return 1

    expected_modules = {module_name(path, repo_root) for path in test_files}
    contributing_modules = {case.__class__.__module__ for case in cases}
    empty_modules = sorted(expected_modules - contributing_modules)

    result = unittest.TextTestRunner(verbosity=2).run(suite)

    if empty_modules:
        print("Matching test modules that contributed no unittest case:", file=sys.stderr)
        for name in empty_modules:
            print(f"  {name}", file=sys.stderr)

    if not result.wasSuccessful() or empty_modules:
        return 1

    print(f"Validated {len(test_files)} test modules and {result.testsRun} test cases")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
