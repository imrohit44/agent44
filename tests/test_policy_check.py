"""Tests for Phase 12.1.1: agent44 policy check (schema validation and linting)."""

from __future__ import annotations

from pathlib import Path
from textwrap import dedent

import pytest

from agent44 import cli
from agent44.policy_schema import check_policy


def _write_yaml(tmp_path: Path, content: str, filename: str = "policy.yaml") -> Path:
    p = tmp_path / filename
    p.write_text(dedent(content).strip(), encoding="utf-8")
    return p


# 1. Existing valid policy fixtures and YAML examples
def test_check_demo_policy() -> None:
    res = check_policy("evaluation/demo.yaml")
    assert res.valid is True
    assert res.policy is not None
    assert res.rule_count > 0
    assert len(res.errors) == 0


def test_check_examples_policy() -> None:
    res = check_policy("examples/policy.yaml")
    assert res.valid is True
    assert res.policy is not None
    assert res.rule_count == 4
    assert len(res.errors) == 0


def test_check_eval_4a_policy_has_warnings() -> None:
    res = check_policy("evaluation/policy_eval_4a.yaml")
    assert res.valid is True
    assert res.policy is not None
    assert len(res.errors) == 0
    assert len(res.warnings) > 0
    codes = {w.code for w in res.warnings}
    assert "REDUNDANT_TOOL_DECLARATION" in codes
    assert "IDENTICAL_CONDITION_SHADOWED" in codes


# 2. File errors: missing, not a file, empty
def test_check_missing_file(tmp_path: Path) -> None:
    res = check_policy(tmp_path / "nonexistent.yaml")
    assert res.valid is False
    assert len(res.errors) == 1
    assert res.errors[0].code == "FILE_NOT_FOUND"


def test_check_directory_not_a_file(tmp_path: Path) -> None:
    res = check_policy(tmp_path)
    assert res.valid is False
    assert len(res.errors) == 1
    assert res.errors[0].code == "NOT_A_FILE"


def test_check_empty_policy_file(tmp_path: Path) -> None:
    p = tmp_path / "empty.yaml"
    p.write_text("", encoding="utf-8")
    res = check_policy(p)
    assert res.valid is False
    assert len(res.errors) == 1
    assert res.errors[0].code == "EMPTY_POLICY"


# 3. Invalid YAML syntax
def test_check_invalid_yaml(tmp_path: Path) -> None:
    p = _write_yaml(
        tmp_path,
        """
        version: "1"
          unindented: [bad
        """,
    )
    res = check_policy(p)
    assert res.valid is False
    assert len(res.errors) == 1
    assert res.errors[0].code == "INVALID_YAML"
    assert res.errors[0].line is not None


# 4. Invalid root type (not a mapping)
def test_check_invalid_root_type(tmp_path: Path) -> None:
    p = _write_yaml(
        tmp_path,
        """
        - item1
        - item2
        """,
    )
    res = check_policy(p)
    assert res.valid is False
    assert len(res.errors) == 1
    assert res.errors[0].code == "INVALID_ROOT_TYPE"


# 5. Unknown top-level keys
def test_check_unknown_top_level_key(tmp_path: Path) -> None:
    p = _write_yaml(
        tmp_path,
        """
        version: "1"
        name: test
        unexpected_field: true
        allow_tools:
          - add
        """,
    )
    res = check_policy(p)
    assert res.valid is False
    assert any(e.code == "UNKNOWN_TOP_LEVEL_KEY" and "unexpected_field" in e.message for e in res.errors)


# 6. Missing required fields (version)
def test_check_missing_version(tmp_path: Path) -> None:
    p = _write_yaml(
        tmp_path,
        """
        name: test
        allow_tools:
          - add
        """,
    )
    res = check_policy(p)
    assert res.valid is False
    assert any("version" in e.message for e in res.errors)


# 7. Unsupported version
def test_check_unsupported_version(tmp_path: Path) -> None:
    p = _write_yaml(
        tmp_path,
        """
        version: "99"
        allow_tools:
          - add
        """,
    )
    res = check_policy(p)
    assert res.valid is False
    assert any("unsupported policy version" in e.message for e in res.errors)


# 8. Malformed rule: both equals and field_exists
def test_check_rule_ambiguous_condition(tmp_path: Path) -> None:
    p = _write_yaml(
        tmp_path,
        """
        version: "1"
        rules:
          - id: bad-rule
            tool: echo
            action: DENY
            reason: test
            when:
              field: message
              equals: hello
              field_exists: true
        """,
    )
    res = check_policy(p)
    assert res.valid is False
    assert any("condition must set exactly one" in e.message for e in res.errors)


# 9. Conflicting tool lists: allow_tools and deny_tools
def test_check_conflicting_tool_lists(tmp_path: Path) -> None:
    p = _write_yaml(
        tmp_path,
        """
        version: "1"
        allow_tools:
          - add
          - calc
        deny_tools:
          - calc
        """,
    )
    res = check_policy(p)
    assert res.valid is False
    assert any("both allow_tools and deny_tools" in e.message for e in res.errors)


# 10. Duplicate rule ids
def test_check_duplicate_rule_ids(tmp_path: Path) -> None:
    p = _write_yaml(
        tmp_path,
        """
        version: "1"
        rules:
          - id: rule-one
            tool: echo
            action: DENY
            reason: reason 1
            when:
              field: a
              field_exists: true
          - id: rule-one
            tool: echo
            action: DENY
            reason: reason 2
            when:
              field: b
              field_exists: true
        """,
    )
    res = check_policy(p)
    assert res.valid is False
    assert any("duplicate rule ids" in e.message for e in res.errors)


