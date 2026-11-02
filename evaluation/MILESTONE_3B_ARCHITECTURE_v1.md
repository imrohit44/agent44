---
## 4. Define Reference Validation States

The design must explicitly distinguish these states when a provenance reference is presented for validation:

| State | Description | Current Support | Required Action |
|---|---|---|---|
| **ABSENT** | No provenance reference was provided for this argument. | ✅ Supported | `build_context()` generates a new external ID; `effective_trust(None)` → `UNTRUSTED` |
| **VALID** | The provenance reference exists in the validating session's registry, and `effective_trust(pid)` returns a trust class. | ✅ Supported | `validate_reference()` returns `valid=True, category="known"` |
| **MALFORMED** | The reference is not a valid format (e.g., not a string, empty, wrong type). | ⚠️ Partially | Current code assumes references are strings (UUIDs). Non-string references would cause type errors. **New**: Add format validation in `validate_reference()`. |
| **UNKNOWN** | The reference is a well-formed string but does not exist in the validating session's registry. | ✅ Supported | `validate_reference()` returns `valid=False, category="unknown"`; `effective_trust(pid)` → `UNTRUSTED` |
| **WRONG_SESSION** | The reference exists in a *different* session's registry but not the current one. | ❌ Not explicitly distinguished | Currently treated as `UNKNOWN` (since `validate_reference()` only checks the current session). **New**: Add session-awareness or document that cross-session references are UNKNOWN by default. |
| **EXPIRED / REVOKED** | The reference was once valid but has been revoked or expired. | ❌ Not supported | Not currently implemented. **New**: Add optional expiry/revocation tracking if required for delegation workflows. |

### State Handling in the Policy Engine

The `_provenance_decision()` method in `policy.py` currently handles these states:

- **ABSENT** (no `provenance_id` in values): `pid is None` → `deny_untrusted` clause triggers if the argument is in the `deny_untrusted` rule; `require_known` triggers if the argument requires a known provenance ID.
- **VALID**: `effective_trust(pid)` returns `TRUSTED`, `DERIVED_UNTRUSTED`, or `UNTRUSTED` based on the record's trust class. Clauses like `deny_untrusted`, `allowed_trust_classes`, and `require_transition` act on this.
- **UNKNOWN**: `effective_trust(pid)` returns `UNTRUSTED` for any ID not in the registry. This triggers `deny_untrusted` and `require_known` clauses.
- **MALFORMED**: Not explicitly handled — would cause a type error before reaching policy logic. **Fix**: Add input validation to treat malformed references as `UNKNOWN` (fail closed).
- **WRONG_SESSION**: Treated as `UNKNOWN` since validation is per-session. **Design decision**: Should cross-session references be explicitly rejected, or silently treated as untrusted? The fail-closed default is to treat them as untrusted.
- **EXPIRED/REVOKED**: Not supported. **Design decision**: Defer to future milestone if needed for delegation workflows.

**Constraint**: Do not collapse invalid references into absent metadata. Each state must be distinguishable to the policy engine so that provenance-dependent rules can make correct decisions.

**Unresolved**: Whether `WRONG_SESSION` should be a distinct state that explicitly denies (fail-closed) or is silently treated as `UNKNOWN`. The current implementation treats it as `UNKNOWN`, which means a provenance reference from another connection is treated as untrusted rather than denied. This is fail-closed (the call can still proceed with untrusted arguments) but may not be the intended security boundary for all policy configurations.
---
---
---
---
---
## 10. Implementation Acceptance Criteria

### ✅ Acceptance Criteria
1. **Per-connection registry isolation**: Two separate proxy connections have completely independent `ProvenanceSession` registries. References from one connection are not accessible in another.
2. **Fail-closed reference validation**: Any provenance reference that cannot be validated against the receiving session's registry is treated as `UNKNOWN` → `UNTRUSTED`. No reference silently becomes trusted.
3. **No untrusted-to-trusted promotion**: `derive()` and all other provenance transformations preserve taint. The only `UNTRUSTED → TRUSTED` path is through an explicitly validated `validate_transition()`.
4. **Policy integration consistency**: The policy engine's `_provenance_decision()` correctly handles all validation states (ABSENT, VALID, UNKNOWN, MALFORMED) and never produces a decision that silently trusts invalid provenance.
5. **Observation consistency**: `observe.record_observation()` records `provenance_id`, `trust_class`, and `policy_rule_id` that accurately reflect the policy decision and provenance state, without embedding raw argument values.
6. **Existing test suite passes**: All 538 existing tests continue to pass without modification.
7. **Design document is complete**: `evaluation/MILESTONE_3B_ARCHITECTURE_v1.md` contains all 10 sections and clearly separates existing functionality from proposed functionality.

