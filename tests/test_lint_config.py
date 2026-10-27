import json
import subprocess
import sys
from pathlib import Path

import pytest


@pytest.mark.parametrize(
    ("source", "expected_codes"),
    [
        (
            (
                "from fastapi import Depends\n"
                "def dependency(): pass\n"
                "def endpoint(value=Depends(dependency)): pass\n"
            ),
            [],
        ),
        (
            (
                "def make_value(): return object()\n"
                "def unsafe(value=make_value()): pass\n"
            ),
            ["B008"],
        ),
        (
            (
                "from other_framework import Depends\n"
                "def unsafe(value=Depends()): pass\n"
            ),
            ["B008"],
        ),
    ],
)
def test_only_fastapi_dependency_markers_are_exempt(source, expected_codes):
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        [
            sys.executable, "-m", "ruff", "check",
            "--config", str(root / "pyproject.toml"),
            "--select", "B008", "--output-format", "json",
            "--stdin-filename", "lint-fixture.py", "-",
        ],
        input=source,
        text=True,
        capture_output=True,
        timeout=10,
        check=False,
    )
    assert result.returncode == (1 if expected_codes else 0), result.stderr
    assert [finding["code"] for finding in json.loads(result.stdout)] == expected_codes
