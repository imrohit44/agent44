"""Tests for agent44 policy explain CLI command (Phase 12.1.4)."""

from __future__ import annotations

import json
import socket
import subprocess
from pathlib import Path
from typing import Any

import pytest

from agent44 import cli
from agent44.policy import PolicyEngine


def _write_yaml(path: Path, content: str) -> Path:
    path.write_text(content.strip(), encoding="utf-8")
    return path


def test_missing_tool_name(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
default_deny: true
""")
    code = cli.main(["policy", "explain", "--policy", str(policy_path)])
    assert code == 1
    assert "--tool is required" in capsys.readouterr().err


def test_missing_policy_file(capsys: pytest.CaptureFixture[str]) -> None:
    code = cli.main(["policy", "explain", "--policy", "nonexistent.yaml", "--tool", "read_file"])
    assert code == 1
    assert "Policy validation failed" in capsys.readouterr().err


def test_invalid_json_arguments(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
allow_tools: [read_file]
""")
    code = cli.main([
        "policy",
        "explain",
        "--policy",
        str(policy_path),
        "--tool",
        "read_file",
        "--args",
        "{bad json",
    ])
    assert code == 1
    assert "Invalid JSON for --args" in capsys.readouterr().err


def test_args_file_explain(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
rules:
  - id: allow-path
    tool: read_file
    action: ALLOW
    reason: "safe path allowed"
    when:
      field: path
      equals: /safe/data
""")
    args_file = tmp_path / "args.json"
    args_file.write_text(json.dumps({"path": "/safe/data"}), encoding="utf-8")

    code = cli.main([
        "policy",
        "explain",
        "--policy",
        str(policy_path),
        "--tool",
        "read_file",
        "--args-file",
        str(args_file),
    ])
    assert code == 0
    out = capsys.readouterr().out
    assert "Decision: ALLOW (rule allow-path)" in out
    assert "safe path allowed" in out


def test_allowed_decision(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
allow_tools:
  - calculate
""")
    code = cli.main(["policy", "explain", "--policy", str(policy_path), "--tool", "calculate"])
    assert code == 0
    out = capsys.readouterr().out
    assert "Decision: ALLOW (rule allow_tools)" in out
    assert "[8] ALLOW_TOOLS" in out
    assert "Status: MATCHED" in out
    assert "Evaluation terminated at stage [8] (ALLOW_TOOLS)." in out


def test_denied_decision(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
deny_tools:
  - delete_db
""")
    code = cli.main(["policy", "explain", "--policy", str(policy_path), "--tool", "delete_db"])
    assert code == 2
    out = capsys.readouterr().out
    assert "Decision: DENY (rule deny_tools)" in out
    assert "[6] DENY_TOOLS" in out
    assert "Status: MATCHED" in out
    assert "Evaluation terminated at stage [6] (DENY_TOOLS)." in out


def test_hard_deny_precedence(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
hard_deny_tools:
  - exec_cmd
rules:
  - id: try-allow-exec
    tool: exec_cmd
    action: ALLOW
    reason: "trying to allow"
    when:
      field: force
      equals: true
""")
    code = cli.main([
        "policy",
        "explain",
        "--policy",
        str(policy_path),
        "--tool",
        "exec_cmd",
        "--args",
        json.dumps({"force": True}),
    ])
    assert code == 2
    out = capsys.readouterr().out
    assert "Decision: DENY (rule hard_deny_tools)" in out
    assert "[1] HARD_DENY_TOOLS" in out
    assert "Status: MATCHED" in out
    assert "Evaluation terminated at stage [1] (HARD_DENY_TOOLS)." in out
    # Lower stages should not appear after termination
    assert "[9] ALLOW_ARGUMENT_RULES" not in out


