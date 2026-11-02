# Agent44 — Milestone 3B.1B: Metadata Contract Verification
---
### Does the MCP SDK accept that field?
### Is it preserved by the request handler?
### Does the downstream tool schema validate only the business arguments?
### If a caller includes an extra field in `arguments`, will it be rejected, ignored, or accepted?
### Is any schema modification required?
---
---
---
## 4. Verify Compatibility

### Integration test path analysis

The complete path described in the task:

1. **A normal client calls Tool A** ✅ — Works. The upstream client sends a `tools/call` request; the proxy forwards to the downstream server; the client receives the business result.

2. **The client receives the business result** ✅ — The MCP `result.content` contains the downstream tool's output.

3. **The client receives the provenance reference** ❌ — **Not implemented.** The provenance ID is recorded in the JSONL observation file but is **not included in the MCP JSON-RPC response**. The client cannot receive the provenance reference through the MCP protocol without modification.

4. **The client calls Tool B with the reference** ❌ — **Not implemented.** Even if the client knew the provenance ID, the proxy's `call_tool()` at `proxy.py:350-362` always generates new external IDs via `classify_external()`. It does not extract or validate caller-supplied reference values.

5. **The proxy validates the reference** ❌ — **Not implemented.** There is no code path that validates a caller-supplied provenance ID against the session registry during `call_tool()`. The registry's `validate_reference()` method exists (in `provenance.py:432-462`) but is never called from the proxy's request pipeline.

6. **Tool B receives unchanged business arguments** ✅ — Business arguments pass through the proxy unchanged (the proxy only pops `__agent44__correlation_id` and `__agent44__transfer` when enforcement is active).

### Missing components

| Component | Status |
|-----------|--------|
| Provenance ID in MCP response | ❌ Missing |
| Caller-supplied reference extraction | ❌ Missing (always generates new IDs) |
| Reference validation against registry | ❌ Missing |
| Cross-tool provenance tracking | ❌ Missing |

### Go/No-Go Recommendation

**B. CONTRACT IMPLEMENTABLE WITH ADDITIVE PROXY CHANGES**

The explicit provenance metadata contract is NOT genuinely implementable with the current code as-is, but it is implementable with additive proxy changes. The core MCP transport mechanism is sound — arguments pass through correctly, and the default provenance-unaware behavior is preserved.

**Required additive proxy changes:**

1. **Extract provenance references from argument values** (proxy.py:350-362): Instead of always calling `classify_external()` (which generates new IDs), check if the argument value is a non-string or structured provenance reference, and extract it accordingly. If the caller supplied a provenance ID as an argument value, capture it; otherwise generate a new external ID.

2. **Validate references against the session registry** (proxy.py:458-474): After building the provenance context, validate any caller-supplied references using `state.provenance_session.registry.validate_reference()` before passing to policy evaluation.

3. **Include provenance metadata in JSONL observations** (already internal): Ensure the observation includes the provenance ID and trust class for provenance-aware clients that access the JSONL file.

4. **Optionally include provenance in MCP response** (if needed): Add an optional mechanism to include provenance metadata in the MCP response result for provenance-aware clients, without affecting default behavior.

**Evidence for Conclusion B:**

- ✅ MCP transport works correctly for arbitrary argument fields
- ✅ Default behavior (provenance-unaware clients) is preserved and all 538 tests pass
- ✅ No SDK or protocol changes required
- ❌ Current code always generates new external IDs instead of extracting caller-supplied references
- ❌ Current code does not validate caller-supplied references against the registry
- ❌ Provenance ID is not transported in the MCP response
- ⚠️ The contract design (Approach A) is correct but the implementation gap requires proxy-side additions

The contract is implementable, but it requires the proxy to be enhanced with reference extraction and validation logic that is currently missing. No changes to the MCP SDK, tool schemas, or client adapters are required — only additive changes to the proxy's `call_tool()` provenance handling.
## 3. Verify Output Metadata Transport

### How Tool A's provenance ID reaches the caller

**Current behavior: Provenance ID is NOT included in the MCP JSON-RPC response.**

Inspecting the actual MCP response structures:

1. **Downstream result flow** (`proxy.py:581`):
   ```python
   result = await state.session.call_tool(name, forward_args)
   ```
   The downstream tool's result is returned to the upstream client as the MCP response.

2. **JSON-RPC response format** (`proxy.py:562-570` for denial, or implicit for success):
   - Success: `{"jsonrpc": "2.0", "result": {"content": [...], "isError": false}, "id": ...}`
   - Denial: `{"jsonrpc": "2.0", "result": {"content": [{"type": "text", "text": "denied"}], "isError": true}, "id": ...}`
   - In both cases, no provenance metadata fields are included

3. **JSONL observation** (`proxy.py:543-560`):
   ```python
   observe.record_observation(
       state.observer,
       context,
       started=started,
       outcome="denied",
       is_error=True,
       policy_action=decision.action.value,
       policy_rule_id=decision.rule_id,
       policy_reason=decision.reason,
       provenance_id=decision.provenance_id,
       trust_class=decision.trust_class.value,
       ...
   )
   ```
   The provenance ID is recorded in the JSONL observation file, but this is **separate from the MCP response**.

**Answers to specific questions:**