### ❌ Non-Acceptance Criteria
Any of the following would require redesign before proceeding:
- Cross-session references are silently treated as valid without registry lookup.
- `derive()` promotes `UNTRUSTED` to `TRUSTED` without a validated transition.
- The policy engine produces a decision that allows a tool call based solely on a provenance reference from another session without validation.
- The existing test suite fails (regressions introduced).
- The design document is incomplete or conflates existing and proposed functionality.

### Explicit Go/No-Go

**Go**: All 7 acceptance criteria are satisfied. The design can proceed to implementation planning for cross-tool provenance reference transport and policy integration enhancements.

**No-Go**: Any acceptance criterion is not satisfied. The design must be revised before implementation begins.
## 9. Migration Considerations

### Existing Functionality Preserved
- All 538 existing tests continue to pass without modification.
- The `ProvenanceSession`/`ProvenanceRegistry`/`ProvenanceContext` API remains unchanged.
- The `derive()`, `classify_external()`, `validate_transition()` functions behave identically.
- Policy enforcement with `enforcement="required"` and `enforcement="off"` continues to work as before.
- The `test_provenance_denial_never_reaches_downstream` test continues to pass.

### No Production Code Changes Required
- The provenance implementation in `src/agent44/provenance.py` is unchanged.
- The proxy provenance integration in `src/agent44/proxy.py` is unchanged.
- The policy engine provenance integration in `src/agent44/policy.py` is unchanged.
- The design is additive: new capabilities are documented and can be implemented in future milestones without breaking existing functionality.

### Opt-In Nature
- Cross-tool provenance propagation is **opt-in**: the caller must explicitly include provenance IDs in tool call arguments. The default behavior (no provenance IDs) remains the same as today — new external IDs are generated, and policy evaluates them as `UNTRUSTED`.
- Existing policies without provenance rules are unaffected.
- Existing tests continue to pass.

### Future Migration Path
When cross-tool propagation is needed:
1. Caller includes `provenance_id` in Tool A's argument metadata.
2. Proxy extracts and validates the reference.
3. Downstream Tool B request includes the provenance ID as an argument reference.
4. Receiving proxy validates against its session registry.
5. Policy engine evaluates `deny_untrusted`, `require_known`, etc. based on the validated trust class.
## 8. Required Tests

### A. Registry Ownership Tests
1. **Per-connection isolation**: Two separate proxy connections should have independent `ProvenanceSession` registries. A reference created in Connection 1 should be `UNKNOWN` in Connection 2.
2. **Per-call policy registry**: Verify that the policy-driven registry is fresh each `call_tool()` and does not persist.
3. **Registry accumulation**: Within a single connection, multiple tool calls should accumulate records in the session's registry (each `classify_external()` generates a new ID).

### B. Reference Transport Tests
1. **Explicit metadata passthrough**: Test that including a `provenance_id` argument value results in the proxy extracting and validating it.
2. **Absent reference**: Test that omitting a `provenance_id` results in a new external ID being generated and the policy evaluating it as `UNTRUSTED`.
3. **Cross-connection reference**: Test that a provenance reference from Connection 1 is `UNKNOWN`/`UNTRUSTED` in Connection 2 (no automatic forwarding).

### C. Trust Boundary Tests
1. **Same-session reference validation**: Test that a reference created in the same session is `VALID` and trust class is correctly evaluated.
2. **Cross-session reference rejection**: Test that a reference from another session is treated as `UNKNOWN` → `UNTRUSTED`.
3. **Derive taint propagation**: Test that `derive()` with untrusted/mixed/unknown parents preserves `DERIVED_UNTRUSTED`.

