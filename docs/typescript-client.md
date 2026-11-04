# TypeScript Client

The `typescript/client/index.ts` file contains a small MCP client wrapper with
methods for calling tools and reading/writing provenance metadata. It is an
experimental component, not a verified published SDK.

## Public API

- `ProvenanceReference`: `{ id: string; sourceTool: string }`
- `ToolCallResult`: `success`, nullable `text` and `error`, and optional
  provenance reference
- `Agent44ProxyClient`: constructor, `callTool()`, `extractProvenance()`, and
  `cleanup()`
- `createAgent44ProxyClient()`: factory returning an `Agent44ProxyClient`

The checked-in source does not define `callToolWithoutReference()` or
`callToolWithReference()`; `callTool()` accepts an optional provenance
reference instead.

The constructor signature is currently:

```ts
new Agent44ProxyClient(
  stdioCommand: string,
  stdin: NodeJS.ReadableStream,
  stdout: NodeJS.WritableStream
)
```

The provided streams are currently unused. The transport arguments are
hard-coded as `['--policy', 'policy.yaml', '--']`, without a downstream server
command. Consequently, the public API shape should not be mistaken for a
working, configurable proxy launcher.

## Installation and setup

The package directory has a `package.json`, lockfile, TypeScript config, and
local scripts. Use the checked-in source tree rather than assuming an npm
package is published:

```powershell
cd typescript
npm ci
npm test
npm run typecheck
npm run build
npm pack --dry-run
```

The package is ESM-only. `npm run build` emits `dist/index.js` and
`dist/index.d.ts`; the package manifest's `main`, `module`, `types`, and
`exports` fields point to those generated files. The build configuration
compiles the package entry point, while `npm run typecheck` checks the entry
point, test, and demo source. The demo has been corrected to match the
available factory/result API, but it does not establish a working end-to-end
proxy integration. Tests cover API shape and provenance-reference parsing;
they do not launch a live MCP proxy.

No evidence in the repository establishes npm publication. The package
manifest's version and `exports` fields describe local package metadata, not
publication. The package metadata and included `LICENSE` now identify this
package as Apache-2.0, matching the repository license.

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

This is an API-shape example, not a verified runnable integration. The current
constructor does not accept a downstream command or configurable policy path,
so a client created from this source is not yet a complete drop-in proxy
launcher.

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
response `_meta`. The Python proxy currently does not consume this request
metadata or generate matching response metadata. Its legacy Python path
examines non-empty string argument values as candidate references instead.
Thus, the TypeScript metadata path is not end-to-end verified and should not be
used to claim interoperable provenance enforcement. See
[Provenance](provenance.md).

## Verification status

- `npm test` currently prints successful results for basic API/type-shape
  and provenance parsing; it is not an integration test.
- `npm run typecheck` passes for the entry point, tests, and demo without
  emitting files.
- `npm run build` passes and generates `dist/index.js`, `dist/index.d.ts`,
  and a source map; all declared ESM package entry points exist.
- `npm pack --dry-run` includes those distribution files, `package.json`, and
  the Apache-2.0 `LICENSE`, not TypeScript sources, demos, tests, or the
  lockfile.
- A temporary consumer project successfully imported the package and
  instantiated the exported class/factory. This did not exercise a live
  `callTool()` exchange.
- No npm publication is established.
- The package license is Apache-2.0, as confirmed by the maintainer; the
  package metadata, lockfile, and included license notice agree.
