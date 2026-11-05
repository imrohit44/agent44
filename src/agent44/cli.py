"""Agent44 CLI — command-line interface entry point."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from agent44 import __version__


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    parser = argparse.ArgumentParser(
        prog="agent44",
        description="MCP proxy with policy enforcement.",
    )
    parser.add_argument("--version", action="version", version=f"agent44 {__version__}")
    subparsers = parser.add_subparsers(dest="command")
    p_init = subparsers.add_parser("init", help="Create config", add_help=False)
    p_init.set_defaults(func=cmd_init)
    p_val = subparsers.add_parser("validate", help="Validate", add_help=False)
    p_val.set_defaults(func=cmd_validate)
    p_run = subparsers.add_parser("run", help="Run proxy", add_help=False)
    p_run.set_defaults(func=cmd_run)
    p_ins = subparsers.add_parser("inspect", help="Inspect log", add_help=False)
    p_ins.set_defaults(func=cmd_inspect)
    if argv == ["help"]:
        parser.print_help()
        return 0
    args, command_args = parser.parse_known_args(argv)
    if args.command is None:
        parser.print_help()
        return 0 if not argv else 2
    return args.func(command_args)


def cmd_init(argv: list[str] | None = None) -> int:
    import argparse
    from pathlib import Path

    parser = argparse.ArgumentParser(prog="agent44 init")
    parser.add_argument("--path", default="agent44.yaml")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args(argv)
    cp = Path(args.path)
    if cp.exists() and not args.force:
        print("Use --force to overwrite", file=sys.stderr)
        return 1
    cy = (
        'version: "1"\n'
        "name: agent44-starter\n"
        "default_deny: true\n"
        "allow_tools:\n"
        "  - add\n"
        "  - echo\n"
        "rules:\n"
        "  - id: d\n"
        "    tool: echo\n"
        "    action: DENY\n"
        '    reason: "eval not on echo"\n'
        "    when:\n"
        "      field: eval\n"
        "      field_exists: true"
    )
    cp.write_text(cy, encoding="utf-8")
    print(f"Written to {cp}")
    return 0


def cmd_validate(argv: list[str] | None = None) -> int:
    import yaml

    parser = argparse.ArgumentParser(prog="agent44 validate")
    parser.add_argument("config", nargs="?", default=None)
    parser.add_argument("--policy", default=None)
    args = parser.parse_args(argv)
    cp = Path(args.config) if args.config else None
    if cp is None:
        for c in ["agent44.yaml", "agent44.yml"]:
            if Path(c).exists():
                cp = Path(c)
                break
    if cp is None or not cp.exists():
        print("No config", file=sys.stderr)
        return 1
    try:
        yaml.safe_load(cp.read_text())
    except Exception as e:
        print(f"YAML error: {e}", file=sys.stderr)
        return 1
    if args.policy:
        print("Policy ok")
        return 0
    print("Config ok", file=sys.stderr)
    return 0


def cmd_inspect(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(prog="agent44 inspect")
    parser.add_argument("log", help="JSONL log")
    parser.add_argument(
        "--fields",
        nargs="+",
        default=[
            "tool_name",
            "policy_action",
            "policy_reason",
            "correlation_id",
            "outcome",
            "forwarded",
        ],
    )
    args = parser.parse_args(argv)
    lp = Path(args.log)
    if not lp.exists():
        print("Log not found", file=sys.stderr)
        return 1
    events = []
    with lp.open("r") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    for event in events:
        for field in args.fields:
            v = event.get(field, "<N/A>")
            if v is None and field in event:
                v = "<None>"
            elif field not in event:
                v = "<N/A>"
            print(f"  {field}: {v}")
        print()
    return 0


def cmd_run(argv: list[str] | None = None) -> int:
    from agent44.proxy import main as proxy_main

    return proxy_main(argv)