### D. Validation State Tests
1. **ABSENT state**: Test that no provenance ID → `effective_trust(None)` → `UNTRUSTED`; `require_known` clause triggers DENY.
2. **MALFORMED state**: Test that a non-string/non-valid reference is handled gracefully (not a crash) and treated as `UNKNOWN`.
3. **WRONG_SESSION state**: Test that a reference from another connection is distinguishable from an absent reference.

### E. Policy Integration Tests
1. **deny_untrusted with present but untrusted provenance**: Test that a `deny_untrusted: [label]` rule denies when `label`'s provenance ID is in the registry but has `UNTRUSTED` trust class.
2. **deny_untrusted with absent provenance**: Test that a `deny_untrusted: [label]` rule denies when no provenance ID is provided for `label`.
3. **require_known with missing provenance**: Test that a `require_known: [label]` rule denies when no provenance ID is provided.
4. **Cross-provenance policy decision**: Test that a tool call with a forwarded provenance reference from Tool A results in the correct policy decision in Tool B's context.

### F. End-to-End Cross-Tool Tests
1. **Tool A → Tool B with provenance reference**: Set up a proxy connection where Tool A's output carries a provenance reference, and Tool B's request includes that reference. Verify the policy engine evaluates it correctly.
2. **Denial prevents downstream**: Verify that a provenance-based DENY in Tool A's policy prevents the downstream server from executing (similar to `test_provenance_denial_never_reaches_downstream` but across tools).
3. **Trusted propagation preservation**: Verify that a `TRUSTED` parent's trust class is preserved (not elevated) when derived in Tool B.
## 7. Required Deliverable: `evaluation/MILESTONE_3B_ARCHITECTURE_v1.md`

*(This document contains all sections 1-10 from the architecture design.)*
## 3. Define the Trust Boundary

### Comparing Approaches

| Approach | Authenticity | Integrity | Replay Resistance | Session Isolation | Multi-Parent Lineage | Revocation/Expiry | Complexity |
|---|---|---|---|---|---|---|---|
| **A. Same-session reference validation** | ✅ High | ✅ High | ❌ None | ✅ Per-connection isolation | ✅ Parents validated against session registry | ❌ None | ✅ Low |
| **B. Cross-session signed provenance tokens** | ✅ High | ✅ High | ✅ Yes | ✅ Can be designed per-connection | ✅ Parents referenced by ID | ✅ Yes | ❌ High |
| **C. Trusted gateway-mediated provenance exchange** | ✅ High | ✅ High | ✅ Yes | ✅ Gateway enforces isolation | ✅ Gateway tracks parent chain | ✅ Yes | ❌ Very High |
| **D. Hybrid: session registry + signed tokens for cross-connection** | ✅ High | ✅ High | ✅ Yes | ✅ Session isolation + cross-connection auth | ✅ Parents validated in originating session | ✅ Yes | ❌ Medium |

### Recommendation: Approach D — Hybrid

**Design**: Same-session reference validation (Approach A) for within-connection provenance tracking. For cross-connection reference forwarding (Tool A in Connection 1 → Tool B in Connection 2), use signed provenance tokens (Approach B) where the originating session signs the reference with a process-local key, and the receiving session validates the signature.

**Why**:
- Preserves the existing low-complexity same-session model for the common case
- Adds cross-connection capability only when needed (future-proofing)
- Maintains fail-closed behavior: if a signature can't be validated, the reference is treated as unknown → `UNTRUSTED`
- No new runtime dependencies (signing can use the existing UUID-based ID scheme with a HMAC key shared within the process)
- Allows gradual adoption: start with Approach A, add Approach B when cross-connection propagation is needed

**Unresolved for v1**: Whether to implement the signed-token infrastructure in Milestone 3B or defer it to 3C. The design recommendation is to start with Approach A (same-session only) and document Approach D as the path for cross-connection propagation.

**Do not describe UUID unpredictability as authentication** — the security comes from registry lookup/validation, not from ID guessing.
---
## 2. Define Reference Transport

### How a Provenance Reference Travels from Tool A to Tool B

