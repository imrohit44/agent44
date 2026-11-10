# TypeScript Client

The checked-out `typescript/client/index.ts` implements an experimental MCP
stdio client wrapper. Published version `0.3.0` includes lifecycle and
cancellation improvements over the `0.2.0` stdio transport integration. The
repository's integration test launches the Python Agent44 proxy and a local
deterministic MCP server.

## Public API

- `ProvenanceReference`: `{ id: string; sourceTool: string }`
- `ToolCallResult`: `success`, nullable `text` and `error`, and optional
  provenance reference
- `Agent44ProxyClientOptions`: child process arguments, working directory, and
  environment
- `Agent44ProxyClient`: constructor, `connect()`, `listTools()`, `callTool()`,
  `extractProvenance()`, and `cleanup()`
- `createAgent44ProxyClient()`: factory returning an `Agent44ProxyClient`

The checked-in source does not define `callToolWithoutReference()` or
`callToolWithReference()`; `callTool()` accepts an optional provenance
reference instead.

The constructor and factory retain the original command and stream arguments
and add optional process options:

```ts
new Agent44ProxyClient(
  stdioCommand: string,
  stdin: NodeJS.ReadableStream,
  stdout: NodeJS.WritableStream,
  options?: Agent44ProxyClientOptions
)
```

The MCP SDK spawns `stdioCommand` with `options.args`, `options.cwd`, and
`options.env`. It owns the child process's protocol stdin/stdout; the retained
`stdin` and `stdout` parameters are compatibility parameters and are unused.
`connect()` initializes the MCP session; `listTools()` connects if needed and
returns the discovered tools; `callTool()` also connects lazily. `cleanup()`
delegates transport shutdown to the MCP SDK. For stdio transports, process
termination is best-effort; successful cleanup does not independently
guarantee that the child process has exited. Applications requiring strict
process-exit confirmation should monitor the child process separately.

## Installation and setup

The package directory has a `package.json`, lockfile, TypeScript config, and
local scripts. To work on the checked-in source tree:

```powershell
cd typescript
npm ci
npm test
npm run typecheck
npm run build
npm pack --dry-run
```

The package identity is `@imrohit44/agent44-ts-client`. Version `0.3.0` is
published on npm. For consumer-facing examples and limitations, see the
[TypeScript package README](../typescript/README.md), the
[npm package](https://www.npmjs.com/package/@imrohit44/agent44-ts-client),
and [GitHub v0.3.0 release](https://github.com/imrohit44/Agent44/releases/tag/v0.3.0).

The package is ESM-only. `npm run build` emits `dist/index.js` and
`dist/index.d.ts`; the package manifest's `main`, `module`, `types`, and
`exports` fields point to those generated files. The build configuration
compiles the package entry point, while `npm run typecheck` checks the entry
point, tests, and demo source. The package metadata and included `LICENSE`
identify this package as Apache-2.0, matching the repository license.

## Tool-call API shape

The wrapper method accepts a tool name, business argument mapping, and optional
provenance reference:

```ts
const result = await client.callTool(
  'add',
  { a: 2, b: 3 },
  { id: 'agent44-generated-id', sourceTool: 'upstream-tool' }
);
```

The call example is executable after connecting the client to a configured
MCP server process. To invoke the Agent44 proxy, the configured process must
run `agent44.proxy` with a downstream command after `--`. See the runnable
local integration test for an example of that argument setup.

## Provenance propagation

When given a reference, `callTool()` keeps business arguments separate and
adds this to the MCP request:

```json
{
  "_meta": {
    "provenanceReference": {
      "id": "agent44-generated-id",
      "sourceTool": "upstream-tool"
    }
  }
}
```

`extractProvenance()` looks for the same `provenanceReference` object in the
response `_meta`. The Python proxy forwards a dictionary-valued reference to
the downstream MCP server and returns downstream result metadata unchanged.
The integration test verifies that transport round-trip with a local fixture.
The proxy does not validate the reference against its provenance registry or
use it as policy evidence. This does not establish end-to-end provenance
enforcement. See [Provenance](provenance.md).

## Timeouts, cancellation, and cleanup

The client has a configurable `connectionTimeoutMs` (default 30 seconds) and
`requestTimeoutMs` (default the MCP SDK's 60-second request timeout). Pass
`{ signal }` to `connect()` to cancel that caller's wait; when callers share a
connection attempt, an individual signal does not cancel startup for the
other callers. `listTools()` accepts `{ signal, timeoutMs }`, and `callTool()`
accepts those request options either in the third argument when no provenance
reference is supplied, or as the fourth argument after a reference.

Request cancellation aborts the client-side request and sends the MCP
cancellation notification where supported. It does not guarantee that the
downstream server or tool stops executing. Connection cleanup is single-flight
for concurrent callers. Successful cleanup is idempotent; if transport closure
fails, cleanup rejects with `CLEANUP_FAILED`, preserves the underlying cause,
and can be retried. Explicit `cleanup()` cancels shared connection startup.

## Verification status

- `npm test` covers API/type shape, provenance parsing, and deterministic
  lifecycle reliability cases.
- `npm run test:integration` starts the Python proxy and a local MCP server;
  it requires `uv` and the repository's Python dependencies.
- `npm run typecheck` passes for the entry point, tests, and demo without
  emitting files.
- `npm run build` generates `dist/index.js`, `dist/index.d.ts`, and a source
  map; all declared ESM package entry points exist. The package allowlist
  intentionally excludes the source map.
- `npm pack --dry-run` includes `dist/index.js`, `dist/index.d.ts`,
  `package.json`, `README.md`, `CHANGELOG.md`, and the Apache-2.0 `LICENSE`,
  not TypeScript sources, demos, tests, the lockfile, or source maps.
- The integration test exercises real stdio MCP initialization, discovery,
  successful tool calls, policy denial (including absence of downstream
  execution for denied calls), metadata round-trip, unknown-tool errors, and
  shutdown through the checked-out Python proxy. It does not establish a
  guarantee that the stdio child process has exited after cleanup.
- The current source was verified with `npm test`, `npm run typecheck`,
  `npm run build`, and `npm run test:integration`. The npm `0.3.0` version
  exists; its immutable published README still contains pre-release text.
- Published `0.2.0` is the preceding release; published `0.1.0` predates the
  stdio transport changes.
- The package license is Apache-2.0, as confirmed by the maintainer; the
  package metadata, lockfile, and included license notice agree.
