# TypeScript Client

The checked-out `typescript/client/index.ts` implements an experimental MCP
stdio client wrapper. The repository's integration test launches the Python
Agent44 proxy and a local deterministic MCP server. Published version
`0.2.0` includes that transport integration; the earlier `0.1.0` predates it.

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
closes the SDK transport and child process.

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

The package identity is `@imrohit44/agent44-ts-client`. Version `0.2.0` is
publicly published. For consumer-facing examples and limitations, see the
[TypeScript package README](../typescript/README.md), the
[npm package](https://www.npmjs.com/package/@imrohit44/agent44-ts-client),
and [GitHub v0.2.0 release](https://github.com/imrohit44/Agent44/releases/tag/v0.2.0).

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

## Verification status

- `npm test` covers API/type shape and provenance parsing.
- `npm run test:integration` starts the Python proxy and a local MCP server;
  it requires `uv` and the repository's Python dependencies.
- `npm run typecheck` passes for the entry point, tests, and demo without
  emitting files.
- `npm run build` generates `dist/index.js`, `dist/index.d.ts`, and a source
  map; all declared ESM package entry points exist. The package allowlist
  intentionally excludes the source map.
- `npm pack --dry-run` includes `dist/index.js`, `dist/index.d.ts`,
  `package.json`, `README.md`, and the Apache-2.0 `LICENSE`, not TypeScript
  sources, demos, tests, the lockfile, or source maps.
- The integration test verifies real stdio MCP initialization, discovery,
  successful tool calls, policy denial (including absence of downstream
  execution for denied calls), metadata round-trip, unknown-tool errors, and
  shutdown through the checked-out Python proxy.
- The `0.2.0` source was tested from the tarball in a clean consumer; the
  published tarball has the same integrity as the preflighted artifact. The
  published `0.1.0` predates the transport changes.
- The package license is Apache-2.0, as confirmed by the maintainer; the
  package metadata, lockfile, and included license notice agree.
