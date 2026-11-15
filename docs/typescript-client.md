# TypeScript Client

The checked-out `typescript/client/index.ts` implements an experimental MCP stdio client wrapper. Version `0.3.0` includes lifecycle, cancellation, state observability, complete MCP content preservation, discriminated union result typing, and async disposal improvements.

The repository's integration test launches the Python Agent44 proxy and a local deterministic MCP server.

---

## Public API & Exports

The package exports:

- **Classes & Functions:**
  - `Agent44ProxyClient`: Client class managing stdio connection, tools, and lifecycle.
  - `createAgent44ProxyClient`: Factory returning an `Agent44ProxyClient`.
  - `Agent44ClientError`: Typed error class thrown on transport, timeout, or cancellation failures.
  - `isAgent44ClientError(error: unknown)`: Type guard for `Agent44ClientError`.
- **MCP Protocol Re-exports:**
  - `Tool`: Downstream MCP tool descriptor.
  - `CallToolResult` / `MCPCallToolResult`: Raw downstream MCP tool call result shape.
- **Client Configuration & Types:**
  - `Agent44ProxyClientOptions`: Child process arguments, working directory, environment, timeouts, and state change callback.
  - `ConnectOptions`: Options for `connect({ signal })`.
  - `RequestOptions`: Options for `listTools()` and `callTool()` (`signal`, `timeoutMs`, `provenance`).
  - `ProvenanceReference`: `{ id: string; sourceTool: string }`.
  - `Agent44ClientState`: `'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'CLOSING' | 'CLOSED' | 'FAILED'`.
  - `Agent44ClientErrorCode`: Error code enum union.
  - `ToolCallResult`: Discriminated union of `SuccessfulToolCallResult` and `FailedToolCallResult`.

---

## Client Construction & Signatures

The client supports both modern two-argument and legacy four-argument signatures:

```ts
// Modern signature (Recommended):
new Agent44ProxyClient(
  stdioCommand: string,
  options?: Agent44ProxyClientOptions
)
createAgent44ProxyClient(
  stdioCommand: string,
  options?: Agent44ProxyClientOptions
)

// Legacy signature (Backward compatibility):
new Agent44ProxyClient(
  stdioCommand: string,
  stdin: NodeJS.ReadableStream,
  stdout: NodeJS.WritableStream,
  options?: Agent44ProxyClientOptions
)
createAgent44ProxyClient(
  stdioCommand: string,
  stdin: NodeJS.ReadableStream,
  stdout: NodeJS.WritableStream,
  options?: Agent44ProxyClientOptions
)
```

The underlying `StdioClientTransport` spawns `stdioCommand` with `options.args`, `options.cwd`, and `options.env`. The MCP transport owns child-process stdin/stdout streams; the retained `stdin` and `stdout` parameters are compatibility placeholders and are not used.

`connect()` initializes the MCP session; `listTools()` and `callTool()` ensure connection lazily if not already connected.

---

## Tool-Call API & Discriminated Results

`callTool<TArgs extends object>()` accepts a tool name, business arguments, and optional request options:

```ts
interface AddArgs {
  a: number;
  b: number;
}

const result = await client.callTool<AddArgs>('add', { a: 2, b: 3 });

if (result.success) {
  // result.error is narrowed to null
  console.log('Result text:', result.text);
} else {
  // result.error is narrowed to string
  console.error('Tool error:', result.error);
}
```

### Complete MCP Content Preservation

The `content` field preserves all returned MCP content blocks (text, image, embedded resources) in their original sequence without lossy transformation:

```ts
if (result.success && result.content) {
  for (const block of result.content) {
    if (block.type === 'text') {
      console.log('Text:', block.text);
    } else if (block.type === 'image') {
      console.log(`Image data (${block.mimeType})`);
    } else if (block.type === 'resource') {
      console.log('Resource URI:', block.resource.uri);
    }
  }
}
```

### Policy Denials vs. Transport Errors

- **Policy Denials (`success: false`):** When the Agent44 policy engine denies an invocation, `callTool()` resolves with a `FailedToolCallResult` containing the denial explanation in `result.error` and `result.text`.
- **Client / Transport Failures (Exceptions):** Network drops, timeouts, cancellations, malformed provenance, or calls on closed clients reject with `Agent44ClientError`.

---

## Provenance Propagation

Provenance references can be provided via `RequestOptions.provenance` or as the third argument:

```ts
const provenance = { id: 'prov-uuid-1', sourceTool: 'planner' };

// Via RequestOptions:
await client.callTool('add', { a: 1, b: 2 }, { provenance, timeoutMs: 5_000 });

// Or legacy 3rd argument:
await client.callTool('add', { a: 1, b: 2 }, provenance, { timeoutMs: 5_000 });
```

When provided, the reference is attached to the MCP request metadata as `_meta.provenanceReference`. `extractProvenance()` can extract a reference from downstream responses.

---

## Timeouts & Cancellation

- **`connectionTimeoutMs`:** Limits startup and MCP handshake (default: 30 seconds).
- **`requestTimeoutMs`:** Default timeout for `listTools()` and `callTool()` (default: 60 seconds).
- Pass `{ timeoutMs }` in `RequestOptions` to override the request default.
- Pass `{ signal }` to cancel connection wait or in-flight tool requests.
- Cancellation aborts client-side wait and emits protocol cancellation notifications where supported. It does not guarantee that the downstream tool has terminated execution.
- Connection startup wait is caller-isolated: aborting one caller's `connect()` does not cancel startup for concurrent callers.

---

## Lifecycle, Observability & Resource Teardown

- **Lifecycle states:** `DISCONNECTED -> CONNECTING -> CONNECTED -> CLOSING -> CLOSED` or `FAILED`.
- **Observing state transitions:** Pass `onStateChange: (state) => void` in client options. Initial construction state (`DISCONNECTED`) does not trigger a notification; duplicate state assignments are suppressed; listener exceptions are safely caught and ignored.
- **Cleanup:** `cleanup()` is idempotent and single-flight. In-flight calls reject with `CLIENT_CLOSED`. If transport closure rejects, state transitions to `FAILED` and subsequent `cleanup()` calls are allowed to retry.
- **Async Disposal:** Implements `[Symbol.asyncDispose]()` delegating to `cleanup()`. Native `await using` requires Node.js `>= 20.4.0` or a runtime symbol polyfill for Node.js 18.
- **Fail-closed contract:** Upon terminal failure (`FAILED`) or unexpected process exit (`SERVER_EXITED`), no automatic reconnection is attempted. Callers must instantiate a new client instance.
- **Process shutdown limitation:** `cleanup()` delegates transport shutdown to the MCP SDK's `close()` method. For stdio transports, process termination is best-effort; successful cleanup does not independently guarantee child process exit.

---

## Verification Commands

```powershell
cd typescript
npm ci
npm test                 # Reliability and type-safety unit tests
npm run typecheck        # Strict TypeScript typechecking
npm run build            # Compile package to dist/
npm run test:integration # MCP integration test with Python proxy (requires uv)
```
