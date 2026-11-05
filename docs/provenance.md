# Provenance

The Python provenance module provides bounded, in-memory records describing
where values originated, their trust class, and derivation lineage. It is
important to distinguish those data-model operations from full
cross-component MCP propagation: the current TypeScript `_meta` field is not
consumed by the Python proxy.

## Trust classifications

`TrustClass` defines:

- `trusted`: value classified at an explicit trusted boundary or by an
  authorized validation transition.
- `untrusted`: external data at an input boundary.
- `derived_untrusted`: a value derived from any untrusted, derived-untrusted,
  missing, or unknown parent.

Caller-supplied fields such as `{"trusted": true}` are ordinary arguments, not
proof of trust. Unknown IDs resolve to untrusted. Registry records and lineage
are bounded (defaults: 10,000 records, depth 16, and 8 parents).

## Registration and reference validation

`ProvenanceRegistry.classify_external()` creates a new Agent44-generated ID
with untrusted classification. `classify_trusted()` creates a trusted record
for an explicitly trusted boundary and is intended for Agent44 or an
authorized validator, not arbitrary callers.

`ProvenanceSession.validate_reference(id)` checks whether an ID exists in that
session's registry and returns a validation result. Unknown references are
rejected and logged as a local audit event. The proxy owns a
`ProvenanceSession` for the lifetime of an MCP connection, but the proxy's
current request path does not call `validate_reference()` for the TypeScript
metadata field described below.

## `_meta.provenanceReference`

The TypeScript client currently constructs this metadata shape when a reference
is supplied:

```json
{
  "provenanceReference": {
    "id": "agent44-generated-id",
    "sourceTool": "upstream-tool"
  }
}
```

It places the object under the MCP tool-call `_meta` field and looks for the
same shape in a response's `_meta`. The Python proxy forwards a
dictionary-valued `_meta.provenanceReference` to the downstream MCP server and
preserves downstream response metadata. The TypeScript-to-proxy-to-fixture
round-trip is verified by the local integration test.

This is metadata transport only. The proxy does not validate the reference
against its provenance registry, attach it to a provenance context, or use it
as policy evidence. The metadata contract is therefore not an end-to-end
provenance enforcement mechanism.

## Legacy argument-value mechanism

The Python proxy has a legacy compatibility path that examines each business
argument: a non-empty string is treated as a candidate provenance ID; other
values receive a newly generated external reference. Unknown candidate IDs
are not trusted. When provenance enforcement is required, the policy uses the
resulting context and missing/unknown provenance cannot satisfy a trust
requirement.

This mechanism does not distinguish an ordinary string business value from an
encoded reference. It is not equivalent to a dedicated `_meta` contract and
should not be interpreted as general-purpose provenance propagation.

## Lineage: `derive()` and `validate_transition()`

`ProvenanceRegistry.derive(parent_ids)` creates a child record. The result is
`trusted` only if all parents are known and trusted; otherwise it is
`derived_untrusted`. Unknown parents are treated as untrusted, and configured
record/depth/parent bounds are enforced.

`validate_transition(provenance_id, transition_id, ...)` creates a new trusted
record with the source as its parent and records the explicit transition ID,
boundary, and optional permitted use. This is the only registry operation
that elevates untrusted or derived-untrusted input. The original source and
other derivatives remain unchanged.

## Session boundaries and cross-call transfer

The proxy creates one `ProvenanceSession` per MCP connection. For provenance
policy enforcement, it also constructs a fresh `ProvenanceRegistry` for a
tool call, so ordinary lineage does not silently carry across calls.

There is a separate bounded transfer mechanism in `agent44.transfer`. It is
activated only when delegation enforcement is explicitly `required`; transfer
handles are checked against trusted workflow state and are bounded and
single-use. It is not implicit cross-session provenance and does not make
arbitrary caller references trusted.

## Current status

Python trust classification, derivation, transitions, validation, and
policy-context code have unit tests. However, the proxy does not implement the
TypeScript client's `_meta.provenanceReference` ingress/egress flow. The
TypeScript demo and runtime integration are also not currently verified. See
[TypeScript Client](typescript-client.md) and
[Development](development.md).
