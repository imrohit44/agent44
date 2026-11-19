"""Tests for agent44 policy init CLI command (Phase 12.1.3)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
import yaml

from agent44 import cli
from agent44.policy_schema import check_policy
from agent44.policy_templates import TEMPLATES, PolicyTemplate, get_template


def test_each_template_generates_valid_yaml() -> None:
    """All built-in templates must be syntactically valid YAML mappings."""
    for template_id, template in TEMPLATES.items():
        parsed = yaml.safe_load(template.content)
        assert isinstance(parsed, dict), f"Template {template_id} is not a YAML dict"
        assert parsed.get("version") == "1", f"Template {template_id} has wrong version"
        assert "name" in parsed, f"Template {template_id} missing 'name'"


def test_each_template_passes_check_policy(tmp_path: Path) -> None:
    """All built-in templates must pass check_policy with 0 errors and 0 warnings."""
    for template_id, template in TEMPLATES.items():
        file_path = tmp_path / f"{template_id}.yaml"
        file_path.write_text(template.content, encoding="utf-8")
        result = check_policy(file_path)
        assert result.valid, f"Template {template_id} failed check_policy: {result.errors}"
        assert len(result.errors) == 0, f"Template {template_id} has errors: {result.errors}"
        assert len(result.warnings) == 0, f"Template {template_id} has warnings: {result.warnings}"
        assert result.rule_count > 0, f"Template {template_id} loaded 0 rules"


def test_default_output_path_non_interactive(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    """Default output path in non-interactive mode should be policy.yaml."""
    monkeypatch.chdir(tmp_path)
    code = cli.main(["policy", "init", "--non-interactive"])
    assert code == 0
    out = capsys.readouterr().out
    target = tmp_path / "policy.yaml"
    assert target.exists()
    assert "Policy successfully written" in out
    res = check_policy(target)
    assert res.valid
    assert "production-default-deny" in target.read_text(encoding="utf-8")


def test_custom_output_path(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    """Custom destination file should be respected."""
    dest = tmp_path / "custom_policy.yaml"
    code = cli.main(["policy", "init", "--output", str(dest), "--non-interactive"])
    assert code == 0
    assert dest.exists()
    assert check_policy(dest).valid


def test_nested_parent_directory_creation(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    """Parent directories are created when they do not already exist."""
    dest = tmp_path / "subdir" / "nested" / "policy.yaml"
    code = cli.main(["policy", "init", "--output", str(dest), "--non-interactive"])
    assert code == 0
    out = capsys.readouterr().out
    assert "Created directory:" in out
    assert dest.exists()
    assert check_policy(dest).valid


def test_existing_file_not_overwritten(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    """Existing destination files must not be overwritten without --force."""
    dest = tmp_path / "existing.yaml"
    dest.write_text("original content", encoding="utf-8")

    code = cli.main(["policy", "init", "--output", str(dest), "--non-interactive"])
    assert code == 1
    err = capsys.readouterr().err
    assert "already exists (use --force to overwrite)" in err
    assert dest.read_text(encoding="utf-8") == "original content"


def test_force_overwrite(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    """--force overwrites an existing file."""
    dest = tmp_path / "existing.yaml"
    dest.write_text("original content", encoding="utf-8")

    code = cli.main(["policy", "init", "--output", str(dest), "--force", "--non-interactive"])
    assert code == 0
    content = dest.read_text(encoding="utf-8")
    assert "original content" not in content
    assert "version: \"1\"" in content
    assert check_policy(dest).valid


def test_invalid_template_rejection(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    """Invalid template name is rejected with an error listing available templates."""
    dest = tmp_path / "policy.yaml"
    code = cli.main(["policy", "init", "--output", str(dest), "--template", "nonexistent", "--non-interactive"])
    assert code == 1
    err = capsys.readouterr().err
    assert "unknown template 'nonexistent'" in err
    assert "default-deny" in err
    assert not dest.exists()


def test_template_selection_restricted(tmp_path: Path) -> None:
    """Restricted template is generated correctly."""
    dest = tmp_path / "restricted.yaml"
    code = cli.main(["policy", "init", "--output", str(dest), "--template", "restricted", "--non-interactive"])
    assert code == 0
    content = dest.read_text(encoding="utf-8")
    assert "production-restricted" in content
    assert "deny-internal-host" in content
    assert check_policy(dest).valid


def test_template_selection_development(tmp_path: Path) -> None:
    """Development template is generated correctly."""
    dest = tmp_path / "dev.yaml"
    code = cli.main(["policy", "init", "--output", str(dest), "--template", "development", "--non-interactive"])
    assert code == 0
    content = dest.read_text(encoding="utf-8")
    assert "local-development" in content
    assert "default_deny: false" in content
    assert "hard_deny_tools" in content
    assert check_policy(dest).valid


def test_interactive_mode_flow(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    """Interactive mode prompts for path, template, shows preview, and writes on confirmation."""
    monkeypatch.chdir(tmp_path)
    inputs = iter(["my_policy.yaml", "2", "y"])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(inputs))

    code = cli.main(["policy", "init"])
    assert code == 0
    out = capsys.readouterr().out
    assert "Select a policy template:" in out
    assert "Selected template: Restricted" in out
    assert "--- Preview: my_policy.yaml ---" in out
    assert "Policy successfully written to my_policy.yaml" in out

    target = tmp_path / "my_policy.yaml"
    assert target.exists()
    assert "production-restricted" in target.read_text(encoding="utf-8")
    assert check_policy(target).valid


def test_interactive_cancellation_at_confirm(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    """Interactive mode cancels when user declines confirmation."""
    monkeypatch.chdir(tmp_path)
    inputs = iter(["cancel.yaml", "1", "n"])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(inputs))

    code = cli.main(["policy", "init"])
    assert code == 0
    out = capsys.readouterr().out
    assert "Policy initialization cancelled." in out
    assert not (tmp_path / "cancel.yaml").exists()


def test_interactive_cancellation_eof(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    """Interactive mode exits cleanly on EOF."""
    def raise_eof(prompt: str = "") -> str:
        raise EOFError

    monkeypatch.setattr("builtins.input", raise_eof)
    code = cli.main(["policy", "init"])
    assert code == 0
    out = capsys.readouterr().out
    assert "Policy initialization cancelled." in out


def test_atomic_write_on_invalid_generated_policy(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    """If generated policy validation fails, no file or temp file is left behind."""
    dest = tmp_path / "invalid_policy.yaml"
    broken_template = PolicyTemplate(
        id="broken",
        name="Broken",
        description="Broken template for testing",
        content="version: '999'\ninvalid_syntax: [\n",
    )
    monkeypatch.setattr("agent44.policy_templates.get_template", lambda name: broken_template)

    code = cli.main(["policy", "init", "--output", str(dest), "--non-interactive"])
    assert code == 1
    err = capsys.readouterr().err
    assert "Generated policy validation failed" in err
    assert not dest.exists()
    assert not (dest.with_name(f".{dest.name}.tmp")).exists()


def test_existing_agent44_init_unchanged(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    """Original 'agent44 init' command behavior remains completely unchanged."""
    monkeypatch.chdir(tmp_path)
    code = cli.main(["init", "--path", "agent44.yaml"])
    assert code == 0
    out = capsys.readouterr().out
    assert "Written to agent44.yaml" in out
    target = tmp_path / "agent44.yaml"
    assert target.exists()
    content = target.read_text(encoding="utf-8")
    assert "agent44-starter" in content
    assert "default_deny: true" in content