def test_default_deny_decision(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
default_deny: true
allow_tools:
  - ping
""")
    code = cli.main(["policy", "explain", "--policy", str(policy_path), "--tool", "unknown_tool"])
    assert code == 2
    out = capsys.readouterr().out
    assert "Decision: DENY (rule default_deny)" in out
    assert "[11] DEFAULT_POLICY" in out
    assert "Status: MATCHED" in out
    assert "default_deny is enabled" in out


def test_default_allow_decision(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
default_deny: false
deny_tools:
  - dangerous
""")
    code = cli.main(["policy", "explain", "--policy", str(policy_path), "--tool", "safe_tool"])
    assert code == 0
    out = capsys.readouterr().out
    assert "Decision: ALLOW (rule default_allow)" in out
    assert "[11] DEFAULT_POLICY" in out
    assert "default_deny is disabled" in out


def test_argument_level_rule_matches(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
rules:
  - id: block-eval
    tool: echo
    action: DENY
    reason: "eval flag not allowed"
    when:
      field: eval
      field_exists: true
  - id: allow-hello
    tool: echo
    action: ALLOW
    reason: "hello message allowed"
    when:
      field: message
      equals: hello
""")
    # 1. Deny argument rule
    code_deny = cli.main([
        "policy",
        "explain",
        "--policy",
        str(policy_path),
        "--tool",
        "echo",
        "--args",
        json.dumps({"eval": True, "message": "hello"}),
    ])
    assert code_deny == 2
    out_deny = capsys.readouterr().out
    assert "Decision: DENY (rule block-eval)" in out_deny
    assert "[7] DENY_ARGUMENT_RULES" in out_deny
    assert "Status: MATCHED" in out_deny

    # 2. Allow argument rule
    code_allow = cli.main([
        "policy",
        "explain",
        "--policy",
        str(policy_path),
        "--tool",
        "echo",
        "--args",
        json.dumps({"message": "hello"}),
    ])
    assert code_allow == 0
    out_allow = capsys.readouterr().out
    assert "Decision: ALLOW (rule allow-hello)" in out_allow
    assert "[9] ALLOW_ARGUMENT_RULES" in out_allow
    assert "Status: MATCHED" in out_allow


def test_multiple_matching_rules(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
rules:
  - id: first-deny
    tool: run
    action: DENY
    reason: "first rule fired"
    when:
      field: cmd
      equals: bash
  - id: second-deny
    tool: run
    action: DENY
    reason: "second rule fired"
    when:
      field: cmd
      equals: bash
""")
    code = cli.main([
        "policy",
        "explain",
        "--policy",
        str(policy_path),
        "--tool",
        "run",
        "--args",
        json.dumps({"cmd": "bash"}),
    ])
    assert code == 2
    out = capsys.readouterr().out
    assert "rule first-deny" in out
    assert "first rule fired" in out
    assert "second-deny" not in out


