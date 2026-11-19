# Policy Engine

The policy engine loads a versioned YAML mapping and validates it strictly.
Its action model includes `ALLOW`, `DENY`, and internal `UNDECIDED`; the
enforced `decide()` path resolves an unresolved call before the proxy can
forward it.

## Policy configuration

The current schema accepts `version`, `name`, `default_deny` or `default`,
`allow_tools`, `deny_tools`, `hard_deny_tools`, `adapter_tools`,
`argument_constraints`, `provenance`, `delegation`, and `rules`. Unknown keys,
unsupported versions, duplicate IDs, incompatible list entries, and invalid
conditions are rejected.

An argument rule specifies a tool, `ALLOW` or `DENY` action, reason, and one
condition. The condition is either a type-strict scalar equality against a
dotted argument path or `field_exists: true`; there is no expression language.

```yaml
version: "1"
name: example-policy
default_deny: true
allow_tools: [add, echo]
deny_tools: [rm_rf]
hard_deny_tools: [shell_exec]
adapter_tools: [review_tool]
rules:
  - id: deny-echo-eval
    tool: echo
    action: DENY
    reason: "eval is not allowed"
    when:
      field: eval
      field_exists: true
```

This illustrates supported keys; adapter use also requires an adapter to be
configured at runtime. The repository's [demo policy](../evaluation/demo.yaml)
is a runnable policy for `agent44.demo_server`.

## Decision precedence

`PolicyEngine.match_rules()` applies deterministic tiers in this order:

1. `hard_deny_tools`
2. Delegated authority, only when `delegation.enforcement: required`
3. Provenance restrictions, only when `provenance.enforcement: required`
4. Configured argument constraints
5. Matching `hard: true` DENY rules, in declaration order
6. `deny_tools`
7. Matching ordinary DENY rules, first declared match wins
8. `allow_tools`
9. Matching ordinary ALLOW rules, first declared match wins
10. Adapter tier, if eligible
11. Configured default

The engine only treats hard DENY rules as a hard-rule decision tier; do not
use a hard ALLOW rule as a way to grant precedence. A deterministic denial at
any earlier tier is final and cannot be overturned by an adapter or a later
allow.

## Hard-deny behavior

`hard_deny_tools` denies a named tool before authority, provenance, argument,
allow-list, or adapter evaluation. A matching rule with `hard: true` and
`action: DENY` is evaluated before `deny_tools`, ordinary DENY rules, and
allows. Hard-deny decisions are not passed to adapters as soft rules and an
adapter cannot override them.

## Default action

`default` can be `ALLOW` or `DENY`. It cannot be combined with
`default_deny`. If `default` is omitted, `default_deny: true` yields DENY and
`default_deny: false` yields ALLOW. If neither field is specified, the engine
defaults to DENY. The `UNDECIDED` state is never an authorization.

## Adapter invocation

An adapter is considered only when all deterministic tiers return no decision
and the tool is explicitly named in `adapter_tools`. A tool that is not listed
falls through to the configured default. A listed tool with no adapter
configured is denied. Adapter input is limited to the configured tool and
eligible soft rules; model prompts use safe argument summaries rather than
raw values.

## Fail-closed behavior

- Policy load/validation errors fail startup; `--policy` does not silently
  degrade to observation-only mode.
- A policy-evaluation exception in the proxy becomes a `fail_closed` denial.
- Adapter timeout, provider error, invalid output, `UNDECIDED`, or missing
  adapter all become DENY with distinguishable rule IDs.
- If required provenance cannot be built, the proxy denies rather than
  authorizing without the required context.
- Fail-closed decisions can reduce availability. They do not prove that the
  policy is complete or that all unsafe behavior is blocked.

## Policy CLI tools

Agent44 provides a suite of command-line developer tools to initialize, validate, simulate, and diagnose policies:

| Command | Purpose | Core Question Answered |
|---|---|---|
| **`policy init`** | Create a starter policy from built-in, pre-validated templates | *How do I bootstrap a new policy?* |
| **`policy check`** | Validate syntax, Pydantic schema, and lint policies ahead of runtime | *Is this policy valid?* |
| **`policy test`** | Dry-run hypothetical tool calls without downstream execution | *What decision does this hypothetical call receive?* |
| **`policy explain`** | Inspect the step-by-step diagnostic evaluation trace | *Why did the engine reach that decision?* |

### 1. Guided policy initialization (`agent44 policy init`)

Create a valid policy using built-in, pre-validated templates:

```bash
agent44 policy init [--output PATH] [--template TEMPLATE] [--force] [--non-interactive]
```

Available templates:
- **`default-deny`**: Production-grade least-privilege policy. All undeclared tools are denied by default.
- **`restricted`**: Least-privilege policy with explicit tool allowances and argument-level inspection rules.
- **`development`**: Convenient for local development and interactive prototyping with destructive tools hard-denied. (Weaker security posture, not for production).

### 2. Policy schema validation & linting (`agent44 policy check`)

Validate structure and lint a policy ahead of runtime:

```bash
agent44 policy check [POLICY_PATH] [-q]
```

Identifies schema errors, conflicting tool lists, duplicate rules, and lint warnings before proxy startup.

### 3. Offline policy simulation (`agent44 policy test`)

Dry-run hypothetical tool calls against a policy without starting downstream MCP servers or invoking external LLMs:

```bash
agent44 policy test --policy policy.yaml --tool add --args '{"x": 1}' [--json]
```

Applies the authoritative runtime decision precedence and reports decisions, matched rules, reasons, and evaluation limitations.

### 4. Policy diagnostics & explanation (`agent44 policy explain`)

Diagnose policy evaluation step-by-step across all 11 evaluation stages:

```bash
agent44 policy explain --policy policy.yaml --tool filesystem.read_file --args '{"path": "/etc/passwd"}' [--json]
```

Traces precedence order (hard-deny, delegation, provenance, argument constraints, hard rules, deny lists, allow lists, adapter tier, default policy) and highlights where evaluation terminated. Automatically redacts sensitive fields (passwords, tokens, keys) in output.

See [Architecture](architecture.md) for how a denial affects forwarding and
[Evaluation](evaluation.md) for the scope of measured decisions.