| Step | Description | Code Reference |
|---|---|---|
| **Reference creation** | During Tool A's `call_tool()`, `build_context()` generates provenance IDs for each argument via `classify_external()` (if no reference supplied) or uses the caller-supplied reference. These IDs are stored in `ProvenanceContext.values`. | proxy.py lines 356-377 |
| **Association with output** | The provenance ID for each argument is recorded in the `ProvenanceContext`, which is passed to `observe.record_observation()` and used by the policy engine for `deny_untrusted`, `require_known`, `allowed_trust_classes`, and `require_transition` evaluation. | proxy.py lines 377-393; policy.py `_provenance_decision()` |
| **Caller/adaptation receipt** | The upstream caller or adapter receives the provenance ID as part of the tool call response metadata (in the observation recorded by `JsonlObserver`). The observation includes `provenance_id`, `trust_class`, and `policy_rule_id` as safe metadata (never raw argument values). | observe.py; test_provenance_policy.py event assertions |
| **Attachment to Tool B's request** | When the caller re-invokes the proxy with Tool B's request, the provenance ID can be included in the argument metadata. The upstream client decides what to pass; the proxy extracts it from the argument metadata during `call_tool()`. | Design choice — not automatically forwarded by MCP protocol |
| **Receiving proxy extraction** | The proxy extracts the provenance ID from the argument metadata forwarded to Tool B. If the argument contains a `provenance_id` field, it is captured as part of `argument_references`. If not, a new external ID is generated via `classify_external()`. | proxy.py lines 356-368 (argument_references construction) |
| **Validation** | The receiving proxy's session registry validates the reference via `validate_reference()` or checks trust via `effective_trust()`. If the reference exists in the registry, it's `VALID`; otherwise `UNKNOWN` → `UNTRUSTED`. | provenance.py `validate_reference()`; policy.py `effective_trust()` |
| **Parent-child preservation** | The provenance ID from Tool A's output is treated as a parent reference for Tool B's derived records. When Tool B calls `derive((parent_pid,))`, the parent record must exist in the registry for trust propagation; if not, the parent is treated as `None` → `DERIVED_UNTRUSTED`. | provenance.py `derive()` — unknown parents taint the result |

### Critical Design Note
The MCP protocol does NOT automatically forward provenance references. The reference transport is **explicit and application-level**: the upstream client must include provenance IDs in the tool call arguments, and the proxy must explicitly extract and validate them. The `ProvenanceContext` does NOT travel through JSON-RPC as a first-class citizen; only the provenance IDs (strings) are passed as argument metadata.

### Two Transport Approaches

| Approach | Mechanism | Pros | Cons |
|---|---|---|---|
| **A. Explicit metadata passthrough** | Upstream client includes `provenance_id` as argument value; proxy extracts and validates. | Simple; no protocol changes; transparent. | Requires caller knowledge; not automatic; fragile if argument schema changes. |
| **B. Dedicated provenance channel** | Separate field/argument `__agent44__provenance_id` carries the reference; proxy strips it before forwarding. | Explicit; separable from business data; can be versioned. | Requires argument schema change; additional parsing logic. |

**Design Recommendation**: Use **Approach A** for Milestone 3B — include provenance IDs as explicit argument values when the caller intends cross-tool reference tracking. The proxy extracts them; if present, validates against the session registry. If absent, generates a new external ID (fail-closed). This avoids protocol changes while providing the mechanism when needed.

**Unresolved**: Whether to support automatic provenance ID propagation from downstream tool results (i.e., the proxy automatically captures the `provenance_id` from a Tool A result and includes it as an argument reference for Tool B). This would require observing the downstream result's provenance record, which is not currently implemented.
---
## 1. Resolve Registry Ownership

| Component | Ownership | Lifecycle | Scope |
|---|---|---|---|
| `ProvenanceSession` | **Per connection** | Created once in `build_server` lifespan, passed to `ProxyState`, held for the entire connection lifetime | One per MCP connection (stdio link between upstream client and proxy) |
| `ProvenanceRegistry` (owned by `ProvenanceSession`) | **Per connection** | Created in `ProvenanceSession.__init__()`, held for the connection lifetime, accumulates records as `classify_external()` is called | Shared across all tool calls within the same proxy connection |
| `ProvenanceRegistry` (policy-driven, created in `call_tool`) | **Per call** | Created fresh each `call_tool()` invocation, used only for policy evaluation, then discarded | Per-tool-call; does not persist beyond the call |