def test_delegation_context_explain(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
delegation:
  enforcement: required
allow_tools:
  - read_file
  - write_file
""")
    # 1. Missing context -> fail-closed with limitation note
    code_missing = cli.main([
        "policy",
        "explain",
        "--policy",
        str(policy_path),
        "--tool",
        "read_file",
    ])
    assert code_missing == 2
    out_missing = capsys.readouterr().out
    assert "rule delegation:read_file:no_context" in out_missing
    assert "[2] DELEGATION" in out_missing
    assert "Status: MATCHED" in out_missing
    assert "Limitations:" in out_missing
    assert "delegation enforcement is required" in out_missing

    # 2. Supplied context with tool granted -> PASSED
    ctx_allowed = json.dumps({
        "granted_tools": ["read_file"],
        "initiator_tools": ["read_file", "write_file"],
    })
    code_granted = cli.main([
        "policy",
        "explain",
        "--policy",
        str(policy_path),
        "--tool",
        "read_file",
        "--delegation-context",
        ctx_allowed,
    ])
    assert code_granted == 0
    out_granted = capsys.readouterr().out
    assert "[2] DELEGATION" in out_granted
    assert "Status: PASSED" in out_granted
    assert "Decision: ALLOW (rule allow_tools)" in out_granted


def test_provenance_context_explain(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
allow_tools:
  - upload
provenance:
  enforcement: required
  rules:
    upload:
      deny_untrusted:
        - file_data
""")
    # 1. Untrusted input -> terminates at PROVENANCE stage
    code_untrusted = cli.main([
        "policy",
        "explain",
        "--policy",
        str(policy_path),
        "--tool",
        "upload",
        "--args",
        json.dumps({"file_data": "raw"}),
        "--provenance-context",
        json.dumps({"file_data": "untrusted"}),
    ])
    assert code_untrusted == 2
    out_untrusted = capsys.readouterr().out
    assert "[3] PROVENANCE" in out_untrusted
    assert "Status: MATCHED" in out_untrusted
    assert "rule provenance:upload:deny_untrusted:file_data" in out_untrusted

    # 2. Trusted input -> PASSED provenance stage
    code_trusted = cli.main([
        "policy",
        "explain",
        "--policy",
        str(policy_path),
        "--tool",
        "upload",
        "--args",
        json.dumps({"file_data": "raw"}),
        "--provenance-context",
        json.dumps({"file_data": "trusted"}),
    ])
    assert code_trusted == 0
    out_trusted = capsys.readouterr().out
    assert "[3] PROVENANCE" in out_trusted
    assert "Status: PASSED" in out_trusted
    assert "Decision: ALLOW (rule allow_tools)" in out_trusted


def test_model_adapter_indeterminate(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
default_deny: true
adapter_tools:
  - code_review
""")
    code = cli.main(["policy", "explain", "--policy", str(policy_path), "--tool", "code_review"])
    assert code == 3
    out = capsys.readouterr().out
    assert "Decision: INDETERMINATE (rule adapter_tools)" in out
    assert "[10] ADAPTER_TIER" in out
    assert "Status: UNAVAILABLE" in out
    assert "requires model adapter evaluation, which is unavailable offline" in out
    assert "Limitations:" in out


def test_correct_trace_ordering(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
default_deny: true
allow_tools:
  - step_tool
""")
    cli.main(["policy", "explain", "--policy", str(policy_path), "--tool", "step_tool", "--json"])
    data = json.loads(capsys.readouterr().out)
    trace = data["trace"]
    indices = [stage["stage"] for stage in trace]
    assert indices == sorted(indices)
    assert indices == list(range(1, len(indices) + 1))


def test_trace_consistency_with_policy_test(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
default_deny: true
allow_tools:
  - add
deny_tools:
  - rm_rf
adapter_tools:
  - review
rules:
  - id: deny-eval
    tool: echo
    action: DENY
    reason: "no eval"
    when:
      field: eval
      field_exists: true
""")
    scenarios = [
        ("add", {}),
        ("rm_rf", {}),
        ("review", {}),
        ("echo", {"eval": True}),
        ("unknown", {}),
    ]

    for tool, args in scenarios:
        # Run policy test
        args_str = json.dumps(args)
        code_test = cli.main(["policy", "test", "--policy", str(policy_path), "--tool", tool, "--args", args_str, "--json"])
        data_test = json.loads(capsys.readouterr().out)

        # Run policy explain
        code_explain = cli.main(["policy", "explain", "--policy", str(policy_path), "--tool", tool, "--args", args_str, "--json"])
        data_explain = json.loads(capsys.readouterr().out)

        assert code_test == code_explain, f"Exit code mismatch for {tool}: test={code_test}, explain={code_explain}"
        assert data_test["decision"] == data_explain["decision"], f"Decision mismatch for {tool}"
        assert data_test["rule_id"] == data_explain["rule_id"], f"Rule ID mismatch for {tool}"


def test_json_output_schema(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
allow_tools:
  - sample_tool
""")
    code = cli.main(["policy", "explain", "--policy", str(policy_path), "--tool", "sample_tool", "--json"])
    assert code == 0
    data = json.loads(capsys.readouterr().out)
    assert "policy" in data
    assert "tool" in data
    assert "arguments" in data
    assert "decision" in data
    assert "rule_id" in data
    assert "reason" in data
    assert "trace" in data
    assert isinstance(data["trace"], list)
    assert len(data["trace"]) > 0
    stage0 = data["trace"][0]
    assert "stage" in stage0
    assert "name" in stage0
    assert "status" in stage0
    assert "terminated" in stage0


