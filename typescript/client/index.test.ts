// TypeScript client tests for Agent44-ts-client
// Milestone 3C - Provenance propagation verification

import {
  Agent44ClientError,
  Agent44ProxyClient,
  createAgent44ProxyClient,
  type ProvenanceReference,
  type ToolCallResult,
} from './index.js';
import type { CallToolResult as MCPCallToolResult } from '@modelcontextprotocol/sdk/types.js';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const client = createAgent44ProxyClient('agent44-proxy', process.stdin, process.stdout);
assert.ok(client instanceof Agent44ProxyClient);

// Test 3: ProvenanceReference interface structure
const ref: ProvenanceReference = { id: 'test-uuid-123', sourceTool: 'tool-a' };
console.log('Test 3: ProvenanceReference structure:', ref);

// Test 4: ToolCallResult interface structure
const result: ToolCallResult = {
  success: true,
  text: 'success',
  error: null,
  provenance: { id: 'ref-456', sourceTool: 'tool-a' }
};
console.log('Test 4: ToolCallResult structure:', result.success);

function isValidProvenanceReference(obj: unknown): obj is ProvenanceReference {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    typeof obj.id === 'string' &&
    'sourceTool' in obj &&
    typeof obj.sourceTool === 'string'
  );
}

assert.equal(isValidProvenanceReference(ref), true);
assert.equal(isValidProvenanceReference({ id: 'test' }), false);

function isValidToolCallResult(obj: unknown): obj is ToolCallResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    typeof obj.success === 'boolean' &&
    'text' in obj &&
    (obj.text === null || typeof obj.text === 'string') &&
    'error' in obj &&
    (obj.error === null || typeof obj.error === 'string') &&
    'provenance' in obj &&
    (obj.provenance === undefined || isValidProvenanceReference(obj.provenance))
  );
}

assert.equal(isValidToolCallResult(result), true);
assert.equal(isValidToolCallResult({ success: 'yes' }), false);

const mcpResponse: MCPCallToolResult = {
  content: [],
  _meta: { provenanceReference: ref },
};
assert.deepEqual(client.extractProvenance(mcpResponse), ref);

const malformedResponse: MCPCallToolResult = {
  content: [],
  _meta: { provenanceReference: { id: 'missing-source-tool' } },
};
assert.equal(client.extractProvenance(malformedResponse), undefined);

console.log('TypeScript client API and provenance parsing tests passed.');

const serverScript = `
import { appendFileSync } from 'node:fs';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const mode = process.argv[1];
if (mode === 'hang') {
  setInterval(() => {}, 1000);
} else {
  const server = new Server({ name: 'reliability-test', version: '1.0.0' }, {
    capabilities: { tools: {} },
  });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [{ name: 'wait', description: 'Wait briefly', inputSchema: { type: 'object' } }],
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    appendFileSync(process.env.AGENT44_TEST_CALL_LOG, request.params.name + '\\n');
    await new Promise((resolve) => setTimeout(resolve, request.params.arguments.delay ?? 200));
    return { content: [{ type: 'text', text: 'finished' }] };
  });
  await server.connect(new StdioServerTransport());
  if (mode === 'exit') {
    setTimeout(() => process.exit(17), 50);
  }
}
`;

function createReliabilityClient(
  args: string[],
  options: ConstructorParameters<typeof Agent44ProxyClient>[3] = {},
): Agent44ProxyClient {
  return createAgent44ProxyClient(
    process.execPath,
    process.stdin,
    process.stdout,
    {
      args: ['--input-type=module', '-e', serverScript, ...args],
      ...options,
    },
  );
}