### Clarification of the "Contradiction"
The apparent contradiction in the audit report is resolved:
- **Finding**: "No unintended registry sharing: Each tool call creates a fresh `ProvenanceRegistry()`; the `ProvenanceSession` registry is per-call, not shared across calls"
- **Reality**: The **policy-driven** registry IS created fresh per call (lines 330-350 in proxy.py). The **session-driven** registry (owned by `ProvenanceSession`) is created once per connection and **IS shared** across tool calls within that connection. Each call to `classify_external()` on the session's registry generates a new UUID-based provenance ID, so the registry accumulates records across calls.

### Correct Ownership Model
- **`ProvenanceSession`**: One per proxy connection (established via `build_server` lifespan). Holds a single `ProvenanceRegistry` that accumulates provenance records across all tool calls within that connection.
- **Per-call policy registry**: A separate `ProvenanceRegistry` created fresh in each `call_tool()` invocation for policy evaluation. This is temporary and discarded after the decision is made.
- **Cross-connection isolation**: Different proxy connections have independent `ProvenanceSession` instances with independent registries. References from one connection's session are **unknown** in another connection's session (treated as untrusted via `effective_trust()` → `UNTRUSTED`).

**Design Decision**: Preserve the per-connection model. Cross-tool provenance propagation must operate within this model: a provenance reference generated in Tool A's call within Connection 1 can be forwarded to Tool B in the same or a different connection, but the receiving side will validate the reference against its own session's registry. If the reference was never created in that session's registry, it is treated as unknown/untrusted — which is the correct fail-closed behavior.

**Unresolved**: Whether cross-connection reference validation should include a signed-token mechanism (see Section 3) or rely on per-session registry lookup only.
---
## 5. Define Trust Propagation

### How Trust is Calculated in Tool B

| Scenario | Trust Calculation | Taint Preservation |
|---|---|---|
| **Tool B receives one untrusted parent** | `derive((untrusted_pid,))` → `DERIVED_UNTRUSTED` | ✅ Taint preserved; result is `DERIVED_UNTRUSTED`, not `TRUSTED` |
| **Tool B receives multiple parents with mixed trust** | `derive((trusted_pid, untrusted_pid))` → `DERIVED_UNTRUSTED` (any untrusted parent taints the result) | ✅ Taint retained; the `test_combining_trusted_and_untrusted_retains_taint` test verifies both parent IDs are recorded and the result is `DERIVED_UNTRUSTED` |
| **Tool B receives an unknown reference** | `derive((unknown_pid,))` → `DERIVED_UNTRUSTED` (unknown parent treated as `None` → untrusted taint) | ✅ Taint preserved; unknown → untrusted propagation |
| **Tool B receives a valid reference from another session** | If the reference exists in Tool B's session registry: trust class from the record. If not: `effective_trust()` → `UNTRUSTED` → `DERIVED_UNTRUSTED` when derived from. | ✅ Depends on whether the reference was forwarded and validated. If forwarded and validated → trust class from record. If not forwarded → unknown → untrusted. |
| **Tool B derives a new output from previously tracked data** | `derive((tracked_pid,))` → trust class preserved from parent. If parent is `TRUSTED` → derived is `TRUSTED` (preservation, not elevation). If parent is `UNTRUSTED` → derived is `DERIVED_UNTRUSTED`. | ✅ Taint always preserved; no `UNTRUSTED → TRUSTED` promotion without `validate_transition()` |

### Key Principle: No Untrusted-to-Trust Promotion

The fundamental trust propagation rule is: **`derive()` never elevates trust**. The only path from `UNTRUSTED` to `TRUSTED` is `validate_transition(untrusted_pid, "sanitize_pii")` or another explicitly named transition. All other transformations (derive, classify_external, policy evaluation) preserve or propagate taint.

**Design guarantees**:
- `derive()` with any untrusted parent → `DERIVED_UNTRUSTED`
- `derive()` with all-trusted parents → `TRUSTED` (preservation)
- `derive()` with unknown parent → `DERIVED_UNTRUSTED` (unknown treated as untrusted)
- `effective_trust(None)` → `UNTRUSTED`; `effective_trust(unknown_id)` → `UNTRUSTED`
- No API call or transformation can promote `UNTRUSTED` to `TRUSTED` without a validated transition record

