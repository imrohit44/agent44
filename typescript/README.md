# Agent44 TypeScript Client

The Agent44 TypeScript Client is an experimental ESM wrapper around the
Model Context Protocol (MCP) client SDK. It exposes a tool-call result shape
and helpers for attaching and extracting a `provenanceReference` in MCP
`_meta` fields.

This package is not currently a complete MCP proxy client: the implementation
does not connect its MCP client to the configured stdio transport, does not use
the supplied input/output streams, and does not provide a downstream server
command. Consequently, a successful live MCP tool call has not been verified.
The package tests cover API shape and provenance-reference parsing only; they
do not establish end-to-end provenance enforcement or safety.

The package version is `0.1.0` to identify this incomplete, experimental API as
pre-1.0. It should not be treated as a stable SDK contract.

## Requirements

- Node.js 18 or later
- An ESM-compatible TypeScript or JavaScript project

## Installation

After the package is published, install it with:

```sh
npm install agent44-ts-client
```

For pre-publication testing, install a locally-created package tarball instead.

## Exports and API

The package exports:

- `Agent44ProxyClient`
- `createAgent44ProxyClient`
- `ProvenanceReference`
- `ToolCallResult`

The current factory and class constructor accept a command and Node streams:

```ts
import {
  Agent44ProxyClient,
  createAgent44ProxyClient,
  type ProvenanceReference,
  type ToolCallResult,
} from 'agent44-ts-client';

const client = createAgent44ProxyClient(
  'agent44',
  process.stdin,
  process.stdout,
);

const sameClient: Agent44ProxyClient = client;
const reference: ProvenanceReference = {
  id: 'reference-id',
  sourceTool: 'source-tool',
};
const resultShape: ToolCallResult = {
  success: true,
  text: 'example',
  error: null,
};
```

This example demonstrates imports and API types; it does not start a working
MCP session. The command arguments are currently hard-coded inside the
implementation, and the `stdin` and `stdout` parameters are not used to connect
the transport.

`extractProvenance()` can parse a reference from an MCP response `_meta`:

```ts
const extracted = client.extractProvenance({
  content: [],
  _meta: {
    provenanceReference: {
      id: 'reference-id',
      sourceTool: 'source-tool',
    },
  },
});
```

The `callTool(toolName, args, provenance?)` method constructs an MCP tool-call
request and, when provided, attaches the reference as
`_meta.provenanceReference`. The implementation has not connected the MCP
client to its transport, so live `callTool()` execution is unverified and
should not be relied on as a functioning downstream integration.

Call `client.cleanup()` to close the internally-created transport when
applicable.

## Verification status

The package's automated tests verify API shape and provenance parsing.
Type-checking, package building, and importing the built ESM exports have been
verified. No live MCP tool exchange, interoperability with the Python proxy,
or end-to-end safety behavior is established.

## License

Apache-2.0. See the [LICENSE](./LICENSE) file.

## Project links

- [Agent44 repository](https://github.com/imrohit44/Agent44)
- [Issues](https://github.com/imrohit44/Agent44/issues)
- [TypeScript client documentation](https://github.com/imrohit44/Agent44/blob/main/docs/typescript-client.md)
- [Project README](https://github.com/imrohit44/Agent44/blob/main/README.md)
