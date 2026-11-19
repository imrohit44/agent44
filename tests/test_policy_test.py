"""Tests for agent44 policy test CLI command."""

from __future__ import annotations

import hashlib
import json
import socket
import subprocess
from pathlib import Path
from typing import Any

import pytest

from agent44 import cli


def _write_yaml(path: Path, content: str) -> Path:
    path.write_text(content.strip(), encoding="utf-8")
    return path


def test_missing_tool_name(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(
        tmp_path / "policy.yaml",
        """
version: "1"
name: test-policy
default_deny: true
""",
    )
    code = cli.main(["policy", "test", "--policy", str(policy_path)])
    assert code == 1
    err = capsys.readouterr().err
    assert "--tool is required" in err


def test_missing_policy_file(capsys: pytest.CaptureFixture[str]) -> None:
    code = cli.main(["policy", "test", "--policy", "nonexistent_policy.yaml", "--tool", "add"])
    assert code == 1
    err = capsys.readouterr().err
    assert "Policy validation failed" in err


def test_invalid_policy_file(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(
        tmp_path / "broken.yaml",
        """
version: "999"
unknown_key: true
""",
    )
    code = cli.main(["policy", "test", "--policy", str(policy_path), "--tool", "add"])
    assert code == 1
    err = capsys.readouterr().err
    assert "Policy validation failed" in err


def test_invalid_json_args(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(
        tmp_path / "policy.yaml",
        """
version: "1"
name: test-policy
allow_tools:
  - add
""",
    )
    code = cli.main([
        "policy",
        "test",
        "--policy",
        str(policy_path),
        "--tool",
        "add",
        "--args",
        "{invalid json",
    ])
    assert code == 1
    err = capsys.readouterr().err
    assert "Invalid JSON for --args" in err


def test_args_file_and_json_parsing(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(
        tmp_path / "policy.yaml",
        """
version: "1"
name: test-policy
rules:
  - id: allow_with_flag
    tool: process
    action: ALLOW
    reason: "safe flag"
    when:
      field: flag
      equals: safe
""",
    )
    args_file = tmp_path / "args.json"
    args_file.write_text(json.dumps({"flag": "safe"}), encoding="utf-8")

    code = cli.main([
        "policy",
        "test",
        "--policy",
        str(policy_path),
        "--tool",
        "process",
        "--args-file",
        str(args_file),
    ])
    assert code == 0
    out = capsys.readouterr().out
    assert "Decision: ALLOW (rule allow_with_flag)" in out
    assert 'Arguments: {"flag": "safe"}' in out


def test_args_file_not_found(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(
        tmp_path / "policy.yaml",
        """
version: "1"
name: test-policy
default_deny: true
""",
    )
    code = cli.main([
        "policy",
        "test",
        "--policy",
        str(policy_path),
        "--tool",
        "add",
        "--args-file",
        "missing_args.json",
    ])
    assert code == 1
    err = capsys.readouterr().err
    assert "Arguments file not found" in err


def test_allow_decision(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(
        tmp_path / "policy.yaml",
        """
version: "1"
name: test-policy
default_deny: true
allow_tools:
  - add
""",
    )
    code = cli.main(["policy", "test", "--policy", str(policy_path), "--tool", "add"])
    assert code == 0
    out = capsys.readouterr().out
    assert "Decision: ALLOW (rule allow_tools)" in out
    assert "tool 'add' is allowed by policy" in out


def test_explicit_deny_decision(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(
        tmp_path / "policy.yaml",
        """
version: "1"
name: test-policy
deny_tools:
  - rm_rf
""",
    )
    code = cli.main(["policy", "test", "--policy", str(policy_path), "--tool", "rm_rf"])
    assert code == 2
    out = capsys.readouterr().out
    assert "Decision: DENY (rule deny_tools)" in out


def test_default_deny(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(
        tmp_path / "policy.yaml",
        """
version: "1"
name: test-policy
default_deny: true
allow_tools:
  - echo
""",
    )
    code = cli.main(["policy", "test", "--policy", str(policy_path), "--tool", "unknown_tool"])
    assert code == 2
    out = capsys.readouterr().out
    assert "Decision: DENY (rule default_deny)" in out
    assert "default_deny is enabled" in out


def test_default_allow(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(
        tmp_path / "policy.yaml",
        """
version: "1"
name: test-policy
default_deny: false
deny_tools:
  - dangerous
""",
    )
    code = cli.main(["policy", "test", "--policy", str(policy_path), "--tool", "harmless"])
    assert code == 0
    out = capsys.readouterr().out
    assert "Decision: ALLOW (rule default_allow)" in out


def test_hard_deny_precedence(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(
        tmp_path / "policy.yaml",
        """
version: "1"
name: test-policy
hard_deny_tools:
  - execute
rules:
  - id: allow_exec
    tool: execute
    action: ALLOW
    reason: "try to allow"
    when:
      field: force
      equals: true
""",
    )
    code = cli.main([
        "policy",
        "test",
        "--policy",
        str(policy_path),
        "--tool",
        "execute",
        "--args",
        json.dumps({"force": True}),
    ])
    assert code == 2
    out = capsys.readouterr().out
    assert "Decision: DENY (rule hard_deny_tools)" in out
    assert "hard-denied" in out


def test_argument_level_rules(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(
        tmp_path / "policy.yaml",
        """
version: "1"
name: test-policy
default_deny: true
rules:
  - id: deny_eval
    tool: echo
    action: DENY
    reason: "eval prohibited"
    when:
      field: eval
      field_exists: true
  - id: allow_echo
    tool: echo
    action: ALLOW
    reason: "normal echo allowed"
    when:
      field: text
      field_exists: true
""",
    )
    # 1. Matching DENY argument rule
    code_deny = cli.main([
        "policy",
        "test",
        "--policy",
        str(policy_path),
        "--tool",
        "echo",
        "--args",
        json.dumps({"text": "hi", "eval": True}),
    ])
    assert code_deny == 2
    out_deny = capsys.readouterr().out
    assert "Decision: DENY (rule deny_eval)" in out_deny

    # 2. Matching ALLOW argument rule
    code_allow = cli.main([
        "policy",
        "test",
        "--policy",
        str(policy_path),
        "--tool",
        "echo",
        "--args",
        json.dumps({"text": "hi"}),
    ])
    assert code_allow == 0
    out_allow = capsys.readouterr().out
    assert "Decision: ALLOW (rule allow_echo)" in out_allow


def test_multiple_matching_rules_precedence(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    # First declared DENY argument rule wins over subsequent rules
    policy_path = _write_yaml(
        tmp_path / "policy.yaml",
        """
version: "1"
name: test-policy
rules:
  - id: first_deny
    tool: test_tool
    action: DENY
    reason: "first rule matches"
    when:
      field: mode
      equals: test
  - id: second_deny
    tool: test_tool
    action: DENY
    reason: "second rule matches"
    when:
      field: mode
      equals: test
""",
    )
    code = cli.main([
        "policy",
        "test",
        "--policy",
        str(policy_path),
        "--tool",
        "test_tool",
        "--args",
        json.dumps({"mode": "test"}),
    ])
    assert code == 2
    out = capsys.readouterr().out
    assert "Decision: DENY (rule first_deny)" in out
    assert "first rule matches" in out


def test_model_adapter_limitations(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(
        tmp_path / "policy.yaml",
        """
version: "1"
name: test-policy
default_deny: true
adapter_tools:
  - smart_review
""",
    )
    code = cli.main([
        "policy",
        "test",
        "--policy",
        str(policy_path),
        "--tool",
        "smart_review",
        "--args",
        json.dumps({"code": "print(1)"}),
    ])
    assert code == 3  # INDETERMINATE
    out = capsys.readouterr().out
    assert "Decision: INDETERMINATE (rule adapter_tools)" in out
    assert "model adapter evaluation, which is unavailable offline" in out
    assert "Limitations:" in out
    assert "model-based adapter evaluation unavailable offline" in out


def test_delegation_context_enforcement(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(
        tmp_path / "policy.yaml",
        """
version: "1"
name: test-policy
delegation:
  enforcement: required
allow_tools:
  - read_file
  - write_file
""",
    )
    # 1. No delegation context supplied -> fail closed
    code_no_ctx = cli.main([
        "policy",
        "test",
        "--policy",
        str(policy_path),
        "--tool",
        "read_file",
    ])
    assert code_no_ctx == 2
    out_no_ctx = capsys.readouterr().out
    assert "Decision: DENY (rule delegation:read_file:no_context)" in out_no_ctx
    assert "Limitations:" in out_no_ctx
    assert "delegation enforcement is required by policy but no delegation context was supplied" in out_no_ctx

    # 2. Delegation context supplied, tool is granted -> ALLOW
    ctx_allowed = {
        "granted_tools": ["read_file"],
        "initiator_tools": ["read_file", "write_file"],
    }
    code_ctx_allow = cli.main([
        "policy",
        "test",
        "--policy",
        str(policy_path),
        "--tool",
        "read_file",
        "--delegation-context",
        json.dumps(ctx_allowed),
    ])
    assert code_ctx_allow == 0
    out_ctx_allow = capsys.readouterr().out
    assert "Decision: ALLOW (rule allow_tools)" in out_ctx_allow

    # 3. Delegation context supplied, tool is not granted -> DENY
    code_ctx_deny = cli.main([
        "policy",
        "test",
        "--policy",
        str(policy_path),
        "--tool",
        "write_file",
        "--delegation-context",
        json.dumps(ctx_allowed),
    ])
    assert code_ctx_deny == 2
    out_ctx_deny = capsys.readouterr().out
    assert "Decision: DENY (rule delegation:write_file:not_granted)" in out_ctx_deny


def test_provenance_context_enforcement(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(
        tmp_path / "policy.yaml",
        """
version: "1"
name: test-policy
allow_tools:
  - read_file
provenance:
  enforcement: required
  rules:
    read_file:
      deny_untrusted:
        - path
""",
    )
    # 1. Missing provenance context when required for tool
    code_missing = cli.main([
        "policy",
        "test",
        "--policy",
        str(policy_path),
        "--tool",
        "read_file",
        "--args",
        json.dumps({"path": "/tmp/test"}),
    ])
    # Empty context means path pid is None (not untrusted), so it falls through to allow_tools
    out_missing = capsys.readouterr().out
    assert "Limitations:" in out_missing
    assert "provenance enforcement is required by policy but no provenance context was supplied" in out_missing

    # 2. Untrusted argument supplied -> DENY
    code_untrusted = cli.main([
        "policy",
        "test",
        "--policy",
        str(policy_path),
        "--tool",
        "read_file",
        "--args",
        json.dumps({"path": "/tmp/test"}),
        "--provenance-context",
        json.dumps({"path": "untrusted"}),
    ])
    assert code_untrusted == 2
    out_untrusted = capsys.readouterr().out
    assert "Decision: DENY (rule provenance:read_file:deny_untrusted:path)" in out_untrusted

    # 3. Trusted argument supplied -> ALLOW
    code_trusted = cli.main([
        "policy",
        "test",
        "--policy",
        str(policy_path),
        "--tool",
        "read_file",
        "--args",
        json.dumps({"path": "/tmp/test"}),
        "--provenance-context",
        json.dumps({"path": "trusted"}),
    ])
    assert code_trusted == 0
    out_trusted = capsys.readouterr().out
    assert "Decision: ALLOW (rule allow_tools)" in out_trusted


def test_json_output_correctness(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(
        tmp_path / "policy.yaml",
        """
version: "1"
name: test-policy
default_deny: true
allow_tools:
  - calculate
adapter_tools:
  - review
""",
    )
    # Test JSON for ALLOW
    code = cli.main([
        "policy",
        "test",
        "--policy",
        str(policy_path),
        "--tool",
        "calculate",
        "--args",
        json.dumps({"x": 10, "y": 20}),
        "--json",
    ])
    assert code == 0
    data = json.loads(capsys.readouterr().out)
    assert data["policy"] == str(policy_path)
    assert data["tool"] == "calculate"
    assert data["arguments"] == {"x": 10, "y": 20}
    assert data["decision"] == "ALLOW"
    assert data["rule_id"] == "allow_tools"
    assert "calculate" in data["reason"]
    assert data["limitations"] == []

    # Test JSON for INDETERMINATE
    code_ind = cli.main([
        "policy",
        "test",
        "--policy",
        str(policy_path),
        "--tool",
        "review",
        "--json",
    ])
    assert code_ind == 3
    data_ind = json.loads(capsys.readouterr().out)
    assert data_ind["decision"] == "INDETERMINATE"
    assert data_ind["rule_id"] == "adapter_tools"
    assert len(data_ind["limitations"]) > 0


def test_policy_file_immutability(tmp_path: Path) -> None:
    policy_path = _write_yaml(
        tmp_path / "immutable.yaml",
        """
version: "1"
name: test-immutable
default_deny: true
allow_tools:
  - ping
""",
    )
    orig_bytes = policy_path.read_bytes()
    orig_hash = hashlib.sha256(orig_bytes).hexdigest()

    # Execute multiple test runs
    cli.main(["policy", "test", "--policy", str(policy_path), "--tool", "ping"])
    cli.main(["policy", "test", "--policy", str(policy_path), "--tool", "unknown"])
    cli.main(["policy", "test", "--policy", str(policy_path), "--tool", "ping", "--json"])

    # Ensure policy file has not changed
    assert policy_path.read_bytes() == orig_bytes
    assert hashlib.sha256(policy_path.read_bytes()).hexdigest() == orig_hash


def test_no_subprocess_or_network_execution(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    policy_path = _write_yaml(
        tmp_path / "policy.yaml",
        """
version: "1"
name: test-policy
allow_tools:
  - test_tool
""",
    )

    def forbidden_call(*args: Any, **kwargs: Any) -> Any:
        raise AssertionError("Forbidden external/subprocess call occurred during policy test!")

    monkeypatch.setattr(subprocess, "Popen", forbidden_call)
    monkeypatch.setattr(subprocess, "run", forbidden_call)
    monkeypatch.setattr(socket.socket, "connect", forbidden_call)

    code = cli.main(["policy", "test", "--policy", str(policy_path), "--tool", "test_tool"])
    assert code == 0


def test_quiet_mode(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(
        tmp_path / "policy.yaml",
        """
version: "1"
name: test-policy
allow_tools:
  - echo
deny_tools:
  - rm
""",
    )
    code_allow = cli.main(["policy", "test", "--policy", str(policy_path), "--tool", "echo", "-q"])
    assert code_allow == 0
    assert capsys.readouterr().out.strip() == "ALLOW"

    code_deny = cli.main(["policy", "test", "--policy", str(policy_path), "--tool", "rm", "-q"])
    assert code_deny == 2
    assert capsys.readouterr().out.strip() == "DENY"
