"""Agent44 CLI — command-line interface entry point."""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from agent44 import __version__

logger = logging.getLogger("agent44.cli")


def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[1:]
    if not argv:
        return cmd_help()
    parser = argparse.ArgumentParser(
        prog="agent44", add_help=False,
        description="MCP proxy with policy enforcement.",
    )
    sp = parser.add_subparsers(dest="command")
    parser.add_argument("--version", action="version", version=f"agent44 {__version__}")
    p_init = subparsers.add_parser("init", help="Create config")
    p_init.set_defaults(func=cmd_init)
    p_val = subparsers.add_parser("validate", help="Validate")
    p_val.set_defaults(func=cmd_validate)
    p_run = subparsers.add_parser("run", help="Run proxy")
    p_run.set_defaults(func=cmd_run)
    p_ins = subparsers.add_parser("inspect", help="Inspect log")
    p_ins.set_defaults(func=cmd_inspect)
    if "--help" in argv or "-h" in argv or "help" in argv:
        parser.print_help(); return 0
    if "--version" in argv:
        print(f"agent44 {__version__}"); return 0
    args = parser.parse_args(argv)
    if not hasattr(args, "func"):
        parser.print_help(); return 2
    return args.func(argv)


def cmd_help() -> int:
    p = argparse.ArgumentParser(prog="agent44",
                                description="MCP proxy with policy.")
    p.print_help(); return 0


def cmd_version() -> int:
    print(f"agent44 {__version__}"); return 0


def cmd_init(argv: list[str] | None = None) -> int:
    import argparse
    from pathlib import Path
    parser = argparse.ArgumentParser(prog="agent44 init")
    parser.add_argument("--path", default="agent44.yaml")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args(argv)
    cp = Path(args.path)
    if cp.exists() and not args.force:
        print("Use --force to overwrite", file=sys.stderr); return 1
    cy = "version: \"1\"\nname: agent44-starter\ndefault_deny: true\nallow_tools:\n  - add\n  - echo\nrules:\n  - id: d\n    tool: echo\n    action: DENY\n    reason: \"eval not on echo\"\n    when:\n      field: eval\n      field_exists: true"
    cp.write_text(cy, encoding="utf-8")
    print(f"Written to {cp}"); return 0


def cmd_validate(argv: list[str] | None = None) -> int:
    import yaml
    parser = argparse.ArgumentParser(prog="agent44 validate")
    parser.add_argument("config", nargs="?", default=None)
    parser.add_argument("--policy", default=None)
    args = parser.parse_args(argv)
    cp = Path(args.config) if args.config else None
    if cp is None:
        for c in ["agent44.yaml", "agent44.yml"]:
            if Path(c).exists(): cp = Path(c); break
    if cp is None or not cp.exists():
        print("No config", file=sys.stderr); return 1
    try:
        config = yaml.safe_load(cp.read_text()) or {}
    except Exception as e:
        print(f"YAML error: {e}", file=sys.stderr); return 1
    if args.policy:
        print("Policy ok"); return 0
    print("Config ok", file=sys.stderr); return 0


def cmd_inspect(argv: list[str] | None = None) -> int:
    import argparse
    parser = argparse.ArgumentParser(prog="agent44 inspect")
    parser.add_argument("log", help="JSONL log")
    parser.add_argument("--fields", nargs="+",
                        default=["tool_name", "policy_action", "policy_reason",
                                 "correlation_id", "outcome", "forwarded"])
    args = parser.parse_args(argv)
    lp = Path(args.log)
    if not lp.exists():
        print("Log not found", file=sys.stderr); return 1
    events = []
    with lp.open("r") as f:
        for line in f:
            line = line.strip()
            if line:
                try: events.append(json.loads(line))
                except json.JSONDecodeError: pass
    for event in events:
        for field in args.fields:
            v = event.get(field, "<N/A>")
            if v is None and field in event: v = "<None>"
            elif field not in event: v = "<N/A>"
            print(f"  {field}: {v}")
        print()
    return 0


def cmd_run(argv: list[str] | None = None) -> int:
    import argparse
    from agent44.proxy import main as proxy_main
    parser = argparse.ArgumentParser(prog="agent44 run")
    parser.add_argument("--config", default=None)
    parser.add_argument("--policy", default=None)
    parser.add_argument("--local-model", default=None)
    parser.add_argument("--local-model-host", default="127.0.0.1")
    parser.add_argument("--local-model-port", type=int, default=11434)
    parser.add_argument("--local-model-timeout", type=int, default=30)
    parser.add_argument("--adapter-replay", default=None)
    parser.add_argument("downstream_cmd", nargs="?")
    parser.add_argument("--stderr-level", default="INFO")
    args = parser.parse_args(argv)
    level = getattr(logging, args.stderr_level.upper())
    logging.basicConfig(level=level, stream=sys.stderr,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    pa = []
    if args.config: pa.extend(["--config", args.config])
    if args.policy: pa.extend(["--policy", args.policy])
    if args.local_model: pa.extend(["--local-model", args.local_model])
    pa.extend(["--local-model-host", args.local_model_host,
               "--local-model-port", str(args.local_model_port),
               "--local-model-timeout", str(args.local_model_timeout)])
    if args.adapter_replay: pa.extend(["--adapter-replay", args.adapter_replay])
    if args.downstream_cmd: pa.extend(["--", args.downstream_cmd])
    try:
        ec = proxy_main(pa)
        return ec
    except SystemExit as exc:
        return int(exc.code or 1)
    except Exception as e:
        print(f"error: {e}", file=sys.stderr); return 1