# 11. Lint warnings: Suspicious wildcard tools
def test_lint_wildcard_tools(tmp_path: Path) -> None:
    p = _write_yaml(
        tmp_path,
        """
        version: "1"
        allow_tools:
          - "*"
        deny_tools:
          - ".*"
        """,
    )
    res = check_policy(p)
    assert res.valid is True
    wildcard_warnings = [w for w in res.warnings if w.code == "SUSPICIOUS_WILDCARD_TOOL"]
    assert len(wildcard_warnings) == 2


# 12. Lint warnings: Shadowed rule by hard_deny_tools and deny_tools
def test_lint_shadowed_rules(tmp_path: Path) -> None:
    p = _write_yaml(
        tmp_path,
        """
        version: "1"
        deny_tools:
          - blocked_tool
        hard_deny_tools:
          - danger_tool
        rules:
          - id: rule-on-blocked
            tool: blocked_tool
            action: DENY
            reason: reason
            when:
              field: x
              equals: 1
          - id: rule-on-danger
            tool: danger_tool
            action: DENY
            reason: reason
            when:
              field: y
              equals: 2
        """,
    )
    res = check_policy(p)
    assert res.valid is True
    shadowed = [w for w in res.warnings if w.code == "SHADOWED_RULE"]
    assert len(shadowed) == 2


# 13. Lint warnings: Redundant allow rule when tool is in allow_tools
def test_lint_redundant_allow_rule(tmp_path: Path) -> None:
    p = _write_yaml(
        tmp_path,
        """
        version: "1"
        allow_tools:
          - calculator
        rules:
          - id: allow-calc-mode
            tool: calculator
            action: ALLOW
            reason: allow mode
            when:
              field: mode
              equals: basic
        """,
    )
    res = check_policy(p)
    assert res.valid is True
    redundant = [w for w in res.warnings if w.code == "REDUNDANT_ALLOW_RULE"]
    assert len(redundant) == 1


# 14. Lint warnings: Identical condition shadowed within rules
def test_lint_identical_condition_shadowed(tmp_path: Path) -> None:
    p = _write_yaml(
        tmp_path,
        """
        version: "1"
        rules:
          - id: rule-first
            tool: echo
            action: DENY
            reason: first
            when:
              field: eval
              field_exists: true
          - id: rule-second
            tool: echo
            action: DENY
            reason: second
            when:
              field: eval
              field_exists: true
        """,
    )
    res = check_policy(p)
    assert res.valid is True
    shadowed = [w for w in res.warnings if w.code == "IDENTICAL_CONDITION_SHADOWED"]
    assert len(shadowed) == 1


# 15. Lint warnings: Ineffective adapter_tools
def test_lint_ineffective_adapter_tool(tmp_path: Path) -> None:
    p = _write_yaml(
        tmp_path,
        """
        version: "1"
        allow_tools:
          - reviewer
        adapter_tools:
          - reviewer
        """,
    )
    res = check_policy(p)
    assert res.valid is True
    ineffective = [w for w in res.warnings if w.code == "INEFFECTIVE_ADAPTER_TOOL"]
    assert len(ineffective) == 1


# 16. Lint warnings: Regex-like syntax in literal scalar equals
def test_lint_regex_like_literal_equals(tmp_path: Path) -> None:
    p = _write_yaml(
        tmp_path,
        """
        version: "1"
        rules:
          - id: regex-attempt
            tool: search
            action: DENY
            reason: blocked pattern
            when:
              field: query
              equals: "^SELECT .* FROM$"
        """,
    )
    res = check_policy(p)
    assert res.valid is True
    regex_warn = [w for w in res.warnings if w.code == "REGEX_LIKE_LITERAL_EQUALS"]
    assert len(regex_warn) == 1


# 17. CLI behavior and exit codes
def test_cli_policy_check_valid(tmp_path: Path, capsys) -> None:
    p = _write_yaml(
        tmp_path,
        """
        version: "1"
        name: cli-test
        allow_tools: [add]
        """,
    )
    assert cli.main(["policy", "check", str(p)]) == 0
    out = capsys.readouterr().out
    assert "Policy valid: 1 rules loaded successfully." in out


def test_cli_policy_check_invalid(tmp_path: Path, capsys) -> None:
    p = _write_yaml(
        tmp_path,
        """
        version: "99"
        """,
    )
    assert cli.main(["policy", "check", str(p)]) == 1
    err = capsys.readouterr().err
    assert "unsupported policy version" in err
    assert "Policy check failed" in err


def test_cli_policy_check_with_warnings(tmp_path: Path, capsys) -> None:
    p = _write_yaml(
        tmp_path,
        """
        version: "1"
        allow_tools:
          - "*"
        """,
    )
    assert cli.main(["policy", "check", str(p)]) == 0
    out = capsys.readouterr().out
    assert "SUSPICIOUS_WILDCARD_TOOL" in out
    assert "1 warning" in out


def test_cli_policy_check_quiet(tmp_path: Path, capsys) -> None:
    p = _write_yaml(
        tmp_path,
        """
        version: "1"
        allow_tools: [add]
        """,
    )
    assert cli.main(["policy", "check", str(p), "--quiet"]) == 0
    out = capsys.readouterr().out
    assert "Checking policy:" not in out
    assert "Policy valid:" in out


def test_cli_policy_no_subcommand(capsys) -> None:
    assert cli.main(["policy"]) == 1
    assert "usage: agent44 policy" in capsys.readouterr().out
