"""Offline local validation gate for the Agent44 repository.

Run with:  uv run python scripts/release_check.py

Checks: assembly produces no unexpected changes, full pytest passes, Ruff
output matches the checked-in baseline, imports work, and evaluation files
are unchanged or match the available frozen-file manifest. No network, no
vendor calls, fully offline.
"""

from __future__ import annotations

import difflib
import hashlib
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASELINE_RUFF = ROOT / ".ruff_baseline.json"
FROZEN_HASHES = ROOT / ".phase9_start_hashes.txt"


def run(cmd, *, check=True):
    print(f"$ {' '.join(cmd)}", flush=True)
    return subprocess.run(cmd, cwd=ROOT, check=check, capture_output=True, text=True)


def hash_directory(directory):
    result = {}
    for path in sorted(directory.rglob("*")):
        if path.is_file():
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            result[str(path.relative_to(directory))] = digest
    return result


def step1_assemble():
    print("=== Step 1: assemble.py ===")
    source_directory = ROOT / "src" / "agent44"
    before = hash_directory(source_directory)
    result = run([sys.executable, "scripts/assemble.py"], check=False)
    after = hash_directory(source_directory)
    if before != after:
        print("FAIL: assemble.py changed files under src/agent44/")
        return False
    if result.returncode != 0:
        print("FAIL: assemble.py exited non-zero")
        print(result.stdout)
        print(result.stderr)
        return False
    print("PASS: assemble.py produced no changes and exited 0")
    return True


def step2_pytest():
    print("=== Step 2: pytest ===")
    result = run([sys.executable, "-m", "pytest", "tests/", "-q"], check=False)
    if result.returncode != 0:
        print("FAIL: pytest failed")
        print(result.stdout[-3000:])
        print(result.stderr[-3000:])
        return False
    for line in result.stdout.splitlines():
        if "passed" in line or "failed" in line:
            print(line.strip())
    print("PASS: all tests passed")
    return True


def step3_ruff_diff():
    print("=== Step 3: ruff diff ===")
    result = run([sys.executable, "-m", "ruff", "check", "src/", "tests/"], check=False)
    current_output = result.stdout + result.stderr
    if not BASELINE_RUFF.exists():
        print(f"FAIL: Ruff baseline not found: {BASELINE_RUFF}")
        return False
    baseline = BASELINE_RUFF.read_text()
    if not baseline.strip():
        print(f"FAIL: Ruff baseline is empty: {BASELINE_RUFF}")
        return False
    if current_output == baseline:
        print("PASS: ruff output matches pre-existing baseline (no new issues)")
        return True
    print("FAIL: ruff output differs from pre-existing baseline")
    diff = list(
        difflib.unified_diff(
            baseline.splitlines(),
            current_output.splitlines(),
            fromfile=str(BASELINE_RUFF),
            tofile="current Ruff output",
            lineterm="",
        )
    )
    print("\n".join(diff[:120]))
    if len(diff) > 120:
        print(f"... diff truncated ({len(diff)} lines total)")
    return False


def step4_import_sanity():
    print("=== Step 4: import sanity ===")
    modules = [
        "agent44",
        "agent44.policy",
        "agent44.proxy",
        "agent44.delegation",
        "agent44.provenance",
        "agent44.transfer",
        "agent44.model_adapter",
        "agent44.observe",
        "agent44.threshold_adapter",
        "agent44.argument_policy",
    ]
    for mod in modules:
        try:
            __import__(mod)
        except Exception as exc:
            print(f"FAIL: import {mod} raised {exc}")
            return False
    print("PASS: all agent44 modules import cleanly")
    result = run(
        [sys.executable, "-c", "import agent44.threshold_adapter; print('import OK')"],
        check=False,
    )
    if result.returncode != 0:
        print("FAIL: clean interpreter import failed")
        print(result.stderr)
        return False
    print("PASS: clean interpreter import OK")
    return True


def step5_frozen_hashes():
    print("=== Step 5: frozen-file integrity ===")
    if not FROZEN_HASHES.exists():
        result = run(
            ["git", "status", "--porcelain", "--", "evaluation/"],
            check=False,
        )
        if result.returncode != 0:
            print("FAIL: unable to inspect evaluation working-tree status")
            print(result.stderr)
            return False
        if result.stdout.strip():
            print("FAIL: evaluation files differ from the committed working-tree baseline")
            print(result.stdout)
            return False
        print(
            "PASS: evaluation/ has no working-tree changes; "
            "historical .phase9_start_hashes.txt is not present, "
            "so Phase 9 hashes were not checked"
        )
        return True
    expected = {}
    raw = FROZEN_HASHES.read_bytes()
    if raw[:2] in (b"\xff\xfe", b"\xfe\xff"):
        text = raw.decode("utf-16")
    else:
        text = raw.decode("utf-8", errors="replace")
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split(None, 1)
        if len(parts) == 2:
            expected[parts[1]] = parts[0]
    if not expected:
        print("FAIL: frozen-file hash manifest contains no usable entries")
        return False
    mismatches = []
    for rel_path, expected_hash in expected.items():
        full_path = ROOT / rel_path
        if not full_path.exists():
            mismatches.append(f"MISSING: {rel_path}")
            continue
        actual = hashlib.sha256(full_path.read_bytes()).hexdigest()
        if actual != expected_hash:
            mismatches.append(f"CHANGED: {rel_path}")
    if mismatches:
        print("FAIL: frozen-file hashes changed:")
        for m in mismatches:
            print(f"  {m}")
        return False
    print(f"PASS: {len(expected)} frozen-file hashes unchanged")
    return True


def main():
    steps = [
        ("assemble.py no unexpected changes", step1_assemble),
        ("full pytest", step2_pytest),
        ("ruff diff vs baseline", step3_ruff_diff),
        ("import sanity", step4_import_sanity),
        ("frozen-file integrity", step5_frozen_hashes),
    ]
    passed = 0
    failed = 0
    for name, step in steps:
        print()
        try:
            ok = step()
        except Exception as exc:
            print(f"FAIL: {name} raised {exc}")
            ok = False
        if ok:
            passed += 1
        else:
            failed += 1
            print(f"  >> {name}: FAILED")
    print()
    print("=" * 50)
    print(f"Release check: {passed} passed, {failed} failed out of {len(steps)}")
    print("RELEASE CHECK: " + ("FAILED" if failed else "PASSED"))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())