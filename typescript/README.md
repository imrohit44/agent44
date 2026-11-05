# Agent44 TypeScript Client

The Agent44 TypeScript Client is an experimental ESM wrapper around the
Model Context Protocol (MCP) client SDK. The checked-out source can spawn an
MCP server over stdio, initialize a session, discover tools, call tools, and
close the child process. It also supports carrying a `provenanceReference`
through MCP `_meta`.

**Release note:** the publicly published `0.1.0` predates the transport
integration described below. This repository's integration changes have not
been published; installing `0.1.0` does not provide the newly verified
transport behavior. The API remains experimental and is not a stable SDK
contract.

The Python proxy forwards a well-formed `provenanceReference` metadata object
to the downstream MCP server and preserves downstream response metadata. It
does not validate that reference against its provenance registry or use it as
policy evidence. The integration test demonstrates metadata transport only,
not end-to-end provenance enforcement or safety.

## Requirements

- Node.js 18 or later
- An ESM-compatible TypeScript or JavaScript project

## Installation

Install the published package:

```sh
npm install @imrohit44/agent44-ts-client
```

The currently published `0.1.0` does not include the transport integration
implemented in this repository checkout.

## Exports and API

The package exports:

- `Agent44ProxyClient`
- `createAgent44ProxyClient`
- `ProvenanceReference`
- `ToolCallResult`

The factory accepts a command, the legacy stream parameters, and optional
child-process options:

```ts
import {
  Agent44ProxyClient,
  createAgent44ProxyClient,
  type Agent44ProxyClientOptions,
  type ProvenanceReference,
  type ToolCallResult,
} from '@imrohit44/agent44-ts-client';

const client = createAgent44ProxyClient(
  'python',
  process.stdin,
  process.stdout,
  {
    args: [
      '-m', 'agent44.proxy', '--',
      'python', '-m', 'agent44.demo_server',
    ],
    cwd: process.cwd(),
  } satisfies Agent44ProxyClientOptions,
);

await client.connect();
const tools = await client.listTools();
const result = await client.callTool('add', { a: 2, b: 3 });
await client.cleanup();

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

The executable and `args` must start an MCP server; to traverse Agent44,
launch the Python proxy with the downstream server command after `--`. The
SDK opens child-process stdin/stdout itself. The retained `stdin` and `stdout`
parameters are accepted for compatibility and are not used by the transport.
`connect()` performs MCP initialization, `listTools()` discovers tools, and
`callTool()` also connects automatically if needed. Always call `cleanup()` to
close the child process.

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
`_meta.provenanceReference`.

## Verification status

The repository's `npm run test:integration` test starts the Python Agent44
proxy and a local deterministic MCP server. It verifies initialization, tool
discovery, an `add` result, policy denial, metadata round-tripping, unknown-tool
failure handling, and shutdown. It requires `uv` and the repository's Python
dependencies; it is not run by the published package's `npm test`.

This verification applies to the checked-out source, not published npm
version `0.1.0`. No end-to-end provenance validation/lineage, delegation
enforcement, remote MCP transport, or production safety behavior is established.

## License

Apache-2.0. See the [LICENSE](./LICENSE) file.

## Project links

- [Agent44 repository](https://github.com/imrohit44/Agent44)
- [Issues](https://github.com/imrohit44/Agent44/issues)
- [TypeScript client documentation](https://github.com/imrohit44/Agent44/blob/main/docs/typescript-client.md)
- [Project README](https://github.com/imrohit44/Agent44/blob/main/README.md)
