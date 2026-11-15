# Agent44 TypeScript Client

The Agent44 TypeScript Client (`@imrohit44/agent44-ts-client`) is an ESM client library for interacting with Model Context Protocol (MCP) servers and the Agent44 proxy over stdio. It provides typed tool invocation, provenance metadata propagation, configurable timeouts, cancellation support, state observability, async disposal, and a strict fail-closed lifecycle.

**Release status:** Candidate version `v0.4.0` prepared. Version `v0.3.0` is the preceding published npm release. The API remains under active evolution as an experimental developer interface.

---

## Requirements

- **Node.js:** `>=18.0.0`
- **Module format:** ESM-only (`"type": "module"` in `package.json`)
- **TypeScript (optional):** TypeScript `>=5.0` recommended (TypeScript `>=5.2` for native `await using` syntax). For strict TypeScript consumers (`skipLibCheck: false`), `@types/node` is recommended in `devDependencies` to provide ambient Node.js stream declarations.

---

## Installation

```sh
npm install @imrohit44/agent44-ts-client
```

To pin the exact version:

```sh
npm install @imrohit44/agent44-ts-client@0.4.0
```

---

## Quick Start

```ts
import { createAgent44ProxyClient } from '@imrohit44/agent44-ts-client';

// 1. Initialize client using the modern two-argument factory
const client = createAgent44ProxyClient('python', {
  args: [
    '-m', 'agent44.proxy',
    '--policy', 'evaluation/demo.yaml',
    '--',
    'python', '-m', 'agent44.demo_server',
  ],
  cwd: process.cwd(),
  connectionTimeoutMs: 10_000,
  requestTimeoutMs: 30_000,
});

try {
  // 2. Connect to the MCP server process
  await client.connect();

  // 3. Discover available tools
  const tools = await client.listTools();
  console.log(`Discovered ${tools.length} tool(s)`);

  // 4. Invoke a tool with type-safe parameters
  interface AddArgs {
    a: number;
    b: number;
  }

  const result = await client.callTool<AddArgs>('add', { a: 2, b: 3 });

  // 5. Inspect result using discriminated union
  if (result.success) {
    console.log('Result text:', result.text);
  } else {
    console.error('Tool call failed:', result.error);
  }
} finally {
  // 6. Explicitly clean up resources
  await client.cleanup();
}
```

---

## Client Initialization & Signatures

### Modern Signatures (Recommended)

Both the factory function and class constructor support direct command and options configuration:

```ts
import {
  Agent44ProxyClient,
  createAgent44ProxyClient,
  type Agent44ProxyClientOptions,
} from '@imrohit44/agent44-ts-client';

const options: Agent44ProxyClientOptions = {
  args: ['-m', 'agent44.proxy', '--', 'my-mcp-server'],
  cwd: process.cwd(),
  env: process.env, // Automatically strips undefined values safely
  connectionTimeoutMs: 15_000,
  requestTimeoutMs: 30_000,
  onStateChange: (state) => console.log('State:', state),
};

// Factory:
const client = createAgent44ProxyClient('python', options);

// Or Constructor:
const clientInstance = new Agent44ProxyClient('python', options);
```

### Legacy Signatures (Backward Compatibility)

The legacy four-argument constructor and factory are preserved for existing integrations:

```ts
const legacyClient = createAgent44ProxyClient(
  'python',
  process.stdin,
  process.stdout,
  options,
);
```

> [!NOTE]
> The `stdin` and `stdout` arguments in the legacy signature are ignored by the implementation. The underlying MCP `StdioClientTransport` manages child-process spawning and stdio stream pipes directly.

---

## Tool Invocation & Results

### Generic Tool Arguments

`callTool<TArgs extends object>()` accepts ordinary user-defined interfaces without requiring explicit index signatures:

```ts
interface SearchArgs {
  query: string;
  limit?: number;
}

const result = await client.callTool<SearchArgs>('search', {
  query: 'Agent44 policy engine',
  limit: 5,
});
```

### Result Discriminated Union

`ToolCallResult` is a discriminated union on `success`:

- **When `result.success === true`:**
  - `result.error` is narrowed to `null`.
  - `result.text` is `string | null` (the first text block, if any).
  - `result.content` contains all MCP content blocks returned by the server.
  - `result.provenance` contains any extracted provenance metadata.
- **When `result.success === false`:**
  - `result.error` is narrowed to `string`.
  - `result.text` is `string | null`.
  - `result.content` preserves any content blocks returned with the error response.

```ts
const result = await client.callTool('add', { a: 1, b: 2 });

if (result.success) {
  // TypeScript knows result.error is null
  console.log('Success:', result.text);
} else {
  // TypeScript knows result.error is string
  console.error('Failed:', result.error);
}
```

### Complete MCP Content Access

The `content` property preserves the complete array of MCP content blocks (text, images, embedded resources, etc.) in their original order without lossy conversion:

```ts
const result = await client.callTool('render_chart', { dataset: 'q3_sales' });

if (result.success && result.content) {
  for (const block of result.content) {
    if (block.type === 'text') {
      console.log('Description:', block.text);
    } else if (block.type === 'image') {
      console.log(`Image (${block.mimeType}): ${block.data.length} base64 chars`);
    } else if (block.type === 'resource') {
      console.log('Embedded resource URI:', block.resource.uri);
    }
  }
}
```

### Policy Denials vs. Transport Errors

It is essential to distinguish between policy denials and transport/client errors:

1. **Policy Denials (`success: false`):**
   When the Agent44 proxy denies a tool call due to policy violation (or when downstream tools return an MCP error), `callTool()` does **not** throw. Instead, it returns a `FailedToolCallResult`:
   ```ts
   const result = await client.callTool('restricted_tool', {});
   if (!result.success) {
     console.log(result.error); // "Agent44 policy denial: rule deny-eval violated"
   }
   ```
2. **Client and Transport Errors (Rejected Promises):**
   Network errors, connection timeouts, request timeouts, cancellations, malformed provenance, or calls on a closed client reject with `Agent44ClientError`:
   ```ts
   try {
     await client.callTool('search', { query: 'test' });
   } catch (error) {
     if (isAgent44ClientError(error)) {
       console.error(`Client error [${error.code}]:`, error.message);
     }
   }
   ```

### Provenance Propagation

When invoking tools through Agent44, you can propagate provenance tracking either via `RequestOptions` or as a distinct argument:

```ts
import type { ProvenanceReference } from '@imrohit44/agent44-ts-client';

const provenance: ProvenanceReference = {
  id: 'prov-uuid-9876',
  sourceTool: 'planner',
};

// Option A: Inside RequestOptions (Modern)
await client.callTool('add', { a: 1, b: 2 }, {
  provenance,
  timeoutMs: 5_000,
});

// Option B: As third argument (Legacy)
await client.callTool('add', { a: 1, b: 2 }, provenance, {
  timeoutMs: 5_000,
});
```

`extractProvenance()` is also available to parse references from raw MCP responses:

```ts
const ref = client.extractProvenance(rawResponse);
```

---

## Configuration & Timeouts

### Timeouts

- **`connectionTimeoutMs`:** Limits MCP connection startup and initialization handshake. Default: `30_000` ms (30 seconds).
- **`requestTimeoutMs`:** Default timeout applied to `listTools()` and `callTool()` requests. Default: `60_000` ms (60 seconds).
- **Per-request timeout override:** Pass `timeoutMs` in request options to override `requestTimeoutMs`:
  ```ts
  await client.callTool('slow_tool', {}, { timeoutMs: 120_000 });
  ```

Timeout values must be finite numbers greater than zero; non-positive or non-finite values throw an immediate `Agent44ClientError` with code `'REQUEST_FAILED'`.

> [!IMPORTANT]
> **Environment variable defaults:** The SDK does not currently read environment variables (such as `AGENT44_CONNECTION_TIMEOUT_MS`) automatically. Timeout configurations must be passed explicitly via options.

### Environment Variable Sanitization

`options.env` accepts `Record<string, string | undefined>`, making it safe to pass Node's `process.env`. The SDK strips keys with `undefined` values before forwarding to the transport without mutating `process.env` or caller-provided objects.

---

## Cancellation with `AbortSignal`

Cancellation is supported on `connect()`, `listTools()`, and `callTool()`:

```ts
const controller = new AbortController();

setTimeout(() => controller.abort(new Error('User cancelled operation')), 2_000);

try {
  await client.callTool('heavy_task', {}, { signal: controller.signal });
} catch (error) {
  if (isAgent44ClientError(error) && error.code === 'REQUEST_CANCELLED') {
    console.log('Tool call cancelled successfully');
  }
}
```

### Cancellation Guarantees & Limitations

- **Client-side cancellation:** Aborting an `AbortSignal` immediately stops the client from awaiting the response and frees local tracking.
- **Protocol notification:** An MCP `notifications/cancelled` message is dispatched to the server if the transport is active.
- **Downstream execution limitation:** An abort signal does **not** guarantee that the downstream tool has terminated execution. Stopping downstream execution depends on downstream server and tool support. Avoid automated retries when re-execution could cause unintended side effects.
- **Shared connection startup:** When concurrent callers await `connect()`, an individual caller's `AbortSignal` cancels only that caller's wait; it does not cancel connection startup for other callers.

---

## Lifecycle, Observability & Resource Teardown

### Lifecycle States

The client's current state is accessible via `client.state`:

- `DISCONNECTED`: Initial resting state before `connect()` is invoked.
- `CONNECTING`: Connection handshake and tool initialization in progress.
- `CONNECTED`: Active connection ready for tool discovery and invocation.
- `CLOSING`: Teardown initiated; in-flight requests are being aborted.
- `CLOSED`: Transport closed gracefully. Terminal state.
- `FAILED`: Unrecoverable error occurred (connection failure, unexpected process exit, or cleanup failure). Terminal state.

