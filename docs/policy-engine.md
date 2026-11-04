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

See [Architecture](architecture.md) for how a denial affects forwarding and
[Evaluation](evaluation.md) for the scope of measured decisions.
