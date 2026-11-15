import assert from 'node:assert/strict';
import {
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import {
  Agent44ClientError,
  Agent44ProxyClient,
  createAgent44ProxyClient,
  isAgent44ClientError,
  type CallToolResult,
  type FailedToolCallResult,
  type MCPCallToolResult,
  type ProvenanceReference,
  type SuccessfulToolCallResult,
  type Tool,
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
  mcp.connect = async () => { };
  mcp.close = async () => { };
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
  globalThis.clearTimeout = (() => { }) as typeof clearTimeout;

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

async function testTypeSafetyAndExports(): Promise<void> {
  // 1. MCP type re-exports verification (compile-time & runtime shape)
  const sampleTool: Tool = {
    name: 'test-tool',
    description: 'A test tool re-exported from Agent44',
    inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
  };
  assert.equal(sampleTool.name, 'test-tool');

  const sampleMcpCallResult: MCPCallToolResult = {
    content: [{ type: 'text', text: 'mcp-content' }],
    isError: false,
  };
  assert.equal(sampleMcpCallResult.content[0].type, 'text');

  const canonicalMcpResult: CallToolResult = sampleMcpCallResult;
  assert.equal(canonicalMcpResult.isError, false);

  // 2. Successful and failed ToolCallResult type narrowing (compile-time and runtime)
  const successResult: ToolCallResult = {
    success: true,
    text: 'executed successfully',
    error: null,
  };

  const failureResult: ToolCallResult = {
    success: false,
    text: 'failure message',
    error: 'failure message',
  };

  // Compile-time assertion functions verifying type narrowing
  function assertSuccessfulResult(res: ToolCallResult): { error: null; text: string | null } {
    if (res.success) {
      // Must compile: res.error is narrowed to null
      const narrowedError: null = res.error;
      const resSpecific: SuccessfulToolCallResult = res;
      return { error: narrowedError, text: resSpecific.text };
    }
    throw new Error('Expected success');
  }

  function assertFailedResult(res: ToolCallResult): { error: string; text: string | null } {
    if (!res.success) {
      // Must compile: res.error is narrowed to string
      const narrowedError: string = res.error;
      const resSpecific: FailedToolCallResult = res;
      return { error: narrowedError, text: resSpecific.text };
    }
    throw new Error('Expected failure');
  }

  const narrowedSuccess = assertSuccessfulResult(successResult);
  assert.equal(narrowedSuccess.error, null);
  assert.equal(narrowedSuccess.text, 'executed successfully');

  const narrowedFailure = assertFailedResult(failureResult);
  assert.equal(narrowedFailure.error, 'failure message');
  assert.equal(narrowedFailure.text, 'failure message');

  // 3. Consumer-defined argument interfaces without index signatures
  interface UserSearchQuery {
    query: string;
    maxResults?: number;
    filters: {
      tags: string[];
      archived: boolean;
    };
  }

  const queryParams: UserSearchQuery = {
    query: 'security policy',
    maxResults: 5,
    filters: {
      tags: ['audit', 'mcp'],
      archived: false,
    },
  };

  const registeredClients: Agent44ProxyClient[] = [];
  const { client: typeClient, mcp: typeMcp } = createControlledClient((c) => registeredClients.push(c));
  let receivedArgs: unknown;
  typeMcp.callTool = async (params: unknown) => {
    const callReq = params as { name: string; arguments?: Record<string, unknown> };
    receivedArgs = callReq.arguments;
    return {
      content: [{ type: 'text', text: 'search executed' }],
    };
  };

  try {
    // callTool accepts UserSearchQuery without cast or index signature:
    const searchRes = await typeClient.callTool('search_docs', queryParams);
    assert.equal(searchRes.success, true);
    assert.equal(searchRes.error, null);
    assert.equal(searchRes.text, 'search executed');
    assert.deepEqual(receivedArgs, queryParams);

    // Also verify generic specification explicitly:
    const explicitGenericRes = await typeClient.callTool<UserSearchQuery>('search_docs', queryParams);
    assert.equal(explicitGenericRes.success, true);
  } finally {
    for (const c of registeredClients) {
      await c.cleanup();
    }
  }

  // 4. Valid and invalid inputs to isAgent44ClientError type guard
  const actualError = new Agent44ClientError({
    code: 'CONNECTION_FAILED',
    message: 'Could not connect',
    operation: 'connect',
  });
  assert.equal(isAgent44ClientError(actualError), true);

  if (isAgent44ClientError(actualError)) {
    // Compile-time check that error is narrowed to Agent44ClientError
    const op: string = actualError.operation;
    const code: string = actualError.code;
    assert.equal(op, 'connect');
    assert.equal(code, 'CONNECTION_FAILED');
  }

  const fullActualError = new Agent44ClientError({
    code: 'REQUEST_TIMEOUT',
    message: 'Timed out',
    operation: 'callTool',
    toolName: 'my_tool',
    timeoutMs: 5000,
    cause: new Error('low-level timeout'),
  });
  assert.equal(isAgent44ClientError(fullActualError), true);

  // Structural lookalike (e.g. cross-realm error)
  const crossRealmLike = {
    name: 'Agent44ClientError',
    message: 'cross-realm message',
    operation: 'cleanup',
    code: 'CLEANUP_FAILED',
  };
  assert.equal(isAgent44ClientError(crossRealmLike), true);

  const crossRealmWithOptionals = {
    name: 'Agent44ClientError',
    message: 'timed out',
    operation: 'callTool',
    code: 'REQUEST_TIMEOUT',
    toolName: 'slow_tool',
    timeoutMs: 3000,
  };
  assert.equal(isAgent44ClientError(crossRealmWithOptionals), true);

  // Invalid inputs to isAgent44ClientError
  assert.equal(isAgent44ClientError(null), false);
  assert.equal(isAgent44ClientError(undefined), false);
  assert.equal(isAgent44ClientError(42), false);
  assert.equal(isAgent44ClientError('Agent44ClientError'), false);
  assert.equal(isAgent44ClientError(new Error('Agent44ClientError')), false);
  assert.equal(isAgent44ClientError({ name: 'Error', message: 'test', operation: 'op', code: 'TOOL_ERROR' }), false);
  assert.equal(isAgent44ClientError({ name: 'Agent44ClientError' }), false);
  assert.equal(isAgent44ClientError({ name: 'Agent44ClientError', message: 'test' }), false);
  assert.equal(isAgent44ClientError({ name: 'Agent44ClientError', message: 'test', operation: 'op' }), false);
  assert.equal(isAgent44ClientError({ name: 'Agent44ClientError', message: 'test', operation: 'op', code: 'INVALID_CODE' }), false);
  assert.equal(isAgent44ClientError({ name: 'Agent44ClientError', message: 123, operation: 'op', code: 'TOOL_ERROR' }), false);
  assert.equal(isAgent44ClientError({ name: 'Agent44ClientError', message: 'test', operation: true, code: 'TOOL_ERROR' }), false);
  assert.equal(isAgent44ClientError({ name: 'Agent44ClientError', message: 'test', operation: 'op', code: 'TOOL_ERROR', toolName: 999 }), false);
  assert.equal(isAgent44ClientError({ name: 'Agent44ClientError', message: 'test', operation: 'op', code: 'TOOL_ERROR', timeoutMs: '5000' }), false);
  assert.equal(isAgent44ClientError({ name: 'Agent44ClientError', message: 'test', operation: 'op', code: 'TOOL_ERROR', timeoutMs: NaN }), false);
  assert.equal(isAgent44ClientError({ name: 'Agent44ClientError', message: 'test', operation: 'op', code: 'TOOL_ERROR', timeoutMs: Infinity }), false);
}

async function testInitializationAndConfiguration(): Promise<void> {
  // 1. Modern two-argument factory usage
  const modernClient = createAgent44ProxyClient('node', {
    args: ['--version'],
    connectionTimeoutMs: 15_000,
  });
  assert.ok(modernClient instanceof Agent44ProxyClient);
  assert.equal(modernClient.state, 'DISCONNECTED');

  const modernConstructed = new Agent44ProxyClient('node', {
    args: ['--version'],
  });
  assert.ok(modernConstructed instanceof Agent44ProxyClient);
  assert.equal(modernConstructed.state, 'DISCONNECTED');

  const modernNoOptions = createAgent44ProxyClient('node');
  assert.ok(modernNoOptions instanceof Agent44ProxyClient);

  // 2. Existing four-argument factory usage
  const legacyClient = createAgent44ProxyClient(
    'node',
    process.stdin,
    process.stdout,
    {
      args: ['--version'],
      connectionTimeoutMs: 20_000,
    },
  );
  assert.ok(legacyClient instanceof Agent44ProxyClient);
  assert.equal(legacyClient.state, 'DISCONNECTED');

  const legacyConstructed = new Agent44ProxyClient(
    'node',
    process.stdin,
    process.stdout,
  );
  assert.ok(legacyConstructed instanceof Agent44ProxyClient);

  // 3. Strict TypeScript compatibility with process.env (NodeJS.ProcessEnv = Record<string, string | undefined>)
  const processEnvClient = createAgent44ProxyClient('node', {
    env: process.env,
  });
  assert.ok(processEnvClient instanceof Agent44ProxyClient);

  // 4. Undefined environment values handling and caller environment immutability
  const originalEnv: Record<string, string | undefined> = {
    DEFINED_KEY: 'test-value',
    UNDEFINED_KEY: undefined,
    EMPTY_KEY: '',
  };
  const snapshotBefore = { ...originalEnv };

  const customEnvClient = createAgent44ProxyClient('node', {
    env: originalEnv,
  });
  assert.ok(customEnvClient instanceof Agent44ProxyClient);

  // Verify caller's env object was not mutated
  assert.deepEqual(originalEnv, snapshotBefore);
  assert.equal('UNDEFINED_KEY' in originalEnv, true);
  assert.equal(originalEnv.UNDEFINED_KEY, undefined);

  // Verify transport received sanitized environment with undefined keys stripped
  const internalTransport = (customEnvClient as unknown as {
    transport: { _serverParams: { env?: Record<string, string> } };
  }).transport;
  const sanitizedEnv = internalTransport._serverParams.env;
  assert.ok(sanitizedEnv);
  assert.equal(sanitizedEnv.DEFINED_KEY, 'test-value');
  assert.equal(sanitizedEnv.EMPTY_KEY, '');
  assert.equal('UNDEFINED_KEY' in sanitizedEnv, false);
  assert.equal(Object.prototype.hasOwnProperty.call(sanitizedEnv, 'UNDEFINED_KEY'), false);

  // 5. Existing connection and request timeout validation behavior
  assert.throws(
    () => new Agent44ProxyClient('node', { connectionTimeoutMs: 0 }),
    RangeError,
  );
  assert.throws(
    () => new Agent44ProxyClient('node', { connectionTimeoutMs: -1 }),
    RangeError,
  );
  assert.throws(
    () => new Agent44ProxyClient('node', { connectionTimeoutMs: NaN }),
    RangeError,
  );
  assert.throws(
    () => new Agent44ProxyClient('node', { requestTimeoutMs: 0 }),
    RangeError,
  );
  assert.throws(
    () => new Agent44ProxyClient('node', { requestTimeoutMs: -500 }),
    RangeError,
  );
  assert.throws(
    () => new Agent44ProxyClient('node', { requestTimeoutMs: Infinity }),
    RangeError,
  );

  // 6. Configuration precedence design tests (3-tier specification)
  function resolveTimeoutPrecedence(
    explicit: number | undefined,
    envValue: string | undefined,
    sdkDefault: number,
    name: string,
  ): number {
    // Tier 1: Explicit options
    if (explicit !== undefined) {
      if (!Number.isFinite(explicit) || explicit <= 0) {
        throw new RangeError(`${name} must be a positive finite number`);
      }
      return explicit;
    }

    // Tier 2: Environment-variable defaults
    if (envValue !== undefined && envValue.trim() !== '') {
      const parsed = Number(envValue);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new RangeError(`${name} from environment must be a positive finite number`);
      }
      return parsed;
    }

    // Tier 3: SDK defaults
    return sdkDefault;
  }

  // Precedence: Tier 1 overrides Tier 2 and Tier 3
  assert.equal(
    resolveTimeoutPrecedence(15000, '25000', 30000, 'connectionTimeoutMs'),
    15000,
  );
  // Precedence: Tier 2 overrides Tier 3 when Tier 1 is undefined
  assert.equal(
    resolveTimeoutPrecedence(undefined, '25000', 30000, 'connectionTimeoutMs'),
    25000,
  );
  // Precedence: Tier 3 applies when Tier 1 and Tier 2 are undefined
  assert.equal(
    resolveTimeoutPrecedence(undefined, undefined, 30000, 'connectionTimeoutMs'),
    30000,
  );
  assert.equal(
    resolveTimeoutPrecedence(undefined, '', 30000, 'connectionTimeoutMs'),
    30000,
  );
  assert.equal(
    resolveTimeoutPrecedence(undefined, '   ', 30000, 'connectionTimeoutMs'),
    30000,
  );

  // Validation: Malformed / zero / negative in Tier 1
  assert.throws(() => resolveTimeoutPrecedence(0, '25000', 30000, 'conn'), RangeError);
  assert.throws(() => resolveTimeoutPrecedence(-500, '25000', 30000, 'conn'), RangeError);
  assert.throws(() => resolveTimeoutPrecedence(NaN, '25000', 30000, 'conn'), RangeError);

  // Validation: Malformed / zero / negative in Tier 2
  assert.throws(() => resolveTimeoutPrecedence(undefined, '0', 30000, 'conn'), RangeError);
  assert.throws(() => resolveTimeoutPrecedence(undefined, '-500', 30000, 'conn'), RangeError);
  assert.throws(() => resolveTimeoutPrecedence(undefined, 'not-a-number', 30000, 'conn'), RangeError);
  assert.throws(() => resolveTimeoutPrecedence(undefined, '100abc', 30000, 'conn'), RangeError);
  assert.throws(() => resolveTimeoutPrecedence(undefined, 'Infinity', 30000, 'conn'), RangeError);
  assert.throws(() => resolveTimeoutPrecedence(undefined, 'NaN', 30000, 'conn'), RangeError);
}

await testPublicShapesAndProvenance();
await testReliabilityBehavior();
await testTypeSafetyAndExports();
await testInitializationAndConfiguration();
console.log('TypeScript client reliability and type-safety tests passed.');