- **Is the provenance ID included in the result?** ❌ No. The MCP `result` object contains only `content` and `isError` — no provenance fields.
- **Is it included in structured content, metadata, or a separate envelope?** ❌ Not in any MCP-visible location. It exists only in the proxy's internal `provenance_context` and the JSONL observation file.
- **Can existing clients receive it without changes?** ✅ Yes — existing clients receive the business result as before; provenance information is silently dropped from the MCP response.
- **Does this require a client adapter?** ❌ For the provenance ID to be visible to the client, yes — a client adapter would need to query the JSONL observation file or the proxy's internal state. The default MCP response does not include it.
- **Does the current proxy implementation actually provide this functionality?** ❌ No. The proxy records provenance metadata internally (for its own use) but does not transport it to the caller via the MCP protocol.
## 2. Verify Reference Resolution

### Trace a provenance ID from Tool A output into Tool B input

**Current implementation behavior: ALWAYS generates new external IDs.**

The proxy code at `proxy.py:350-362` unconditionally generates new external provenance IDs, regardless of whether the caller supplied reference values:

```python
argument_references: dict[str, tuple[str, ...] | None] = {}
if state.provenance_session is not None:
    for arg_name in forward_args:
        argument_references[arg_name] = (
            state.provenance_session.registry.classify_external()
            if state.provenance_session.registry
            else None
        )
```

**Function calls and code paths:**

1. `proxy.py:358-362` — `classify_external()` generates a new UUID-based PID for each argument
2. `proxy.py:364-381` — `build_context(argument_references=...)` uses the references to build a `ProvenanceContext`
3. Since all `argument_references` values are newly generated IDs (not caller-supplied), the context contains new IDs

**What actually happens:**

| Step | Behavior |
|------|----------|
| Generate new external PID | `classify_external()` → new UUID (e.g., `pid-abc123...`) |
| Resolve existing ID from registry | **Not done** — code always generates new ID |
| Validate existing ID | **Not done** — no registry lookup of caller-supplied values |
| Preserve original trust classification | **Not possible** — original value is lost |
| Preserve parent lineage | **Not possible** — no parent IDs tracked |
| Distinguish ABSENT from UNKNOWN | **Not applicable** — always generates new ID |

**Critical finding:** The code comment says "Check if the argument contains a provenance reference; if the caller supplied a provenance_id as part of the argument metadata, we capture it here" — but the **implementation always generates new IDs** via `classify_external()`, discarding any caller-supplied values. This is a mismatch between the documented design and the actual code.

**Reference resolution verdict:** The current implementation does NOT resolve references as described in the contract. It generates new external IDs unconditionally.

**No.** The MCP transport and proxy code handle arbitrary argument fields without modification. However, the **design contract (Approach A)** specifies that provenance IDs should be included as **argument values**, not as a separate `__agent44__provenance` control field:

```json
{
  "name": "tool_b",
  "arguments": {
    "label": "pid-abc123...",  // provenance reference as argument VALUE
    "other_arg": "business_value"
  }
}
```

**Accepted and passed through** to the downstream tool. There is no rejection or ignoring of extra fields in the current proxy code. The only fields removed are `__agent44__correlation_id` and `__agent44__transfer` when delegation enforcement is active.

**The downstream tool schema is external to the proxy.** The proxy does not modify or validate the argument schema before forwarding. The downstream MCP server's tool schema determines what it accepts. The proxy forwards `forward_args` as-is (after popping the two control fields), so any extra fields present will be received by the downstream tool.

**Not stripped.** The proxy handler at `proxy.py:202` (`call_tool`) does not interpret or strip `__agent44__provenance`. It only strips `__agent44__correlation_id` and `__agent44__transfer` when delegation enforcement is active (`proxy.py:261-262`).

**Yes.** JSON-RPC 2.0 has no built-in validation of argument field names. Any extra fields in the `arguments` dict are passed through.
## 1. Verify the Actual Request Transport

### Can `__agent44__provenance` be supplied as a separate metadata field in the actual `tools/call` request?

**Answer: Yes, the MCP SDK accepts it, but it is NOT stripped before forwarding.**

- The MCP SDK (JSON-RPC 2.0 over stdio) passes through all fields in `params.arguments` to the downstream tool.
- The proxy's `CONTROL_FIELDS = frozenset({CONTROL_TRANSFER_FIELD, CONTROL_CORRELATION_FIELD})` only includes `__agent44__transfer` and `__agent44__correlation_id` — **NOT** `__agent44__provenance`.
- In `proxy.py` line 231: `forward_args: dict[str, object] = dict(arguments or {})` — all arguments are copied verbatim.
- In `proxy.py` lines 261-262, only `__agent44__correlation_id` and `__agent44__transfer` are popped when enforcement is active.
- **Result**: If a caller includes `__agent44__provenance` in the arguments dict, it passes through to the downstream tool unchanged. No schema modification is required for the field to be accepted.

**Concrete request example:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "tool_b",
    "arguments": {
      "label": "pid-abc123...",
      "other_arg": "business_value",
      "__agent44__provenance": {"label": "pid-abc123..."}
    }
  },
  "id": 1
}
```
This request would be accepted by the MCP SDK, forwarded to the downstream tool with `__agent44__provenance` included in the arguments (since it's not a controlled field), and the downstream tool would receive it as a business argument.
```

## Objective

Verify whether the approved explicit provenance metadata contract is genuinely implementable with the current MCP SDK and existing proxy code.