async function testReliabilityBehavior(): Promise<void> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'agent44-client-test-'));
  const callLog = path.join(tempDir, 'calls.log');
  const options = {
    env: { ...process.env, AGENT44_TEST_CALL_LOG: callLog },
  };
  try {
    const startupTimeoutClient = createReliabilityClient(
      ['hang'],
      { ...options, connectionTimeoutMs: 40 },
    );
    await assert.rejects(startupTimeoutClient.connect(), (error: unknown) => {
      assert.ok(error instanceof Agent44ClientError);
      assert.equal(error.code, 'CONNECTION_TIMEOUT');
      assert.equal(error.operation, 'connect');
      assert.equal(error.timeoutMs, 40);
      return true;
    });
    await startupTimeoutClient.cleanup();
    assert.equal(startupTimeoutClient.state, 'CLOSED');

    const connectionAbort = new AbortController();
    const cancelledConnection = createReliabilityClient(
      ['hang'],
      { ...options, connectionTimeoutMs: 1000 },
    );
    const connectionResult = assert.rejects(
      cancelledConnection.connect({ signal: connectionAbort.signal }),
      (error: unknown) => {
        assert.ok(error instanceof Agent44ClientError);
        assert.equal(error.code, 'REQUEST_CANCELLED');
        return true;
      },
    );
    setTimeout(() => connectionAbort.abort(new Error('cancel startup')), 20);
    await connectionResult;
    await cancelledConnection.cleanup();

    const failedClient = createAgent44ProxyClient(
      process.execPath,
      process.stdin,
      process.stdout,
      {
        ...options,
        args: ['--input-type=module', '-e', serverScript, 'normal'],
        cwd: path.join(tempDir, 'missing-directory'),
      },
    );
    await assert.rejects(failedClient.connect(), (error: unknown) => {
      assert.ok(error instanceof Agent44ClientError);
      assert.equal(error.code, 'CONNECTION_FAILED');
      assert.ok(error.cause instanceof Error);
      return true;
    });
    await failedClient.cleanup();
    await failedClient.cleanup();
    assert.equal(failedClient.state, 'CLOSED');

    const client = createReliabilityClient(['normal'], {
      ...options,
      requestTimeoutMs: 35,
    });
    await client.connect();
    const tools = await client.listTools();
    assert.equal(tools[0]?.name, 'wait');

    await assert.rejects(client.callTool('wait', { delay: 150 }), (error: unknown) => {
      assert.ok(error instanceof Agent44ClientError);
      assert.equal(error.code, 'REQUEST_TIMEOUT');
      assert.equal(error.operation, 'callTool');
      assert.equal(error.toolName, 'wait');
      assert.equal(error.timeoutMs, 35);
      return true;
    });

    await assert.rejects(
      client.callTool('wait', { delay: 150 }, { timeoutMs: 15 }),
      (error: unknown) => {
        assert.ok(error instanceof Agent44ClientError);
        assert.equal(error.code, 'REQUEST_TIMEOUT');
        assert.equal(error.timeoutMs, 15);
        return true;
      },
    );

    const extendedTimeout = await client.callTool(
      'wait',
      { delay: 80 },
      { timeoutMs: 250 },
    );
    assert.equal(extendedTimeout.success, true);

    const abortedBeforeCall = new AbortController();
    abortedBeforeCall.abort(new Error('cancel before request'));
    await assert.rejects(
      client.callTool('wait', {}, { signal: abortedBeforeCall.signal }),
      (error: unknown) => {
        assert.ok(error instanceof Agent44ClientError);
        assert.equal(error.code, 'REQUEST_CANCELLED');
        return true;
      },
    );

    const duringCall = new AbortController();
    const pending = client.callTool(
      'wait',
      { delay: 120 },
      { signal: duringCall.signal, timeoutMs: 500 },
    );
    setTimeout(() => {
      duringCall.abort(new Error('cancel in flight'));
      duringCall.abort(new Error('cancel again'));
    }, 20);
    await assert.rejects(pending, (error: unknown) => {
      assert.ok(error instanceof Agent44ClientError);
      assert.equal(error.code, 'REQUEST_CANCELLED');
      assert.equal(error.toolName, 'wait');
      return true;
    });
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal((await readFile(callLog, 'utf8')).trim().split('\n').length, 4);

    const pendingOnClose = client.callTool(
      'wait',
      { delay: 1000 },
      { timeoutMs: 1500 },
    );
    const pendingOnCloseResult = assert.rejects(
      pendingOnClose,
      (error: unknown) => {
        assert.ok(error instanceof Agent44ClientError);
        assert.equal(error.code, 'CLIENT_CLOSED');
        return true;
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    await client.cleanup();
    await pendingOnCloseResult;
    assert.equal(client.state, 'CLOSED');
    await assert.rejects(client.listTools(), (error: unknown) => {
      assert.ok(error instanceof Agent44ClientError);
      assert.equal(error.code, 'CLIENT_CLOSED');
      return true;
    });

    const exitingClient = createReliabilityClient(['exit'], options);
    await exitingClient.connect();
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(exitingClient.state, 'FAILED');
    await assert.rejects(exitingClient.listTools(), (error: unknown) => {
      assert.ok(error instanceof Agent44ClientError);
      assert.equal(error.code, 'SERVER_EXITED');
      return true;
    });
    await exitingClient.cleanup();
    assert.equal(exitingClient.state, 'CLOSED');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

await testReliabilityBehavior();
console.log('TypeScript client reliability tests passed.');