def test_sensitive_value_redaction(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
allow_tools:
  - login
""")
    sensitive_args = {
        "user": "alice",
        "password": "supersecretpassword123",
        "api_key": "sk-1234567890abcdef",
        "token": "bearer-token-val",
        "nested": {
            "auth_secret": "hidden-secret",
            "public_field": "visible",
        },
    }
    # 1. Human-readable redaction
    cli.main([
        "policy",
        "explain",
        "--policy",
        str(policy_path),
        "--tool",
        "login",
        "--args",
        json.dumps(sensitive_args),
    ])
    out = capsys.readouterr().out
    assert "supersecretpassword123" not in out
    assert "sk-1234567890abcdef" not in out
    assert "bearer-token-val" not in out
    assert "hidden-secret" not in out
    assert "[REDACTED]" in out
    assert '"user": "alice"' in out

    # 2. JSON redaction
    cli.main([
        "policy",
        "explain",
        "--policy",
        str(policy_path),
        "--tool",
        "login",
        "--args",
        json.dumps(sensitive_args),
        "--json",
    ])
    data = json.loads(capsys.readouterr().out)
    args = data["arguments"]
    assert args["password"] == "[REDACTED]"
    assert args["api_key"] == "[REDACTED]"
    assert args["token"] == "[REDACTED]"
    assert args["nested"]["auth_secret"] == "[REDACTED]"
    assert args["nested"]["public_field"] == "visible"


def test_no_subprocess_or_network_execution(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
allow_tools: [check]
""")

    def forbidden(*args: Any, **kwargs: Any) -> Any:
        raise AssertionError("Forbidden external subprocess or socket call during explain!")

    monkeypatch.setattr(subprocess, "Popen", forbidden)
    monkeypatch.setattr(subprocess, "run", forbidden)
    monkeypatch.setattr(socket.socket, "connect", forbidden)

    code = cli.main(["policy", "explain", "--policy", str(policy_path), "--tool", "check"])
    assert code == 0


def test_quiet_mode(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
allow_tools: [ping]
deny_tools: [kill]
""")
    code_allow = cli.main(["policy", "explain", "--policy", str(policy_path), "--tool", "ping", "-q"])
    assert code_allow == 0
    assert capsys.readouterr().out.strip() == "ALLOW"

    code_deny = cli.main(["policy", "explain", "--policy", str(policy_path), "--tool", "kill", "-q"])
    assert code_deny == 2
    assert capsys.readouterr().out.strip() == "DENY"


def test_explain_does_not_affect_engine_evaluate(tmp_path: Path) -> None:
    policy_path = _write_yaml(tmp_path / "policy.yaml", """
version: "1"
name: test-policy
default_deny: true
allow_tools:
  - calculate
rules:
  - id: deny-eval
    tool: echo
    action: DENY
    reason: "no eval"
    when:
      field: eval
      field_exists: true
""")
    engine = PolicyEngine.from_path(policy_path)

    # Pre-explain evaluation
    dec_eval = engine.evaluate("echo", {"eval": True})
    assert dec_eval.action.value == "DENY"
    assert dec_eval.rule_id == "deny-eval"

    # Call explain on the exact same engine instance
    explanation = engine.explain("echo", {"eval": True})
    assert explanation.decision == "DENY"
    assert explanation.rule_id == "deny-eval"

    # Post-explain evaluation
    dec_eval_post = engine.evaluate("echo", {"eval": True})
    assert dec_eval_post.action.value == "DENY"
    assert dec_eval_post.rule_id == "deny-eval"