### State Transitions (`onStateChange`)

Subscribe to lifecycle transitions using the `onStateChange` option:

```ts
const client = createAgent44ProxyClient('python', {
  args: ['-m', 'agent44.proxy', '--', 'my-server'],
  onStateChange: (state) => {
    console.log(`[Lifecycle]: ${state}`);
  },
});
```

Key behaviors of `onStateChange`:
- **Actual transitions only:** Only invoked when the state genuinely changes. The initial `DISCONNECTED` state does not trigger a callback on construction.
- **Deduplication:** Duplicate assignments of the same state do not emit duplicate notifications.
- **Asynchronous server exits:** If the downstream process exits unexpectedly while connected, state transitions to `FAILED` and notifies listeners.
- **Callback isolation:** Any exceptions (synchronous throws or unhandled rejections) in `onStateChange` are safely swallowed. A buggy listener cannot crash the client or prevent cleanup.

### Explicit Cleanup

Always clean up client connections when done:

```ts
await client.cleanup();
```

- **Idempotent:** Calling `cleanup()` multiple times is safe and returns the same resolution.
- **Pending request cancellation:** Pending requests are rejected with `CLIENT_CLOSED`.
- **Cleanup retry:** If closing the underlying transport fails, the client marks itself `FAILED` and throws `CLEANUP_FAILED`. A subsequent call to `cleanup()` is permitted to retry transport closure.
- **Process shutdown limitation:** `cleanup()` closes the MCP transport. Child-process termination via stdio is best-effort. If your architecture requires guaranteed child process death, supervise the child process directly.

### Async Disposal (`await using`)

`Agent44ProxyClient` implements `[Symbol.asyncDispose]()`, which delegates directly to `cleanup()`:

```ts
async function runQuery() {
  await using client = createAgent44ProxyClient('python', {
    args: ['-m', 'agent44.proxy', '--', 'my-server'],
  });

  await client.connect();
  const tools = await client.listTools();
  console.log('Tools:', tools.length);
  // client.cleanup() is called automatically upon exiting block scope
}
```

> [!WARNING]
> **Runtime Compatibility for `await using`:**
> - **Node.js >= 20.4.0:** Supported natively in JavaScript runtimes.
> - **Node.js 18.0.0 – 20.3.x:** Native `Symbol.asyncDispose` is not present in V8. While this package includes a runtime fallback for `Symbol.asyncDispose`, compiling and running native `await using` syntax on Node.js 18 requires TypeScript transpilation or an explicit global polyfill (e.g. `core-js` or `@ungap/with-resolvers`). Explicit `await client.cleanup()` is supported universally across all Node versions.

### Fail-Closed Architecture

Agent44 operates on a strict **fail-closed** model:
- Once a client enters `FAILED` or `CLOSED`, it will never automatically reconnect or reset.
- Subsequent calls to `connect()`, `listTools()`, or `callTool()` reject immediately.
- To recover from a failed connection or downstream server crash, discard the client instance and create a new one.

---

## Error Handling & Type Guards

All client exceptions are instances of `Agent44ClientError`:

```ts
import { isAgent44ClientError } from '@imrohit44/agent44-ts-client';

try {
  await client.callTool('my_tool', {});
} catch (error) {
  if (isAgent44ClientError(error)) {
    console.error('Operation:', error.operation);
    console.error('Code:', error.code);
    console.error('Tool:', error.toolName);
    console.error('Timeout (ms):', error.timeoutMs);
    console.error('Underlying cause:', error.cause);
  } else {
    throw error;
  }
}
```

### Error Codes (`Agent44ClientErrorCode`)

| Code | Meaning |
| :--- | :--- |
| `CONNECTION_FAILED` | Initial connection or protocol handshake with the MCP server failed. |
| `CONNECTION_TIMEOUT` | Connection startup exceeded `connectionTimeoutMs`. |
| `REQUEST_TIMEOUT` | A tool or tool-list request exceeded its timeout. |
| `REQUEST_CANCELLED` | An operation was aborted via `AbortSignal`. |
| `SERVER_EXITED` | Downstream MCP server process exited unexpectedly during an active session. |
| `TOOL_ERROR` | Tool execution error emitted by client infrastructure. |
| `REQUEST_FAILED` | Request rejected by downstream transport or validation failed (e.g. malformed provenance). |
| `CLIENT_CLOSED` | Operation attempted on a client that has been closed or is currently closing. |
| `INVALID_STATE` | Operation is not valid for the current client lifecycle state. |
| `CLEANUP_FAILED` | Transport closure failed during cleanup (retryable). |

---

## Verification & Testing

The package includes comprehensive unit, type-safety, and real MCP integration test suites:

```sh
cd typescript
npm test             # Unit and reliability test suite
npm run typecheck    # Strict TypeScript typechecking
npm run build        # Compile to dist/
npm run test:integration # End-to-end integration test with Python proxy (requires uv)
```

---

## License

Apache-2.0. See [LICENSE](./LICENSE) for details.
