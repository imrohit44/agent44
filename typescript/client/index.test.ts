import assert from 'node:assert/strict';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  ErrorCode,
  McpError,
  type CallToolResult as MCPCallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import {
  Agent44ClientError,
  Agent44ProxyClient,
  createAgent44ProxyClient,
  type ProvenanceReference,
  type ToolCallResult,
} from './index.js';

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}

interface ControlledMCPClient {
  connect: (...args: never[]) => Promise<void>;
  close: () => Promise<void>;
  listTools: (...args: never[]) => Promise<{ tools: Tool[] }>;
  callTool: (...args: unknown[]) => Promise<MCPCallToolResult>;
  onclose?: () => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createControlledClient(
  register: (client: Agent44ProxyClient) => void,
  options: ConstructorParameters<typeof Agent44ProxyClient>[3] = {},
): { client: Agent44ProxyClient; mcp: ControlledMCPClient } {
  const client = createAgent44ProxyClient(
    'controlled-mcp-fixture',
    process.stdin,
    process.stdout,
    options,
  );
  const mcp = (client as unknown as { client: ControlledMCPClient }).client;
  mcp.connect = async () => {};
  mcp.close = async () => {};
  mcp.listTools = async () => ({ tools: [] });
  mcp.callTool = async () => ({ content: [{ type: 'text', text: 'ok' }] });
  register(client);
  return { client, mcp };
}

function withMockConnectionTimeout<T>(
  run: (fireTimeout: () => void, scheduledDelay: () => number | undefined) => Promise<T>,
): Promise<T> {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  let timeoutCallback: (() => void) | undefined;
  let delay: number | undefined;

  globalThis.setTimeout = ((callback: (...args: unknown[]) => void, timeout?: number) => {
    timeoutCallback = () => callback();
    delay = timeout;
    return 1 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
  globalThis.clearTimeout = (() => {}) as typeof clearTimeout;

  return run(
    () => {
      assert.ok(timeoutCallback, 'connection timeout callback was scheduled');
      timeoutCallback();
    },
    () => delay,
  ).finally(() => {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  });
}

async function testPublicShapesAndProvenance(): Promise<void> {
  const client = createAgent44ProxyClient(
    'agent44-proxy',
    process.stdin,
    process.stdout,
  );
  assert.ok(client instanceof Agent44ProxyClient);

  const reference: ProvenanceReference = {
    id: 'test-uuid-123',
    sourceTool: 'tool-a',
  };
  const result: ToolCallResult = {
    success: true,
    text: 'success',
    error: null,
    provenance: reference,
  };
  assert.equal(result.success, true);

  const mcpResponse: MCPCallToolResult = {
    content: [],
    _meta: { provenanceReference: reference },
  };
  assert.deepEqual(client.extractProvenance(mcpResponse), reference);
  assert.equal(
    client.extractProvenance({
      content: [],
      _meta: { provenanceReference: { id: 'missing-source-tool' } },
    }),
    undefined,
  );
}

async function testReliabilityBehavior(): Promise<void> {
  const clients: Agent44ProxyClient[] = [];
  const register = (client: Agent44ProxyClient) => clients.push(client);
  let testFailure: unknown;
  let didFail = false;

  try {
    const connectionGate = deferred<void>();
    let connectionCount = 0;
    const { client: sharedClient, mcp: sharedMcp } = createControlledClient(register);
    sharedMcp.connect = () => {
      connectionCount += 1;
      return connectionGate.promise;
    };

    const callerAbort = new AbortController();
    const callerA = sharedClient.connect({ signal: callerAbort.signal });
    const callerB = sharedClient.connect();
    assert.equal(connectionCount, 1, 'concurrent callers share one connection');

    const callerAResult = assert.rejects(callerA, (error: unknown) => {
      assert.ok(error instanceof Agent44ClientError);
      assert.equal(error.code, 'REQUEST_CANCELLED');
      assert.equal(error.operation, 'connect');
      return true;
    });
    callerAbort.abort(new Error('caller A stopped waiting'));
    await callerAResult;
    connectionGate.resolve();
    await callerB;
    assert.equal(sharedClient.state, 'CONNECTED');

    const exitGate = deferred<void>();
    const { client: exitingDuringConnect, mcp: exitMcp } =
      createControlledClient(register);
    exitMcp.connect = () => exitGate.promise;
    const exitCallerA = assert.rejects(
      exitingDuringConnect.connect(),
      (error: unknown) => {
        assert.ok(error instanceof Agent44ClientError);
        assert.equal(error.code, 'CONNECTION_FAILED');
        return true;
      },
    );
    const exitCallerB = assert.rejects(
      exitingDuringConnect.connect(),
      (error: unknown) => {
        assert.ok(error instanceof Agent44ClientError);
        assert.equal(error.code, 'CONNECTION_FAILED');
        return true;
      },
    );
    exitMcp.onclose?.();
    exitGate.reject(new Error('fixture exited during startup'));
    await Promise.all([exitCallerA, exitCallerB]);

    const startupError = new Error('transport startup failed');
    const { client: failedStartup, mcp: failedStartupMcp } =
      createControlledClient(register);
    let failedStartupCloseCount = 0;
    failedStartupMcp.connect = () => Promise.reject(startupError);
    failedStartupMcp.close = async () => {
      failedStartupCloseCount += 1;
    };
    await assert.rejects(failedStartup.connect(), (error: unknown) => {
      assert.ok(error instanceof Agent44ClientError);
      assert.equal(error.code, 'CONNECTION_FAILED');
      assert.equal(error.cause, startupError);
      return true;
    });
    assert.equal(failedStartupCloseCount, 1);

    const startupGate = deferred<void>();
    const { client: cleanupDuringConnect, mcp: startupMcp } =
      createControlledClient(register);
    let startupCount = 0;
    let startupCloseCount = 0;
    startupMcp.connect = () => {
      startupCount += 1;
      return startupGate.promise;
    };
    startupMcp.close = async () => {
      startupCloseCount += 1;
    };
    const startupResult = assert.rejects(
      cleanupDuringConnect.connect(),
      (error: unknown) => {
        assert.ok(error instanceof Agent44ClientError);
        assert.equal(error.code, 'CLIENT_CLOSED');
        return true;
      },
    );
    const startupWaiterResult = assert.rejects(
      cleanupDuringConnect.connect(),
      (error: unknown) => {
        assert.ok(error instanceof Agent44ClientError);
        assert.equal(error.code, 'CLIENT_CLOSED');
        return true;
      },
    );
    const startupCleanup = cleanupDuringConnect.cleanup();
    await Promise.all([startupResult, startupWaiterResult]);
    await startupCleanup;
    assert.equal(startupCount, 1);
    assert.equal(startupCloseCount, 1);
    assert.equal(cleanupDuringConnect.state, 'CLOSED');
    startupGate.resolve();

    const timeoutGate = deferred<void>();
    const { client: timeoutClient, mcp: timeoutMcp } = createControlledClient(
      register,
      { connectionTimeoutMs: 123 },
    );
    timeoutMcp.connect = () => timeoutGate.promise;
    await withMockConnectionTimeout(async (fireTimeout, scheduledDelay) => {
      const timedOutConnect = assert.rejects(
        timeoutClient.connect(),
        (error: unknown) => {
          assert.ok(error instanceof Agent44ClientError);
          assert.equal(error.code, 'CONNECTION_TIMEOUT');
          assert.equal(error.timeoutMs, 123);
          return true;
        },
      );
      assert.equal(scheduledDelay(), 123);
      fireTimeout();
      await timedOutConnect;
    });
    timeoutGate.resolve();

    const { client: failedCloseClient, mcp: failedCloseMcp } =
      createControlledClient(register);
    const originalCloseError = new Error('first close failed');
    let closeAttempts = 0;
    const closeGate = deferred<void>();
    failedCloseMcp.close = () => {
      closeAttempts += 1;
      return closeAttempts === 1
        ? closeGate.promise
        : Promise.resolve();
    };
    const firstCleanup = failedCloseClient.cleanup();
    const concurrentCleanup = failedCloseClient.cleanup();
    assert.equal(firstCleanup, concurrentCleanup);
    closeGate.reject(originalCloseError);
    await assert.rejects(firstCleanup, (error: unknown) => {
      assert.ok(error instanceof Agent44ClientError);
      assert.equal(error.code, 'CLEANUP_FAILED');
      assert.equal(error.cause, originalCloseError);
      return true;
    });
    assert.equal(failedCloseClient.state, 'FAILED');
    await failedCloseClient.cleanup();
    assert.equal(closeAttempts, 2);
    assert.equal(failedCloseClient.state, 'CLOSED');
    await failedCloseClient.cleanup();
    assert.equal(closeAttempts, 2, 'successful cleanup remains idempotent');

    const { client: requestClient, mcp: requestMcp } =
      createControlledClient(register, { requestTimeoutMs: 250 });
    const timeoutCause = new McpError(ErrorCode.RequestTimeout, 'timed out');
    let observedTimeout: number | undefined;
    requestMcp.callTool = async (...args: unknown[]) => {
      observedTimeout = (args[2] as { timeout: number }).timeout;
      throw timeoutCause;
    };
    await assert.rejects(
      requestClient.callTool('lookup', {}, { timeoutMs: 75 }),
      (error: unknown) => {
        assert.ok(error instanceof Agent44ClientError);
        assert.equal(error.code, 'REQUEST_TIMEOUT');
        assert.equal(error.operation, 'callTool');
        assert.equal(error.toolName, 'lookup');
        assert.equal(error.timeoutMs, 75);
        assert.equal(error.cause, timeoutCause);
        return true;
      },
    );
    assert.equal(observedTimeout, 75);

    const requestStarted = deferred<AbortSignal>();
    const requestMcp2 = (requestClient as unknown as {
      client: ControlledMCPClient;
    }).client;
    requestMcp2.callTool = (...args: unknown[]) => new Promise((_, reject) => {
      const signal = (args[2] as { signal: AbortSignal }).signal;
      signal.addEventListener('abort', () => {
        const error = new Error('MCP request cancelled');
        error.name = 'AbortError';
        reject(error);
      }, { once: true });
      requestStarted.resolve(signal);
    });
    const requestAbort = new AbortController();
    const cancelledRequest = assert.rejects(
      requestClient.callTool('lookup', {}, { signal: requestAbort.signal }),
      (error: unknown) => {
        assert.ok(error instanceof Agent44ClientError);
        assert.equal(error.code, 'REQUEST_CANCELLED');
        return true;
      },
    );
    await requestStarted.promise;
    requestAbort.abort(new Error('cancel this request'));
    await cancelledRequest;

    const { client: isolatedClient, mcp: isolatedMcp } =
      createControlledClient(register);
    const requestOne = deferred<void>();
    const requestTwo = deferred<void>();
    const startedOne = deferred<AbortSignal>();
    const startedTwo = deferred<AbortSignal>();
    isolatedMcp.callTool = (...args: unknown[]) => {
      const toolName = (args[0] as { name: string }).name;
      const current = toolName === 'one' ? requestOne : requestTwo;
      const started = toolName === 'one' ? startedOne : startedTwo;
      const signal = (args[2] as { signal: AbortSignal }).signal;
      signal.addEventListener('abort', () => {
        const error = new Error('request cancelled');
        error.name = 'AbortError';
        current.reject(error);
      }, { once: true });
      started.resolve(signal);
      return current.promise.then(() => ({ content: [] }));
    };
    const abortOne = new AbortController();
    const callOne = assert.rejects(
      isolatedClient.callTool('one', {}, { signal: abortOne.signal }),
      (error: unknown) => {
        assert.ok(error instanceof Agent44ClientError);
        assert.equal(error.code, 'REQUEST_CANCELLED');
        return true;
      },
    );
    const callTwo = isolatedClient.callTool('two', {});
    await Promise.all([startedOne.promise, startedTwo.promise]);
    abortOne.abort();
    await callOne;
    requestTwo.resolve();
    assert.equal((await callTwo).success, true);

    const { client: afterCompletionClient, mcp: afterCompletionMcp } =
      createControlledClient(register);
    afterCompletionMcp.callTool = async () => ({
      content: [{ type: 'text', text: 'policy denied' }],
      isError: true,
    });
    const completedAbort = new AbortController();
    const policyResult = await afterCompletionClient.callTool(
      'restricted',
      {},
      { signal: completedAbort.signal },
    );
    completedAbort.abort();
    assert.equal(policyResult.success, false);
    assert.equal(policyResult.error, 'policy denied');
  } catch (error) {
    didFail = true;
    testFailure = error;
  }

  const cleanupFailures: unknown[] = [];
  for (const client of clients) {
    try {
      await client.cleanup();
    } catch (error) {
      cleanupFailures.push(error);
    }
  }

  if (didFail && cleanupFailures.length > 0) {
    throw new AggregateError(
      [testFailure, ...cleanupFailures],
      'Reliability test and teardown both failed',
    );
  }
  if (didFail) {
    throw testFailure;
  }
  if (cleanupFailures.length > 0) {
    throw new AggregateError(cleanupFailures, 'Reliability test teardown failed');
  }
}

await testPublicShapesAndProvenance();
await testReliabilityBehavior();
console.log('TypeScript client reliability tests passed.');