**Unresolved**: What happens when Tool B receives a provenance ID that was valid in Tool A's session but is unknown in Tool B's session. The design must decide: (a) treat it as `UNTRUSTED` (fail-closed, conservative), or (b) attempt some cross-session validation (more complex, requires signed tokens or gateway mediation). The recommended approach for v1 is (a).
# Agent44 - Milestone 3B.0: Cross-Tool Provenance Architecture Design

---
## 6. Define Policy Integration

### What the Policy Engine Receives

The `PolicyEngine.match_rules()` method receives the following provenance-related inputs:

```python
def match_rules(
    self,
    tool_name: str,
    arguments: dict[str, Any] | None,
    provenance_context: ProvenanceContext | None = None,
    delegation_context: DelegationContext | None = None,
) -> Decision | None:
```

**Provenance metadata supplied by the proxy**:

| Field | Source | Description |
|---|---|---|
| `provenance_context` | Proxy's `call_tool()` | `ProvenanceContext` built from `argument_references` using the session's registry. Contains `values` dict mapping argument names to provenance IDs, and a reference to the registry. |
| `provenance_id` (per-argument) | Proxy's `call_tool()` | Extracted from `provenance_context.values[argument_name]` for each argument in the policy rule's scope. |
| `trust_class` (per-argument) | Computed from registry | `registry.effective_trust(provenance_id)` → `TrustClass.UNTRUSTED`, `TRUSTED`, or `DERIVED_UNTRUSTED`. |
| `validation_transition` (per-argument) | Computed from registry | `record.validation_transition` if the provenance ID exists in the registry and has a transition; otherwise `None`. |
| `policy_rule_id` (per-argument) | Computed from decision | `f"provenance:{tool_name}:{category}:{argument_name}"` when a provenance-dependent rule matches. |

**Provenance metadata MUST remain separate from ordinary MCP tool arguments**:

The proxy strips control fields (`__agent44__transfer`, `__agent44__correlation_id`) before forwarding business arguments to the downstream server. Similarly, provenance IDs are extracted from the argument metadata for policy evaluation but are **not** forwarded as business arguments to the downstream server. The downstream tool receives only the business argument values, without provenance metadata embedded.

**How invalid evidence is handled without bypassing provenance-dependent rules**:

| Invalid State | Policy Treatment | Effect on Downstream Execution |
|---|---|---|
| **ABSENT** (no `provenance_id`) | `deny_untrusted` clause triggers if argument is listed; `require_known` triggers if argument requires known provenance | **DENY** if clause matches; otherwise proceeds with other tiers |
| **MALFORMED** | Treated as `UNKNOWN` (fail closed) | **DENY** for provenance-dependent rules; call may still proceed if other non-provenance rules allow |
| **UNKNOWN** (reference not in registry) | `deny_untrusted` triggers (trust class is `UNTRUSTED`); `require_known` triggers | **DENY** for this tool call; downstream server never invoked |
| **VALID (untrusted)** | `deny_untrusted` triggers (trust class is `UNTRUSTED`); `allowed_trust_classes` may or may not match | **DENY** if `deny_untrusted` matches; otherwise may proceed with other rules |
| **VALID (trusted)** | `deny_untrusted` does NOT trigger; `allowed_trust_classes` may allow; `require_transition` may trigger | **ALLOW** if no other denial clauses match; downstream server invoked |

**Critical design guarantee**: A missing, unknown, or malformed provenance reference **never** silently becomes trusted. The policy engine always evaluates to either `DENY` or proceeds to lower tiers (argument constraints, allow_tools, etc.), but the provenance state itself never grants authority.

**Unresolved**: When `enforcement="off"`, the provenance tier is skipped entirely and legacy behavior prevails. The design must ensure that turning enforcement off does not inadvertently make provenance-dependent rules moot — they are simply not evaluated, and the remaining tiers decide the call. This is already handled in `_provenance_decision()`: `if provenance.enforcement != "required": return None`.& --- 
