"""Built-in policy templates for Agent44 policy initialization (Phase 12.1.3)."""

from __future__ import annotations

from typing import NamedTuple


class PolicyTemplate(NamedTuple):
    id: str
    name: str
    description: str
    content: str


DEFAULT_DENY_TEMPLATE = """# Agent44 Policy: default-deny
# Production-grade least-privilege policy.
# Follows zero-trust: all undeclared tools are denied by default.

version: "1"
name: production-default-deny
default_deny: true

# Explicit list of permitted tools
allow_tools:
  - read_file
  - search_docs
  - calculate

# Explicit list of prohibited tools
deny_tools:
  - execute_command
  - delete_file
"""

RESTRICTED_TEMPLATE = """# Agent44 Policy: restricted
# Production policy with tool allowances and argument-level inspection rules.
# Evaluates arguments and blocks sensitive parameters.

version: "1"
name: production-restricted
default_deny: true

# Explicitly authorized tools
allow_tools:
  - fetch_url
  - view_log

# Tool-level prohibitions
deny_tools:
  - execute_script
  - write_file

# Argument-level inspection rules
rules:
  - id: deny-internal-host
    tool: fetch_url
    action: DENY
    reason: "access to internal metadata service is blocked"
    when:
      field: host
      equals: "169.254.169.254"

  - id: deny-raw-query
    tool: view_log
    action: DENY
    reason: "raw query execution is not permitted on logs"
    when:
      field: raw_query
      field_exists: true
"""

DEVELOPMENT_TEMPLATE = """# Agent44 Policy: development
# Intended for local development and interactive prototyping only.
# WARNING: Weaker security posture. default_deny is false, but critical
# destructive tools are hard-denied to prevent accidental damage.
# DO NOT USE IN PRODUCTION.

version: "1"
name: local-development
default_deny: false

# Hard-deny critical destructive actions even in development
hard_deny_tools:
  - rm_rf
  - drop_database
  - system_shutdown

# Additional dangerous operations denied during development
deny_tools:
  - modify_system_config
  - purge_audit_logs

# Block dangerous flags during local tool execution
rules:
  - id: block-force-flag
    tool: execute_tool
    action: DENY
    reason: "force execution flag prohibited during development"
    when:
      field: force
      equals: true
"""

TEMPLATES: dict[str, PolicyTemplate] = {
    "default-deny": PolicyTemplate(
        id="default-deny",
        name="Default Deny (Production)",
        description="Production-grade least-privilege template. All undeclared tools are denied by default.",
        content=DEFAULT_DENY_TEMPLATE,
    ),
    "restricted": PolicyTemplate(
        id="restricted",
        name="Restricted (Argument Constraints)",
        description="Allows explicitly declared tools with parameter-level inspection and constraints.",
        content=RESTRICTED_TEMPLATE,
    ),
    "development": PolicyTemplate(
        id="development",
        name="Development (Local Experimentation)",
        description="Convenient for local prototyping with destructive operations hard-denied. Weaker security posture.",
        content=DEVELOPMENT_TEMPLATE,
    ),
}

TEMPLATE_ALIASES: dict[str, str] = {
    "default_deny": "default-deny",
    "prod": "default-deny",
    "production": "default-deny",
    "dev": "development",
}


def get_template(name: str) -> PolicyTemplate | None:
    """Resolve a template by name or alias."""
    key = name.strip().lower()
    canonical = TEMPLATE_ALIASES.get(key, key)
    return TEMPLATES.get(canonical)
