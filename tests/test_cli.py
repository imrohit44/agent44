from __future__ import annotations

import json

import pytest

from agent44 import cli


def test_help_and_version(capsys) -> None:
    assert cli.main([]) == 0
    assert "usage: agent44" in capsys.readouterr().out

    with pytest.raises(SystemExit) as exc_info:
        cli.main(["--version"])
    assert exc_info.value.code == 0
    assert "agent44 " in capsys.readouterr().out


def test_init_and_validate_commands(tmp_path, monkeypatch, capsys) -> None:
    monkeypatch.chdir(tmp_path)
    assert cli.main(["init", "--path", "policy.yaml"]) == 0
    assert "default_deny: true" in (tmp_path / "policy.yaml").read_text()

    assert cli.main(["validate", "policy.yaml"]) == 0
    assert "Config ok" in capsys.readouterr().err


def test_inspect_command(tmp_path, capsys) -> None:
    observation = tmp_path / "observations.jsonl"
    observation.write_text(
        json.dumps({"tool_name": "add", "policy_action": "ALLOW"}) + "\n",
        encoding="utf-8",
    )

    assert cli.main(["inspect", str(observation)]) == 0
    output = capsys.readouterr().out
    assert "tool_name: add" in output
    assert "policy_action: ALLOW" in output


def test_run_forwards_proxy_arguments(monkeypatch) -> None:
    calls: list[list[str]] = []

    def proxy_main(argv: list[str]) -> int:
        calls.append(argv)
        return 0

    monkeypatch.setattr("agent44.proxy.main", proxy_main)
    arguments = [
        "run",
        "--policy",
        "evaluation/demo.yaml",
        "--",
        "python",
        "-m",
        "agent44.demo_server",
    ]

    assert cli.main(arguments) == 0
    assert calls == [[
        "--policy",
        "evaluation/demo.yaml",
        "--",
        "python",
        "-m",
        "agent44.demo_server",
    ]]


def test_run_help_succeeds(capsys) -> None:
    assert cli.main(["run", "--help"]) == 0
    assert "Transparent MCP stdio proxy" in capsys.readouterr().out
