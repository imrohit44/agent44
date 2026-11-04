# TypeScript Client

The `typescript/client/index.ts` file contains a small MCP client wrapper with
methods for calling tools and reading/writing provenance metadata. It is an
experimental component, not a verified published SDK.

## Public API

- `ProvenanceReference`: `{ id: string; sourceTool: string }`
- `ToolCallResult`: `success`, optional text/error values, and optional
  provenance reference
- `Agent44ProxyClient`: constructor, `callTool()`, `extractProvenance()`, and
  `cleanup()`
- `createAgent44ProxyClient()`: factory returning an `Agent44ProxyClient`

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
```

Current declared scripts also include `npm run typecheck`, `npm run build`,
and `npm run demo`. At the time these docs were inspected, `npm test` passed
its lightweight checks, but `npm run typecheck` failed because
`demo/provenance-demo.ts` has a syntax error at line 20. The checked-in test
does not launch a live MCP proxy or exercise actual provenance propagation.

No evidence in the repository establishes npm publication. The package
manifest's version and `exports` fields describe local package metadata, not
publication. The root repository is Apache-2.0, while this package manifest
currently declares MIT; resolve the license discrepancy before publication.

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
  checks; it is not an integration test.
- `npm run typecheck` currently fails due to malformed syntax in the demo
  source included by `tsconfig.json`.
- The package manifest points to `dist/index.js`, `dist/index.cjs.js`, and
  `dist/index.d.ts`. With `rootDir: "./"` and `outDir: "./dist"`, the client
  entry source is emitted under `dist/client/`; the manifest targets are
  absent in the current checkout. Because typechecking fails first, a
  successful package build and its emitted files are not verified.
- No successful package build or npm publication was verified.
- The package manifest's MIT declaration differs from the root Apache-2.0
  license and requires maintainer resolution.
