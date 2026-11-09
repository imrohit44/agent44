# Agent44 TypeScript Client

The Agent44 TypeScript Client is an experimental ESM wrapper around the
Model Context Protocol (MCP) client SDK. Version `0.2.0` adds
stdio MCP connection, session initialization, tool discovery, tool calls, and
child-process cleanup. It also carries a `provenanceReference` through MCP
`_meta`.

**Release status:** `0.2.0` is published. It includes the stdio transport
integration described below; `0.1.0` predates that functionality. The API
remains experimental and is not a stable SDK contract.

The Python proxy forwards a well-formed `provenanceReference` metadata object
to the downstream MCP server and preserves downstream response metadata. It
does not validate that reference against its provenance registry or use it as
policy evidence. The integration test demonstrates metadata transport only,
not end-to-end provenance enforcement or safety.

## Requirements

- Node.js 18 or later
- An ESM-compatible TypeScript or JavaScript project

## Installation

Install the published package version:

```sh
npm install @imrohit44/agent44-ts-client@0.2.0
```

See the [npm package](https://www.npmjs.com/package/@imrohit44/agent44-ts-client)
and [GitHub v0.2.0 release](https://github.com/imrohit44/Agent44/releases/tag/v0.2.0).

## Exports and API

The package exports:

- `Agent44ProxyClient`
- `createAgent44ProxyClient`
- `Agent44ClientError` and `Agent44ClientErrorCode`
- `Agent44ClientState`
- `Agent44ProxyClientOptions`, `ConnectOptions`, and `RequestOptions`
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
    connectionTimeoutMs: 10_000,
    requestTimeoutMs: 30_000,
  } satisfies Agent44ProxyClientOptions,
);

try {
  await client.connect();
  const tools = await client.listTools();
  const result = await client.callTool('add', { a: 2, b: 3 }, {
    timeoutMs: 5_000,
  });
} finally {
  await client.cleanup();
}

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

## Timeouts, cancellation, and lifecycle

`connectionTimeoutMs` limits MCP startup and initialization (default: 30
seconds). `requestTimeoutMs` sets the default for `listTools()` and
`callTool()` requests (default: the MCP SDK's 60-second timeout). Supply
`{ timeoutMs }` in request options to override the request default. Connection
options accept `{ signal }`; request options accept both `{ signal, timeoutMs }`.

The existing provenance argument remains supported:

```ts
const abortController = new AbortController();
const result = await client.callTool(
  'search',
  { query: 'MCP' },
  { id: 'ref-123', sourceTool: 'planner' },
  { signal: abortController.signal, timeoutMs: 5_000 },
);
```

For calls without provenance, pass request options as the third argument:

```ts
await client.callTool('search', { query: 'MCP' }, {
  signal: abortController.signal,
});
```

Timeouts and cancellations reject with `Agent44ClientError`, including a
`code`, `operation`, optional `toolName`, `timeoutMs`, and original `cause`.
Codes include `CONNECTION_FAILED`, `CONNECTION_TIMEOUT`, `REQUEST_TIMEOUT`,
`REQUEST_CANCELLED`, `SERVER_EXITED`, `TOOL_ERROR`, `REQUEST_FAILED`,
`CLIENT_CLOSED`, `INVALID_STATE`, and `CLEANUP_FAILED`. MCP tool results marked
`isError` remain ordinary `{ success: false }` results, so an Agent44 policy
denial is not recast as a connection failure. `REQUEST_FAILED` represents an
MCP request that rejected rather than returning a tool result.

The public `state` is one of `DISCONNECTED`, `CONNECTING`, `CONNECTED`,
`CLOSING`, `CLOSED`, or `FAILED`. `cleanup()` is idempotent, rejects pending
requests with `CLIENT_CLOSED`, and permanently closes the client; later
operations reject instead of reconnecting. Always await cleanup in a `finally`
block.

An abort signal cancels the client-side MCP request and sends the protocol
cancellation notification where supported. It does **not** guarantee that the
downstream tool has stopped executing; that depends on the server and tool.
The same limitation applies to timeouts. Avoid automatic retries where
re-execution could have side effects.

These reliability API additions are in the current repository source. The
published `0.2.0` package is unchanged until a future release is published.

## Verification status

The repository's `npm run test:integration` test starts the Python Agent44
proxy and a local deterministic MCP server. It verifies initialization, tool
discovery, an `add` result, policy denial (including no downstream execution
for denied calls), metadata round-tripping, unknown-tool failure handling, and
shutdown. It requires `uv` and the repository's Python dependencies; it is
not run by the published package's `npm test`. This behavior was verified from
the release source and published package tarball.

The public npm `0.1.0` does not have this transport behavior. No end-to-end
provenance validation/lineage, delegation enforcement, remote MCP transport,
or production safety behavior is established.

## License

Apache-2.0. See the [LICENSE](./LICENSE) file.

## Project links

- [Agent44 repository](https://github.com/imrohit44/Agent44)
- [Issues](https://github.com/imrohit44/Agent44/issues)
- [TypeScript client documentation](https://github.com/imrohit44/Agent44/blob/main/docs/typescript-client.md)
- [Project README](https://github.com/imrohit44/Agent44/blob/main/README.md)
