"""Agent44 CLI — command-line interface entry point."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path
from typing import Any

from agent44 import __version__

_SENSITIVE_KEY_PATTERN = re.compile(
    r"(token|password|passwd|secret|api[_-]?key|auth|credential|cert|private|bearer)",
    re.IGNORECASE,
)


def redact_sensitive_arguments(data: Any) -> Any:
    """Recursively redact sensitive field values in argument mappings."""
    if isinstance(data, dict):
        result: dict[str, Any] = {}
        for k, v in data.items():
            if _SENSITIVE_KEY_PATTERN.search(str(k)):
                result[k] = "[REDACTED]"
            else:
                result[k] = redact_sensitive_arguments(v)
        return result
    if isinstance(data, list):
        return [redact_sensitive_arguments(item) for item in data]
    return data


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
    p_pol = subparsers.add_parser("policy", help="Policy management", add_help=False)
    p_pol.set_defaults(func=cmd_policy)

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


def _parse_delegation_context(raw: str | dict[str, Any]) -> Any:
    from agent44.delegation import DelegationContext, DelegationStatus, Principal

    data = json.loads(raw) if isinstance(raw, str) else raw
    if not isinstance(data, dict):
        raise ValueError("delegation context must be a JSON object")

    initiator_data = data.get("initiator")
    if isinstance(initiator_data, dict):
        initiator = Principal(
            principal_id=initiator_data.get("principal_id", "initiator"),
            allowed_tools=frozenset(initiator_data.get("allowed_tools", [])),
        )
    else:
        initiator_tools = data.get("initiator_tools")
        if initiator_tools is None:
            initiator_tools = data.get("granted_tools", [])
        initiator = Principal(
            principal_id=str(data.get("initiator_id", "initiator")),
            allowed_tools=frozenset(initiator_tools),
        )

    status_str = data.get("status", "active")
    status = (
        DelegationStatus.REVOKED
        if status_str == "revoked"
        else DelegationStatus.ACTIVE
    )
    now = time.time()
    issued_at = float(data.get("issued_at", now - 10))
    expires_at = float(data.get("expires_at", now + 3600))
    if data.get("expired"):
        expires_at = now - 10

    return DelegationContext(
        delegation_id=str(data.get("delegation_id", "del_test")),
        workflow_id=str(data.get("workflow_id", "wf_test")),
        initiator=initiator,
        delegate_principal_id=str(data.get("delegate_principal_id", "delegate")),
        granted_tools=frozenset(data.get("granted_tools", [])),
        issued_at=issued_at,
        expires_at=expires_at,
        status=status,
    )


def _parse_provenance_context(raw: str | dict[str, Any]) -> Any:
    from agent44.provenance import ProvenanceContext, ProvenanceRegistry, TrustClass

    data = json.loads(raw) if isinstance(raw, str) else raw
    if not isinstance(data, dict):
        raise ValueError("provenance context must be a JSON object")

    reg = ProvenanceRegistry()
    prov_values: dict[str, str | None] = {}
    mapping = data.get("arguments", data)
    for arg_name, spec in mapping.items():
        if isinstance(spec, str):
            val = spec.lower()
            if val in ("untrusted", "external"):
                pid = reg.classify_external()
            elif val in ("trusted", "internal"):
                pid = reg.classify_trusted()
            elif val in ("derived", "derived_untrusted"):
                pid = reg._create(
                    trust_class=TrustClass.DERIVED_UNTRUSTED,
                    source_category="derived",
                    parent_ids=(),
                )
            else:
                pid = reg.classify_external()
            prov_values[arg_name] = pid
        elif isinstance(spec, dict):
            tc = TrustClass(spec.get("trust_class", "untrusted").lower())
            vt = spec.get("validation_transition")
            pid = reg._create(
                trust_class=tc,
                source_category=spec.get("source_category", "test"),
                parent_ids=(),
                validation_transition=vt,
            )
            prov_values[arg_name] = pid
        elif spec is None:
            prov_values[arg_name] = None

    return ProvenanceContext(registry=reg, values=prov_values)


def cmd_policy(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(prog="agent44 policy")
    subparsers = parser.add_subparsers(dest="subcommand")
    p_check = subparsers.add_parser("check", help="Validate and lint a policy file")
    p_check.add_argument("policy_path", nargs="?", default="policy.yaml", help="Path to policy YAML")
    p_check.add_argument("-q", "--quiet", action="store_true", help="Quiet output (summary only)")

    p_test = subparsers.add_parser("test", help="Dry‑run a tool call against a policy")
    p_test.add_argument("--policy", default="policy.yaml", help="Path to policy YAML")
    p_test.add_argument("--tool", default=None, help="Tool name to evaluate")
    arg_group = p_test.add_mutually_exclusive_group()
    arg_group.add_argument("--args", default=None, help="JSON string of arguments for the tool")
    arg_group.add_argument("--args-file", default=None, help="Path to JSON file with arguments")
    p_test.add_argument("--delegation-context", help="JSON string for delegation context")
    p_test.add_argument("--provenance-context", help="JSON string for provenance context")
    p_test.add_argument("-q", "--quiet", action="store_true", help="Minimal output, only decision result")
    p_test.add_argument("--json", action="store_true", help="Machine‑readable JSON output")

    p_init = subparsers.add_parser("init", help="Guided policy initialization")
    p_init.add_argument("--output", "-o", default=None, help="Destination policy file (default: policy.yaml)")
    p_init.add_argument(
        "--template",
        "-t",
        default=None,
        help="Policy template to use (default-deny, restricted, development)",
    )
    p_init.add_argument(
        "--force",
        "-f",
        action="store_true",
        help="Explicitly allow overwriting an existing file",
    )
    p_init.add_argument(
        "--non-interactive",
        action="store_true",
        help="Generate policy without interactive questions",
    )

    p_exp = subparsers.add_parser("explain", help="Explain policy evaluation trace for a tool call")
    p_exp.add_argument("--policy", default="policy.yaml", help="Path to policy YAML")
    p_exp.add_argument("--tool", default=None, help="Tool name to evaluate")
    arg_group_exp = p_exp.add_mutually_exclusive_group()
    arg_group_exp.add_argument("--args", default=None, help="JSON string of arguments for the tool")
    arg_group_exp.add_argument("--args-file", default=None, help="Path to JSON file with arguments")
    p_exp.add_argument("--delegation-context", help="JSON string for delegation context")
    p_exp.add_argument("--provenance-context", help="JSON string for provenance context")
    p_exp.add_argument("-q", "--quiet", action="store_true", help="Minimal output, only decision result")
    p_exp.add_argument("--json", action="store_true", help="Machine‑readable JSON trace output")

    args = parser.parse_args(argv)
    if args.subcommand is None:
        parser.print_help()
        return 1

    if args.subcommand == "check":
        from agent44.policy_schema import check_policy

        result = check_policy(args.policy_path)
        if not args.quiet:
            print(f"Checking policy: {result.path}")
        for err in result.errors:
            print(err.format(filename=str(result.path)), file=sys.stderr)
        for warn in result.warnings:
            print(warn.format(filename=str(result.path)))
        if result.valid:
            warn_msg = (
                f" ({len(result.warnings)} warning{'s' if len(result.warnings) != 1 else ''})"
                if result.warnings
                else ""
            )
            print(f"Policy valid: {result.rule_count} rules loaded successfully{warn_msg}.")
            return 0
        else:
            print(
                f"Policy check failed: {len(result.errors)} error{'s' if len(result.errors) != 1 else ''} found.",
                file=sys.stderr,
            )
            return 1

    elif args.subcommand == "test":
        # Dry‑run a tool call against a policy without invoking downstream MCP servers or models.
        from agent44.policy import PolicyEngine
        from agent44.policy_schema import check_policy

        if not args.tool:
            print("Error: --tool is required.", file=sys.stderr)
            return 1

        policy_path = Path(args.policy)
        check_res = check_policy(policy_path)
        if not check_res.valid:
            print(f"Policy validation failed: {len(check_res.errors)} error(s).", file=sys.stderr)
            for err in check_res.errors:
                print(err.format(filename=str(check_res.path)), file=sys.stderr)
            return 1

        # Load arguments JSON.
        if args.args_file:
            args_file_path = Path(args.args_file)
            if not args_file_path.exists():
                print(f"Arguments file not found: {args.args_file}", file=sys.stderr)
                return 1
            try:
                args_json = json.loads(args_file_path.read_text(encoding="utf-8"))
            except Exception as e:
                print(f"Failed to read args file: {e}", file=sys.stderr)
                return 1
        elif args.args is not None:
            try:
                args_json = json.loads(args.args)
            except Exception as e:
                print(f"Invalid JSON for --args: {e}", file=sys.stderr)
                return 1
        else:
            args_json = {}

        if not isinstance(args_json, dict):
            print("Arguments must be a JSON object (key-value dictionary).", file=sys.stderr)
            return 1

        # Optional contexts.
        delegation_ctx = None
        provenance_ctx = None
        limitations: list[str] = []

        if args.delegation_context:
            try:
                delegation_ctx = _parse_delegation_context(args.delegation_context)
            except Exception as e:
                print(f"Invalid JSON for --delegation-context: {e}", file=sys.stderr)
                return 1

        if args.provenance_context:
            try:
                provenance_ctx = _parse_provenance_context(args.provenance_context)
            except Exception as e:
                print(f"Invalid JSON for --provenance-context: {e}", file=sys.stderr)
                return 1

        engine = PolicyEngine.from_path(policy_path)
        policy = engine.policy

        # Check if delegation enforcement is required but context was not supplied
        if policy.delegation.enforcement == "required" and delegation_ctx is None:
            limitations.append(
                "delegation enforcement is required by policy but no delegation context was supplied; evaluated as missing context (fail-closed)"
            )

        # Check if provenance enforcement is required for this tool but context was not supplied
        if (
            policy.provenance.enforcement == "required"
            and args.tool in policy.provenance.rules
            and provenance_ctx is None
        ):
            limitations.append(
                "provenance enforcement is required by policy but no provenance context was supplied; evaluated against empty context (fail-closed)"
            )

        # 1. Deterministic evaluation (matching exact PolicyEngine runtime path)
        matched = engine.match_rules(args.tool, args_json, provenance_ctx, delegation_ctx)
        if matched is not None:
            decision_action = matched.action.value
            rule_id = matched.rule_id
            reason = matched.reason
        elif args.tool in set(policy.adapter_tools):
            # 2. Tool requires model-based adapter evaluation (offline indeterminate)
            decision_action = "INDETERMINATE"
            rule_id = "adapter_tools"
            reason = f"tool '{args.tool}' requires model adapter evaluation, which is unavailable offline"
            limitations.append(
                "model-based adapter evaluation unavailable offline; call requires live adapter"
            )
        else:
            # 3. Configured policy default
            default_dec = engine._default_decision(args.tool)
            decision_action = default_dec.action.value
            rule_id = default_dec.rule_id
            reason = default_dec.reason

        # Exit codes: 0 = ALLOW, 2 = DENY, 3 = INDETERMINATE, 1 = Invalid input / error
        if decision_action == "ALLOW":
            exit_code = 0
        elif decision_action == "DENY":
            exit_code = 2
        elif decision_action == "INDETERMINATE":
            exit_code = 3
        else:
            exit_code = 1

        if args.json:
            out = {
                "policy": str(policy_path),
                "tool": args.tool,
                "arguments": args_json,
                "decision": decision_action,
                "rule_id": rule_id,
                "reason": reason,
                "limitations": limitations,
            }
            print(json.dumps(out, indent=2))
        else:
            if args.quiet:
                print(decision_action)
            else:
                print(f"Policy: {policy_path}")
                print(f"Tool: {args.tool}")
                print(f"Arguments: {json.dumps(args_json)}")
                print(f"Decision: {decision_action} (rule {rule_id})")
                print(f"Reason: {reason}")
                if limitations:
                    print("Limitations:")
                    for lim in limitations:
                        print(f"  - {lim}")

        return exit_code

    elif args.subcommand == "init":
        return _run_policy_init(args)

    elif args.subcommand == "explain":
        return _run_policy_explain(args)

    return 0


def _run_policy_init(args: argparse.Namespace) -> int:
    from agent44.policy_schema import check_policy
    from agent44.policy_templates import TEMPLATES, get_template

    is_interactive = not args.non_interactive

    output_path = args.output
    template_name = args.template

    if is_interactive:
        try:
            if not output_path:
                val = input("Destination file [policy.yaml]: ").strip()
                output_path = val or "policy.yaml"

            if not template_name:
                print("Select a policy template:")
                print("  1) default-deny  - Production-grade least-privilege (undeclared tools blocked)")
                print("  2) restricted    - Explicit allowances with parameter inspection rules")
                print("  3) development   - Local experimentation (permissive with destructive tools blocked)")
                choice = input("Choose template [1-3] (default 1): ").strip()
                if not choice or choice == "1" or choice == "default-deny":
                    template_name = "default-deny"
                elif choice == "2" or choice == "restricted":
                    template_name = "restricted"
                elif choice == "3" or choice == "development":
                    template_name = "development"
                else:
                    template_name = choice
        except (EOFError, KeyboardInterrupt):
            print("\nPolicy initialization cancelled.")
            return 0
    else:
        if not output_path:
            output_path = "policy.yaml"
        if not template_name:
            template_name = "default-deny"

    tmpl = get_template(template_name)
    if tmpl is None:
        available = ", ".join(sorted(TEMPLATES.keys()))
        print(f"Error: unknown template '{template_name}'. Available templates: {available}", file=sys.stderr)
        return 1

    target = Path(output_path)
    if target.exists() and not args.force:
        print(f"Error: destination file '{target}' already exists (use --force to overwrite).", file=sys.stderr)
        return 1

    if is_interactive:
        try:
            print(f"\nSelected template: {tmpl.name}")
            print(f"{tmpl.description}\n")
            print(f"--- Preview: {target} ---")
            print(tmpl.content.rstrip())
            print("--------------------------\n")
            confirm = input(f"Write this policy to {target}? [Y/n]: ").strip().lower()
            if confirm and confirm not in ("y", "yes"):
                print("Policy initialization cancelled.")
                return 0
        except (EOFError, KeyboardInterrupt):
            print("\nPolicy initialization cancelled.")
            return 0

    # Ensure parent directory exists
    if target.parent != Path(".") and not target.parent.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        print(f"Created directory: {target.parent}")

    # Atomic write and validation
    temp_file = target.with_name(f".{target.name}.tmp")
    try:
        temp_file.write_text(tmpl.content, encoding="utf-8")
        check_res = check_policy(temp_file)
        if not check_res.valid:
            temp_file.unlink(missing_ok=True)
            print(f"Generated policy validation failed: {len(check_res.errors)} error(s).", file=sys.stderr)
            for err in check_res.errors:
                print(err.format(filename=str(target)), file=sys.stderr)
            return 1
        temp_file.replace(target)
    except Exception as e:
        temp_file.unlink(missing_ok=True)
        print(f"Failed to write policy file: {e}", file=sys.stderr)
        return 1

    print(f"Policy successfully written to {target}")
    print(f"Policy valid: {check_res.rule_count} rules loaded successfully.")
    return 0


def _run_policy_explain(args: argparse.Namespace) -> int:
    from agent44.policy import PolicyEngine
    from agent44.policy_schema import check_policy

    if not args.tool:
        print("Error: --tool is required.", file=sys.stderr)
        return 1

    policy_path = Path(args.policy)
    check_res = check_policy(policy_path)
    if not check_res.valid:
        print(f"Policy validation failed: {len(check_res.errors)} error(s).", file=sys.stderr)
        for err in check_res.errors:
            print(err.format(filename=str(check_res.path)), file=sys.stderr)
        return 1

    # Load arguments JSON.
    if args.args_file:
        args_file_path = Path(args.args_file)
        if not args_file_path.exists():
            print(f"Arguments file not found: {args.args_file}", file=sys.stderr)
            return 1
        try:
            args_json = json.loads(args_file_path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"Failed to read args file: {e}", file=sys.stderr)
            return 1
    elif args.args is not None:
        try:
            args_json = json.loads(args.args)
        except Exception as e:
            print(f"Invalid JSON for --args: {e}", file=sys.stderr)
            return 1
    else:
        args_json = {}

    if not isinstance(args_json, dict):
        print("Arguments must be a JSON object (key-value dictionary).", file=sys.stderr)
        return 1

    # Optional contexts.
    delegation_ctx = None
    provenance_ctx = None

    if args.delegation_context:
        try:
            delegation_ctx = _parse_delegation_context(args.delegation_context)
        except Exception as e:
            print(f"Invalid JSON for --delegation-context: {e}", file=sys.stderr)
            return 1

    if args.provenance_context:
        try:
            provenance_ctx = _parse_provenance_context(args.provenance_context)
        except Exception as e:
            print(f"Invalid JSON for --provenance-context: {e}", file=sys.stderr)
            return 1

    engine = PolicyEngine.from_path(policy_path)
    explanation = engine.explain(args.tool, args_json, provenance_ctx, delegation_ctx)
    redacted_args = redact_sensitive_arguments(args_json)

    # Determine exit code matching policy test
    if explanation.decision == "ALLOW":
        exit_code = 0
    elif explanation.decision == "DENY":
        exit_code = 2
    elif explanation.decision == "INDETERMINATE":
        exit_code = 3
    else:
        exit_code = 1

    if args.json:
        out = {
            "policy": str(policy_path),
            "tool": args.tool,
            "arguments": redacted_args,
            "decision": explanation.decision,
            "rule_id": explanation.rule_id,
            "reason": explanation.reason,
            "trace": [
                {
                    "stage": s.stage_index,
                    "name": s.stage_name,
                    "status": s.status.value,
                    "rule_id": s.rule_id,
                    "reason": s.reason,
                    "terminated": s.terminated,
                }
                for s in explanation.stages
            ],
            "limitations": explanation.limitations,
        }
        print(json.dumps(out, indent=2))
    elif args.quiet:
        print(explanation.decision)
    else:
        print("Agent44 Policy Explanation\n")
        print(f"Policy: {policy_path}")
        print(f"Tool: {args.tool}")
        print(f"Arguments: {json.dumps(redacted_args)}\n")
        print(f"Decision: {explanation.decision} (rule {explanation.rule_id})")
        print(f"Reason: {explanation.reason}\n")
        print("Evaluation trace:\n")
        terminating_stage: str | None = None
        for s in explanation.stages:
            print(f"[{s.stage_index}] {s.stage_name}")
            print(f"    Status: {s.status.value}")
            if s.rule_id:
                print(f"    Rule: {s.rule_id}")
            if s.reason:
                print(f"    Reason: {s.reason}")
            print()
            if s.terminated:
                terminating_stage = f"stage [{s.stage_index}] ({s.stage_name})"

        if terminating_stage:
            print(f"Evaluation terminated at {terminating_stage}.")
        print(f"Final decision: {explanation.decision}\n")

        if explanation.limitations:
            print("Limitations:")
            for lim in explanation.limitations:
                print(f"  - {lim}")

    return exit_code
