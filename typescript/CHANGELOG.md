# Changelog

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
