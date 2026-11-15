# Changelog

## 0.4.0

- Modernized client initialization with two-argument constructor and factory
  signatures (`createAgent44ProxyClient(command, options)` and `new Agent44ProxyClient(command, options)`),
  while preserving legacy four-argument stream signatures for backward compatibility.
- Re-exported MCP protocol types directly from package entry point (`Tool`,
  `CallToolResult`, and `MCPCallToolResult`).
- Refactored `ToolCallResult` into a discriminated union: `success: true`
  narrows `error: null`; `success: false` narrows `error: string`.
- Added generic argument typing to `callTool<TArgs extends object>()`,
  accepting consumer interfaces without index signatures.
- Added additive `content?: MCPCallToolResult['content']` field to
  `ToolCallResult`, preserving complete raw MCP content blocks (text, image,
  and embedded resources) in original sequence.
- Added and exported `isAgent44ClientError(error: unknown)` type guard with fast
  `instanceof` and strict structural validation.
- Added optional `onStateChange` callback to `Agent44ProxyClientOptions` to
  observe lifecycle state transitions (`CONNECTING`, `CONNECTED`, `CLOSING`,
  `CLOSED`, `FAILED`) with state deduplication and exception isolation.
- Implemented `[Symbol.asyncDispose]()` on `Agent44ProxyClient` delegating to
  `cleanup()`, enabling `await using` resource management.
- Added runtime fallback definition for `Symbol.asyncDispose` for runtimes lacking
  native Symbol support.
- Updated `options.env` to accept `Record<string, string | undefined>` for direct
  `process.env` assignment, safely stripping undefined keys without mutating caller
  objects.
- Improved parameter resolution to recognize empty options `{}` in
  `callTool(name, args, {})` and accept `provenance` inside `RequestOptions`.
- Added fail-fast parameter validation to reject malformed provenance objects
  with `Agent44ClientError('REQUEST_FAILED')`.

## 0.3.0

- Improved connection lifecycle management with observable client states.
- Isolated caller-level connection cancellation from shared startup; explicit
  cleanup cancels the shared connection attempt.
- Added configurable connection and request timeouts, plus request
  cancellation and pending-request cleanup.
- Made cleanup single-flight for concurrent callers, idempotent after success,
  and retryable after transport-close failure while preserving the original
  cause.
- Added typed client, lifecycle, timeout, cancellation, and cleanup errors.
- Expanded deterministic reliability tests and real MCP stdio integration
  coverage.
- Documented that stdio child-process termination is best-effort: successful
  cleanup does not independently confirm that the child process has exited.
  Client cancellation likewise does not guarantee downstream tool termination.

## 0.2.0

- Added MCP stdio session initialization, tool discovery, tool calls, process
  options, and cleanup.
- Added local integration coverage through the Python proxy and a deterministic
  MCP server.
