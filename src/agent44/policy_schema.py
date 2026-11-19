"""Policy schema validation and linting for Agent44 (Phase 12.1.1).

Validates the structure and consistency of Agent44 YAML policy files
ahead of runtime without invoking any downstream MCP tools or mutating files.
Distinguishes between hard validation errors (invalid YAML, schema violations,
conflicting declarations) and advisory lint warnings (duplicates, unreachable
rules, wildcard tools, suspicious patterns).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from pydantic import ValidationError

from agent44.policy import (
    _POLICY_KEYS,
    Policy,
    PolicyError,
    PolicyRule,
    SUPPORTED_POLICY_VERSIONS,
)


@dataclass(frozen=True)
class PolicyFinding:
    """A single validation error or lint warning."""

    severity: str  # "ERROR" or "WARNING"
    code: str
    message: str
    line: int | None = None
    column: int | None = None

    def format(self, filename: str | None = None) -> str:
        loc = ""
        if filename:
            loc += filename
            if self.line is not None:
                loc += f":{self.line}"
                if self.column is not None:
                    loc += f":{self.column}"
            loc += ": "
        elif self.line is not None:
            loc = f"Line {self.line}: "
        return f"[{self.severity}] {loc}({self.code}) {self.message}"


@dataclass
class PolicyCheckResult:
    """Overall outcome of policy validation and linting."""

    path: str | Path
    valid: bool
    policy: Policy | None
    rule_count: int
    errors: list[PolicyFinding]
    warnings: list[PolicyFinding]

    @property
    def has_errors(self) -> bool:
        return bool(self.errors)

    @property
    def has_warnings(self) -> bool:
        return bool(self.warnings)


def _find_node_line(root_node: yaml.Node | None, *keys: str | int) -> tuple[int | None, int | None]:
    """Traverse a PyYAML node tree to find the line and column of a specific key/index."""
    if root_node is None or not keys:
        return None, None

    current: yaml.Node = root_node
    for key in keys:
        if isinstance(current, yaml.MappingNode) and isinstance(key, str):
            matched = False
            for k_node, v_node in current.value:
                if isinstance(k_node, yaml.ScalarNode) and k_node.value == key:
                    current = v_node
                    matched = True
                    break
            if not matched:
                return None, None
        elif isinstance(current, yaml.SequenceNode) and isinstance(key, int):
            if 0 <= key < len(current.value):
                current = current.value[key]
            else:
                return None, None
        else:
            return None, None

    if hasattr(current, "start_mark"):
        return current.start_mark.line + 1, current.start_mark.column + 1
    return None, None


def _find_key_mark(root_node: yaml.Node | None, key_name: str) -> tuple[int | None, int | None]:
    """Find line/col of a top-level mapping key."""
    if not isinstance(root_node, yaml.MappingNode):
        return None, None
    for k_node, _ in root_node.value:
        if isinstance(k_node, yaml.ScalarNode) and k_node.value == key_name:
            return k_node.start_mark.line + 1, k_node.start_mark.column + 1
    return None, None


def check_policy(path_or_text: str | Path, *, is_text: bool = False) -> PolicyCheckResult:
    """Validate and lint an Agent44 policy file or YAML string.

    Returns a ``PolicyCheckResult`` containing any errors or warnings.
    Never executes downstream tools, never modifies the policy, and fails closed
    upon validation failure.
    """
    errors: list[PolicyFinding] = []
    warnings: list[PolicyFinding] = []
    path_display = "<string>" if is_text else str(path_or_text)

    # 1. Read content
    if is_text:
        content = str(path_or_text)
    else:
        file_path = Path(path_or_text)
        if not file_path.exists():
            return PolicyCheckResult(
                path=path_display,
                valid=False,
                policy=None,
                rule_count=0,
                errors=[
                    PolicyFinding(
                        severity="ERROR",
                        code="FILE_NOT_FOUND",
                        message=f"Policy file not found: {file_path}",
                    )
                ],
                warnings=[],
            )
        if not file_path.is_file():
            return PolicyCheckResult(
                path=path_display,
                valid=False,
                policy=None,
                rule_count=0,
                errors=[
                    PolicyFinding(
                        severity="ERROR",
                        code="NOT_A_FILE",
                        message=f"Policy path is not a file: {file_path}",
                    )
                ],
                warnings=[],
            )
        try:
            content = file_path.read_text(encoding="utf-8")
        except Exception as exc:
            return PolicyCheckResult(
                path=path_display,
                valid=False,
                policy=None,
                rule_count=0,
                errors=[
                    PolicyFinding(
                        severity="ERROR",
                        code="READ_ERROR",
                        message=f"Failed to read policy file: {exc}",
                    )
                ],
                warnings=[],
            )

    # Check for empty file
    if not content.strip():
        return PolicyCheckResult(
            path=path_display,
            valid=False,
            policy=None,
            rule_count=0,
            errors=[
                PolicyFinding(
                    severity="ERROR",
                    code="EMPTY_POLICY",
                    message="Policy file is empty",
                )
            ],
            warnings=[],
        )

    # 2. Parse YAML and YAML Node tree for line annotations
    root_node: yaml.Node | None = None
    try:
        root_node = yaml.compose(content)
    except yaml.YAMLError:
        pass  # We'll catch the syntax error below

    try:
        raw = yaml.safe_load(content)
    except yaml.YAMLError as exc:
        line = exc.problem_mark.line + 1 if hasattr(exc, "problem_mark") and exc.problem_mark else None
        col = exc.problem_mark.column + 1 if hasattr(exc, "problem_mark") and exc.problem_mark else None
        return PolicyCheckResult(
            path=path_display,
            valid=False,
            policy=None,
            rule_count=0,
            errors=[
                PolicyFinding(
                    severity="ERROR",
                    code="INVALID_YAML",
                    message=f"Invalid YAML syntax: {exc}",
                    line=line,
                    column=col,
                )
            ],
            warnings=[],
        )

    if not isinstance(raw, dict):
        line = root_node.start_mark.line + 1 if root_node and hasattr(root_node, "start_mark") else None
        return PolicyCheckResult(
            path=path_display,
            valid=False,
            policy=None,
            rule_count=0,
            errors=[
                PolicyFinding(
                    severity="ERROR",
                    code="INVALID_ROOT_TYPE",
                    message=f"Policy root must be a mapping/dictionary, got {type(raw).__name__}",
                    line=line,
                )
            ],
            warnings=[],
        )

    # 3. Structural & Unknown Key Check
    unknown_keys = sorted(set(raw) - set(_POLICY_KEYS))
    if unknown_keys:
        for u_key in unknown_keys:
            line, col = _find_key_mark(root_node, u_key)
            errors.append(
                PolicyFinding(
                    severity="ERROR",
                    code="UNKNOWN_TOP_LEVEL_KEY",
                    message=f"Unknown policy key '{u_key}'. Supported keys: {', '.join(sorted(_POLICY_KEYS))}",
                    line=line,
                    column=col,
                )
            )

    # 4. Pydantic Model Validation (matches PolicyEngine.load_policy authoritative schema)
    parsed_policy: Policy | None = None
    try:
        parsed_policy = Policy.model_validate(raw)
    except ValidationError as exc:
        for err in exc.errors():
            loc_parts = err.get("loc", ())
            loc_str = " -> ".join(str(p) for p in loc_parts)
            msg = err.get("msg", "Validation error")
            # Map location to line in YAML if node is available
            line, col = _find_node_line(root_node, *loc_parts)
            if line is None and loc_parts:
                line, col = _find_key_mark(root_node, str(loc_parts[0]))
            errors.append(
                PolicyFinding(
                    severity="ERROR",
                    code="SCHEMA_VALIDATION_ERROR",
                    message=f"Validation error at '{loc_str}': {msg}",
                    line=line,
                    column=col,
                )
            )
    except ValueError as exc:
        errors.append(
            PolicyFinding(
                severity="ERROR",
                code="POLICY_VALIDATION_ERROR",
                message=str(exc),
            )
        )

    if errors:
        return PolicyCheckResult(
            path=path_display,
            valid=False,
            policy=None,
            rule_count=0,
            errors=errors,
            warnings=warnings,
        )

    assert parsed_policy is not None

    # Calculate total rules
    rule_count = (
        len(parsed_policy.rules)
        + len(parsed_policy.allow_tools)
        + len(parsed_policy.deny_tools)
        + len(parsed_policy.hard_deny_tools)
        + len(parsed_policy.adapter_tools)
        + sum(len(c.arguments) for c in parsed_policy.argument_constraints.values())
        + sum(
            len(r.deny_untrusted)
            + len(r.require_known)
            + len(r.allowed_trust_classes)
            + len(r.require_transition)
            for r in parsed_policy.provenance.rules.values()
        )
    )

    # 5. Lint Checks
    _lint_policy(parsed_policy, raw, root_node, warnings)

    return PolicyCheckResult(
        path=path_display,
        valid=True,
        policy=parsed_policy,
        rule_count=rule_count,
        errors=[],
        warnings=warnings,
    )


def _lint_policy(
    policy: Policy,
    raw: dict[str, Any],
    root_node: yaml.Node | None,
    warnings: list[PolicyFinding],
) -> None:
    """Run lint checks on a valid Policy object."""

    # 1. Suspicious Wildcards
    all_declared_tools = (
        set(policy.allow_tools)
        | set(policy.deny_tools)
        | set(policy.hard_deny_tools)
        | set(policy.adapter_tools)
        | {rule.tool for rule in policy.rules}
        | set(policy.argument_constraints.keys())
        | set(policy.provenance.rules.keys())
    )
    for tool in all_declared_tools:
        if tool in {"*", ".*", "all"}:
            warnings.append(
                PolicyFinding(
                    severity="WARNING",
                    code="SUSPICIOUS_WILDCARD_TOOL",
                    message=(
                        f"Tool name '{tool}' looks like a wildcard or pattern. "
                        "Agent44 matches tool names strictly by exact string equality, not wildcard or glob."
                    ),
                )
            )

    # 2. Check duplicate tool declarations across sets (e.g. deny_tools & hard_deny_tools redundancy)
    redundant_hard_deny = set(policy.hard_deny_tools) & set(policy.deny_tools)
    if redundant_hard_deny:
        line, col = _find_key_mark(root_node, "hard_deny_tools")
        warnings.append(
            PolicyFinding(
                severity="WARNING",
                code="REDUNDANT_TOOL_DECLARATION",
                message=(
                    f"Tools listed in both 'hard_deny_tools' and 'deny_tools': {sorted(redundant_hard_deny)}. "
                    "'hard_deny_tools' has strictly higher precedence and already denies unconditionally."
                ),
                line=line,
                column=col,
            )
        )

    # 3. Unreachable / Shadowed Rules
    # Precedence:
    # 1. hard_deny_tools and hard DENY rules
    # 2. explicit deny_tools
    # 3. DENY argument rules
    # 4. allow_tools
    # 5. ALLOW argument rules
    # 6. adapter_tools
    # 7. default (default_deny)

    # Check if a rule's tool is already in hard_deny_tools or deny_tools
    for idx, rule in enumerate(policy.rules):
        rule_loc_line, rule_loc_col = _find_node_line(root_node, "rules", idx)
        if rule.tool in policy.hard_deny_tools:
            warnings.append(
                PolicyFinding(
                    severity="WARNING",
                    code="SHADOWED_RULE",
                    message=(
                        f"Rule '{rule.id}' for tool '{rule.tool}' is completely shadowed because "
                        f"'{rule.tool}' is unconditionally denied in 'hard_deny_tools'."
                    ),
                    line=rule_loc_line,
                    column=rule_loc_col,
                )
            )
        elif rule.tool in policy.deny_tools and not rule.hard:
            # An ordinary rule for a tool already in deny_tools:
            # deny_tools is evaluated BEFORE ordinary DENY rules and ALLOW rules!
            warnings.append(
                PolicyFinding(
                    severity="WARNING",
                    code="SHADOWED_RULE",
                    message=(
                        f"Rule '{rule.id}' for tool '{rule.tool}' is shadowed because "
                        f"'{rule.tool}' is already unconditionally denied in 'deny_tools'."
                    ),
                    line=rule_loc_line,
                    column=rule_loc_col,
                )
            )
        elif rule.tool in policy.allow_tools and rule.action.value == "ALLOW":
            # The tool is already in allow_tools. Since allow_tools is evaluated, wait:
            # Precedence: DENY argument rules > allow_tools > ALLOW argument rules.
            # So an ALLOW argument rule for a tool that is already in allow_tools will NEVER be reached!
            warnings.append(
                PolicyFinding(
                    severity="WARNING",
                    code="REDUNDANT_ALLOW_RULE",
                    message=(
                        f"ALLOW rule '{rule.id}' for tool '{rule.tool}' is redundant because "
                        f"'{rule.tool}' is already in 'allow_tools' (which has higher precedence)."
                    ),
                    line=rule_loc_line,
                    column=rule_loc_col,
                )
            )

    # 4. Shadowed rules among argument rules (first declared matching rule wins for the same tool)
    seen_conditions: dict[tuple[str, str, Any, bool | None], str] = {}
    for idx, rule in enumerate(policy.rules):
        cond_key = (
            rule.tool,
            rule.when.field,
            rule.when.equals,
            rule.when.field_exists,
        )
        if cond_key in seen_conditions:
            prior_rule_id = seen_conditions[cond_key]
            line, col = _find_node_line(root_node, "rules", idx)
            warnings.append(
                PolicyFinding(
                    severity="WARNING",
                    code="IDENTICAL_CONDITION_SHADOWED",
                    message=(
                        f"Rule '{rule.id}' defines an identical tool and condition as earlier rule '{prior_rule_id}'. "
                        "Because first declared rule wins within its tier, this rule will never match."
                    ),
                    line=line,
                    column=col,
                )
            )
        else:
            seen_conditions[cond_key] = rule.id

    # 5. Ineffective adapter_tools
    for tool in policy.adapter_tools:
        if tool in policy.hard_deny_tools or tool in policy.deny_tools:
            line, col = _find_key_mark(root_node, "adapter_tools")
            warnings.append(
                PolicyFinding(
                    severity="WARNING",
                    code="INEFFECTIVE_ADAPTER_TOOL",
                    message=(
                        f"Tool '{tool}' in 'adapter_tools' is also in "
                        f"{'hard_deny_tools' if tool in policy.hard_deny_tools else 'deny_tools'}. "
                        "The adapter will never be reached for this tool."
                    ),
                    line=line,
                    column=col,
                )
            )
        elif tool in policy.allow_tools:
            line, col = _find_key_mark(root_node, "adapter_tools")
            warnings.append(
                PolicyFinding(
                    severity="WARNING",
                    code="INEFFECTIVE_ADAPTER_TOOL",
                    message=(
                        f"Tool '{tool}' in 'adapter_tools' is also in 'allow_tools'. "
                        "The adapter will never be reached for this tool because allow_tools grants authorization first."
                    ),
                    line=line,
                    column=col,
                )
            )

    # 6. Unused / Missing tools in rules or argument constraints
    for tool in policy.argument_constraints:
        if tool in policy.hard_deny_tools or tool in policy.deny_tools:
            line, col = _find_key_mark(root_node, "argument_constraints")
            warnings.append(
                PolicyFinding(
                    severity="WARNING",
                    code="INEFFECTIVE_ARGUMENT_CONSTRAINTS",
                    message=(
                        f"Tool '{tool}' in 'argument_constraints' is unconditionally denied by "
                        f"{'hard_deny_tools' if tool in policy.hard_deny_tools else 'deny_tools'}."
                    ),
                    line=line,
                    column=col,
                )
            )

    # 7. Redundant default_deny configuration
    if policy.default is not None:
        pass  # already validated that default and default_deny are not both set in Policy model

    # 8. Suspicious regular expression strings in conditions
    # Note: Agent44 Condition only supports 'equals' (literal scalar equality) and 'field_exists'.
    # If a user puts regex metacharacters in 'equals', they might mistakenly assume it acts as a regex.
    for idx, rule in enumerate(policy.rules):
        if rule.when.equals is not None and isinstance(rule.when.equals, str):
            val = rule.when.equals
            if any(val.startswith(p) and val.endswith(s) for p, s in [("^", "$"), (".*", ".*")]):
                line, col = _find_node_line(root_node, "rules", idx, "when", "equals")
                warnings.append(
                    PolicyFinding(
                        severity="WARNING",
                        code="REGEX_LIKE_LITERAL_EQUALS",
                        message=(
                            f"Rule '{rule.id}' condition 'equals: {val!r}' contains regex syntax. "
                            "Agent44 conditions perform strict scalar equality matches only (no regex evaluation). "
                            "Ensure you intended an exact literal match."
                        ),
                        line=line,
                        column=col,
                    )
                )
