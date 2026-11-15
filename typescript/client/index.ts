import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type {
  CallToolRequestParams,
  CallToolResult,
  CallToolResult as MCPCallToolResult,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  CallToolResultSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { DEFAULT_REQUEST_TIMEOUT_MSEC } from '@modelcontextprotocol/sdk/shared/protocol.js';

type MCPToolResponse = Awaited<ReturnType<Client['callTool']>>;

function isMCPCallToolResult(result: MCPToolResponse): result is MCPCallToolResult {
  return 'content' in result && Array.isArray(result.content);
}

export type {
  CallToolResult,
  CallToolResult as MCPCallToolResult,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

export interface ProvenanceReference {
  id: string;
  sourceTool: string;
}

export interface SuccessfulToolCallResult {
  success: true;
  text: string | null;
  error: null;
  content?: MCPCallToolResult['content'];
  provenance?: ProvenanceReference;
}

export interface FailedToolCallResult {
  success: false;
  text: string | null;
  error: string;
  content?: MCPCallToolResult['content'];
  provenance?: ProvenanceReference;
}

export type ToolCallResult = SuccessfulToolCallResult | FailedToolCallResult;

export type Agent44ClientErrorCode =
  | 'CONNECTION_FAILED'
  | 'CONNECTION_TIMEOUT'
  | 'REQUEST_TIMEOUT'
  | 'REQUEST_CANCELLED'
  | 'SERVER_EXITED'
  | 'TOOL_ERROR'
  | 'REQUEST_FAILED'
  | 'CLIENT_CLOSED'
  | 'INVALID_STATE'
  | 'CLEANUP_FAILED';

export type Agent44ClientState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'CLOSING'
  | 'CLOSED'
  | 'FAILED';

export class Agent44ClientError extends Error {
  readonly code: Agent44ClientErrorCode;
  readonly operation: string;
  readonly toolName?: string;
  readonly timeoutMs?: number;

  constructor(options: {
    code: Agent44ClientErrorCode;
    message: string;
    operation: string;
    cause?: unknown;
    toolName?: string;
    timeoutMs?: number;
  }) {
    super(options.message, { cause: options.cause });
    this.name = 'Agent44ClientError';
    this.code = options.code;
    this.operation = options.operation;
    this.toolName = options.toolName;
    this.timeoutMs = options.timeoutMs;
  }
}

const VALID_CLIENT_ERROR_CODES: ReadonlySet<string> = new Set<Agent44ClientErrorCode>([
  'CONNECTION_FAILED',
  'CONNECTION_TIMEOUT',
  'REQUEST_TIMEOUT',
  'REQUEST_CANCELLED',
  'SERVER_EXITED',
  'TOOL_ERROR',
  'REQUEST_FAILED',
  'CLIENT_CLOSED',
  'INVALID_STATE',
  'CLEANUP_FAILED',
]);

export function isAgent44ClientError(error: unknown): error is Agent44ClientError {
  if (error instanceof Agent44ClientError) {
    return true;
  }
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as Record<string, unknown>;
  if (candidate.name !== 'Agent44ClientError') {
    return false;
  }
  if (typeof candidate.message !== 'string') {
    return false;
  }
  if (typeof candidate.operation !== 'string') {
    return false;
  }
  if (typeof candidate.code !== 'string' || !VALID_CLIENT_ERROR_CODES.has(candidate.code)) {
    return false;
  }
  if (candidate.toolName !== undefined && typeof candidate.toolName !== 'string') {
    return false;
  }
  if (
    candidate.timeoutMs !== undefined
    && (typeof candidate.timeoutMs !== 'number' || !Number.isFinite(candidate.timeoutMs))
  ) {
    return false;
  }
  return true;
}

export interface Agent44ProxyClientOptions {
  args?: string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
  connectionTimeoutMs?: number;
  requestTimeoutMs?: number;
  onStateChange?: (state: Agent44ClientState) => void;
}

export interface ConnectOptions {
  signal?: AbortSignal;
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  provenance?: ProvenanceReference;
}

const DEFAULT_CONNECTION_TIMEOUT_MS = 30_000;

function validateTimeout(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error
    && (error.name === 'AbortError' || error.name === 'CancelledError')
  );
}

function isRequestTimeout(error: unknown): boolean {
  return error instanceof McpError && error.code === ErrorCode.RequestTimeout;
}

function isProvenanceReference(value: unknown): value is ProvenanceReference {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (
    'id' in value
    && typeof (value as { id: unknown }).id === 'string'
    && 'sourceTool' in value
    && typeof (value as { sourceTool: unknown }).sourceTool === 'string'
  );
}

function isProvenanceLike(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return 'id' in value || 'sourceTool' in value;
}

function isRequestOptions(value: unknown): value is RequestOptions {
  return (
    typeof value === 'object'
    && value !== null
    && !isProvenanceReference(value)
    && !isProvenanceLike(value)
  );
}

function sanitizeEnvironment(
  env: Record<string, string | undefined> | undefined,
): Record<string, string> | undefined {
  if (!env) {
    return undefined;
  }
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function isStream(value: unknown): boolean {
  return (
    typeof value === 'object'
    && value !== null
    && 'pipe' in value
    && typeof (value as { pipe?: unknown }).pipe === 'function'
  );
}

if (typeof Symbol !== 'undefined' && !(Symbol as { asyncDispose?: symbol }).asyncDispose) {
  Object.defineProperty(Symbol, 'asyncDispose', {
    value: Symbol.for('Symbol.asyncDispose'),
    configurable: true,
    enumerable: false,
    writable: true,
  });
}

export class Agent44ProxyClient {
  private readonly client: Client;
  private readonly transport: StdioClientTransport;
  private readonly connectionTimeoutMs: number;
  private readonly requestTimeoutMs: number;
  private readonly onStateChange?: (state: Agent44ClientState) => void;
  private connection: Promise<void> | undefined;
  private transportClose: Promise<void> | undefined;
  private closeOperation: Promise<void> | undefined;
  private connectAbortController: AbortController | undefined;
  private connectionAbortKind: 'timeout' | 'closed' | undefined;
  private connectionAbortReason: unknown;
  private connectionAbortListener: (() => void) | undefined;
  private terminalError: Agent44ClientError | undefined;
  private readonly pendingRequests = new Set<AbortController>();
  private stateValue: Agent44ClientState = 'DISCONNECTED';

  constructor(
    stdioCommand: string,
    options?: Agent44ProxyClientOptions,
  );
  constructor(
    stdioCommand: string,
    _stdin: NodeJS.ReadableStream,
    _stdout: NodeJS.WritableStream,
    options?: Agent44ProxyClientOptions,
  );
  constructor(
    stdioCommand: string,
    stdinOrOptions?: NodeJS.ReadableStream | Agent44ProxyClientOptions,
    _stdout?: NodeJS.WritableStream,
    options?: Agent44ProxyClientOptions,
  ) {
    const resolvedOptions = (
      _stdout !== undefined || isStream(stdinOrOptions)
        ? options ?? {}
        : (stdinOrOptions as Agent44ProxyClientOptions | undefined) ?? {}
    );
    this.connectionTimeoutMs =
      resolvedOptions.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS;
    this.requestTimeoutMs =
      resolvedOptions.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MSEC;
    this.onStateChange = resolvedOptions.onStateChange;
    validateTimeout(this.connectionTimeoutMs, 'connectionTimeoutMs');
    validateTimeout(this.requestTimeoutMs, 'requestTimeoutMs');

    this.transport = new StdioClientTransport({
      command: stdioCommand,
      args: resolvedOptions.args,
      cwd: resolvedOptions.cwd,
      env: sanitizeEnvironment(resolvedOptions.env),
    });
    this.client = new Client({
      name: '@imrohit44/agent44-ts-client',
      version: '0.3.0',
    });
    this.client.onerror = (error) => {
      if (this.stateValue === 'CONNECTING') {
        this.terminalError = this.createError(
          'CONNECTION_FAILED',
          `The MCP server failed during connection: ${errorMessage(error)}`,
          { operation: 'connect', cause: error },
        );
        this.setState('FAILED');
      }
    };
    this.client.onclose = () => {
      if (this.stateValue === 'CONNECTED') {
        this.failForServerExit();
      } else if (this.stateValue === 'CONNECTING') {
        this.terminalError ??= this.createError(
          'CONNECTION_FAILED',
          'The MCP server closed before connection initialization completed',
          { operation: 'connect' },
        );
        this.setState('FAILED');
      }
    };
  }

  get state(): Agent44ClientState {
    return this.stateValue;
  }

  connect(options: ConnectOptions = {}): Promise<void> {
    if (options.signal?.aborted) {
      return Promise.reject(
        this.createError('REQUEST_CANCELLED', 'Connection was cancelled', {
          operation: 'connect',
          cause: options.signal.reason,
        }),
      );
    }

    if (this.stateValue === 'CONNECTED') {
      return Promise.resolve();
    }
    if (this.stateValue === 'CONNECTING' && this.connection) {
      return this.waitForConnection(this.connection, options.signal);
    }
    if (this.stateValue === 'FAILED') {
      return Promise.reject(
        this.terminalError
        ?? this.createError('INVALID_STATE', 'The client connection has failed', {
          operation: 'connect',
        }),
      );
    }
    if (this.stateValue === 'CLOSING' || this.stateValue === 'CLOSED') {
      return Promise.reject(this.clientClosedError('connect'));
    }

    this.setState('CONNECTING');
    this.connectionAbortKind = undefined;
    this.connectionAbortReason = undefined;
    const controller = new AbortController();
    this.connectAbortController = controller;
    const timeoutMs = this.connectionTimeoutMs;

    const timeoutId = setTimeout(() => {
      this.connectionAbortKind = 'timeout';
      this.connectionAbortReason = new Error(
        `Connection timed out after ${timeoutMs}ms`,
      );
      controller.abort(this.connectionAbortReason);
    }, timeoutMs);

    const aborted = new Promise<never>((_, reject) => {
      const abortListener = () => reject(this.connectionAbortError());
      controller.signal.addEventListener('abort', abortListener, { once: true });
      this.connectionAbortListener = abortListener;
    });

    const startup = this.client
      .connect(this.transport, {
        signal: controller.signal,
        timeout: timeoutMs,
      })
      .then(() => {
        if (controller.signal.aborted || this.stateValue !== 'CONNECTING') {
          if (this.terminalError) {
            throw this.terminalError;
          }
          throw this.connectionAbortError();
        }
        this.setState('CONNECTED');
      });

    this.connection = Promise.race([startup, aborted])
      .catch(async (error: unknown) => {
        const connectionError = this.asConnectionError(error);
        if (this.stateValue !== 'CLOSING' && this.stateValue !== 'CLOSED') {
          this.terminalError = connectionError;
          this.setState('FAILED');
        }
        if (this.stateValue === 'CLOSING' || this.stateValue === 'CLOSED') {
          throw connectionError;
        }
        try {
          await this.closeTransport();
        } catch (closeError) {
          const cleanupError = this.createError(
            'CLEANUP_FAILED',
            `Failed to close the MCP transport after connection failure: ${errorMessage(closeError)}`,
            {
              operation: 'connect',
              cause: new AggregateError([connectionError, closeError]),
            },
          );
          this.terminalError = cleanupError;
          throw cleanupError;
        }
        throw connectionError;
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (this.connectionAbortListener) {
          controller.signal.removeEventListener(
            'abort',
            this.connectionAbortListener,
          );
          this.connectionAbortListener = undefined;
        }
        this.connectAbortController = undefined;
      });

    return this.waitForConnection(this.connection, options.signal);
  }

  async listTools(options: RequestOptions = {}): Promise<Tool[]> {
    validateTimeout(options.timeoutMs ?? this.requestTimeoutMs, 'timeoutMs');
    await this.ensureConnected(options.signal);
    const result = await this.runRequest(
      'listTools',
      undefined,
      options,
      (signal) => this.client.listTools({}, {
        signal,
        timeout: options.timeoutMs ?? this.requestTimeoutMs,
      }),
    );
    return result.tools;
  }

  callTool<TArgs extends object = Record<string, unknown>>(
    toolName: string,
    args: TArgs,
    provenance?: ProvenanceReference,
    options?: RequestOptions,
  ): Promise<ToolCallResult>;
  callTool<TArgs extends object = Record<string, unknown>>(
    toolName: string,
    args: TArgs,
    options?: RequestOptions,
  ): Promise<ToolCallResult>;
  async callTool<TArgs extends object = Record<string, unknown>>(
    toolName: string,
    args: TArgs,
    provenanceOrOptions?: ProvenanceReference | RequestOptions,
    requestOptions?: RequestOptions,
  ): Promise<ToolCallResult> {
    let provenance: ProvenanceReference | undefined;
    let options: RequestOptions;

    if (requestOptions !== undefined) {
      if (provenanceOrOptions !== undefined) {
        if (!isProvenanceReference(provenanceOrOptions)) {
          throw this.createError(
            'REQUEST_FAILED',
            `Invalid provenance reference for tool "${toolName}": expected an object with string "id" and string "sourceTool"`,
            { operation: 'callTool', toolName },
          );
        }
        provenance = provenanceOrOptions;
      }
      if (typeof requestOptions !== 'object' || requestOptions === null) {
        throw this.createError(
          'REQUEST_FAILED',
          `Invalid request options for tool "${toolName}": expected an options object`,
          { operation: 'callTool', toolName },
        );
      }
      options = requestOptions;
      if (options.provenance !== undefined) {
        if (!isProvenanceReference(options.provenance)) {
          throw this.createError(
            'REQUEST_FAILED',
            `Invalid provenance reference in options for tool "${toolName}": expected an object with string "id" and string "sourceTool"`,
            { operation: 'callTool', toolName },
          );
        }
        provenance = options.provenance;
      }
    } else if (provenanceOrOptions !== undefined) {
      if (typeof provenanceOrOptions !== 'object' || provenanceOrOptions === null) {
        throw this.createError(
          'REQUEST_FAILED',
          `Invalid parameter for tool "${toolName}": expected a provenance reference or options object`,
          { operation: 'callTool', toolName },
        );
      }

      if (isProvenanceReference(provenanceOrOptions)) {
        provenance = provenanceOrOptions;
        options = {};
      } else if (isProvenanceLike(provenanceOrOptions)) {
        throw this.createError(
          'REQUEST_FAILED',
          `Invalid provenance reference for tool "${toolName}": expected an object with string "id" and string "sourceTool"`,
          { operation: 'callTool', toolName },
        );
      } else {
        options = provenanceOrOptions as RequestOptions;
        if (options.provenance !== undefined) {
          if (!isProvenanceReference(options.provenance)) {
            throw this.createError(
              'REQUEST_FAILED',
              `Invalid provenance reference in options for tool "${toolName}": expected an object with string "id" and string "sourceTool"`,
              { operation: 'callTool', toolName },
            );
          }
          provenance = options.provenance;
        }
      }
    } else {
      options = {};
    }

    validateTimeout(options.timeoutMs ?? this.requestTimeoutMs, 'timeoutMs');

    if (options.signal?.aborted) {
      throw this.createError('REQUEST_CANCELLED', 'Tool call was cancelled', {
        operation: 'callTool',
        toolName,
        cause: options.signal.reason,
      });
    }

    await this.ensureConnected(options.signal);

    const callParams: CallToolRequestParams = {
      name: toolName,
      arguments: { ...(args as Record<string, unknown>) },
    };
    if (provenance) {
      callParams._meta = {
        provenanceReference: {
          id: provenance.id,
          sourceTool: provenance.sourceTool,
        },
      };
    }

    const response = await this.runRequest(
      'callTool',
      toolName,
      options,
      (signal) => this.client.callTool(
        callParams,
        CallToolResultSchema,
        {
          signal,
          timeout: options.timeoutMs ?? this.requestTimeoutMs,
        },
      ),
    );
    if (!isMCPCallToolResult(response)) {
      throw this.createError(
        'TOOL_ERROR',
        'Task-based MCP tool results are not supported by this client',
        { operation: 'callTool', toolName },
      );
    }

    const extractedProvenance = this.extractProvenance(response);
    const firstTextBlock = response.content?.find(
      (item): item is { type: 'text'; text: string } => item.type === 'text',
    );
    const text = firstTextBlock ? firstTextBlock.text : null;
    if (response.isError) {
      return {
        success: false,
        text,
        error: text ?? 'Tool call failed',
        content: response.content,
        provenance: extractedProvenance,
      };
    }
    return {
      success: true,
      text,
      error: null,
      content: response.content,
      provenance: extractedProvenance,
    };
  }

  extractProvenance(
    result: MCPCallToolResult,
  ): ProvenanceReference | undefined {
    const reference = result._meta?.provenanceReference;
    return isProvenanceReference(reference) ? reference : undefined;
  }

  cleanup(): Promise<void> {
    if (this.closeOperation) {
      return this.closeOperation;
    }
    if (this.stateValue === 'CLOSED') {
      return Promise.resolve();
    }

    this.setState('CLOSING');
    const closedError = this.clientClosedError('cleanup');
    for (const controller of this.pendingRequests) {
      controller.abort(closedError);
    }
    if (this.connectAbortController && !this.connectAbortController.signal.aborted) {
      this.connectionAbortKind = 'closed';
      this.connectionAbortReason = closedError;
      this.connectAbortController.abort(this.connectionAbortReason);
    }

    const operation = (async () => {
      if (this.connection) {
        await this.connection.catch(() => undefined);
      }
      try {
        await this.closeTransport();
        this.setState('CLOSED');
      } catch (error) {
        const cleanupError = this.createError(
          'CLEANUP_FAILED',
          'Failed to close the MCP client transport',
          { operation: 'cleanup', cause: error },
        );
        this.terminalError = cleanupError;
        this.setState('FAILED');
        throw cleanupError;
      }
    })();

    this.closeOperation = operation;
    void operation.catch(() => {
      if (this.closeOperation === operation) {
        this.closeOperation = undefined;
      }
    });

    return operation;
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.cleanup();
  }

  private async ensureConnected(signal?: AbortSignal): Promise<void> {
    if (this.stateValue === 'CONNECTED') {
      return;
    }
    if (this.stateValue === 'FAILED') {
      throw this.terminalError
      ?? this.createError('INVALID_STATE', 'The client connection has failed', {
        operation: 'connect',
      });
    }
    if (this.stateValue === 'CLOSING' || this.stateValue === 'CLOSED') {
      throw this.clientClosedError('connect');
    }
    await this.connect({ signal });
  }

  private async waitForConnection(
    connection: Promise<void>,
    signal?: AbortSignal,
  ): Promise<void> {
    if (!signal) {
      return connection;
    }
    if (signal.aborted) {
      throw this.createError('REQUEST_CANCELLED', 'Connection wait was cancelled', {
        operation: 'connect',
        cause: signal.reason,
      });
    }
    let abortListener: (() => void) | undefined;
    const cancelled = new Promise<never>((_, reject) => {
      abortListener = () => reject(
        this.createError('REQUEST_CANCELLED', 'Connection wait was cancelled', {
          operation: 'connect',
          cause: signal.reason,
        }),
      );
      signal.addEventListener('abort', abortListener, { once: true });
    });
    try {
      await Promise.race([connection, cancelled]);
    } finally {
      if (abortListener) {
        signal.removeEventListener('abort', abortListener);
      }
    }
  }

  private async runRequest<T>(
    operation: 'listTools' | 'callTool',
    toolName: string | undefined,
    options: RequestOptions,
    request: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    validateTimeout(
      options.timeoutMs ?? this.requestTimeoutMs,
      'timeoutMs',
    );
    if (this.stateValue !== 'CONNECTED') {
      if (this.stateValue === 'CLOSING' || this.stateValue === 'CLOSED') {
        throw this.clientClosedError(operation, undefined, toolName);
      }
      if (this.stateValue === 'FAILED' && this.terminalError) {
        throw this.terminalError;
      }
      throw this.createError('INVALID_STATE', 'The client is not connected', {
        operation,
        toolName,
      });
    }
    if (options.signal?.aborted) {
      throw this.createError('REQUEST_CANCELLED', 'Request was cancelled', {
        operation,
        toolName,
        cause: options.signal.reason,
      });
    }

    let abortListener: (() => void) | undefined;
    const controller = new AbortController();
    if (options.signal) {
      abortListener = () => controller.abort(options.signal?.reason);
      options.signal.addEventListener('abort', abortListener, { once: true });
    }
    this.pendingRequests.add(controller);

    try {
      return await request(controller.signal);
    } catch (error) {
      if (this.getState() === 'CLOSING' || this.getState() === 'CLOSED') {
        throw this.clientClosedError(operation, error, toolName);
      }
      if (this.getState() === 'FAILED' && this.terminalError) {
        throw this.createError('SERVER_EXITED', 'The MCP server exited during a request', {
          operation,
          toolName,
          cause: error,
        });
      }
      if (options.signal?.aborted || isAbortError(error)) {
        throw this.createError('REQUEST_CANCELLED', 'Request was cancelled', {
          operation,
          toolName,
          cause: options.signal?.reason ?? error,
        });
      }
      if (isRequestTimeout(error)) {
        throw this.createError('REQUEST_TIMEOUT', 'MCP request timed out', {
          operation,
          toolName,
          timeoutMs: options.timeoutMs ?? this.requestTimeoutMs,
          cause: error,
        });
      }
      throw this.createError(
        'REQUEST_FAILED',
        `MCP ${operation} request failed: ${errorMessage(error)}`,
        { operation, toolName, cause: error },
      );
    } finally {
      this.pendingRequests.delete(controller);
      if (abortListener && options.signal) {
        options.signal.removeEventListener('abort', abortListener);
      }
    }
  }

  private async closeTransport(): Promise<void> {
    // Single-flight: if close is already in progress, wait for it to complete.
    // This prevents duplicate transport close calls while ensuring that a
    // subsequently called close() can retry after a failure (the cached
    // promise is cleared on completion or after a rejection).
    if (this.transportClose) {
      return this.transportClose;
    }

    try {
      this.transportClose = this.client.close();
      await this.transportClose;
      // Clear after successful completion so future close() calls can
      // proceed (idempotent transport close is safe to retry).
      this.transportClose = undefined;
      return;
    } catch (error) {
      // Clear so that a future close() attempt can proceed (retry policy).
      // The original error is preserved via Agent44ClientError.cause.
      this.transportClose = undefined;
      throw error;
    }
  }

  private getState(): Agent44ClientState {
    return this.stateValue;
  }

  private connectionAbortError(): Agent44ClientError {
    if (this.connectionAbortKind === 'timeout') {
      return this.createError(
        'CONNECTION_TIMEOUT',
        `MCP server connection timed out after ${this.connectionTimeoutMs}ms`,
        {
          operation: 'connect',
          timeoutMs: this.connectionTimeoutMs,
          cause: this.connectionAbortReason,
        },
      );
    }
    if (this.connectionAbortKind === 'closed') {
      return this.clientClosedError('connect', this.connectionAbortReason);
    }
    return this.createError('REQUEST_CANCELLED', 'Connection was cancelled', {
      operation: 'connect',
      cause: this.connectionAbortReason,
    });
  }

  private asConnectionError(error: unknown): Agent44ClientError {
    if (isAgent44ClientError(error)) {
      return error;
    }
    if (this.stateValue === 'CLOSING' || this.stateValue === 'CLOSED') {
      return this.clientClosedError('connect', error);
    }
    if (this.connectionAbortKind === 'timeout') {
      return this.connectionAbortError();
    }
    if (isRequestTimeout(error)) {
      return this.createError(
        'CONNECTION_TIMEOUT',
        `MCP server connection timed out after ${this.connectionTimeoutMs}ms`,
        {
          operation: 'connect',
          timeoutMs: this.connectionTimeoutMs,
          cause: error,
        },
      );
    }
    if (this.terminalError) {
      return this.terminalError;
    }
    return this.createError(
      'CONNECTION_FAILED',
      `Failed to connect to the MCP server: ${errorMessage(error)}`,
      { operation: 'connect', cause: error },
    );
  }

  private setState(newState: Agent44ClientState): void {
    if (this.stateValue === newState) {
      return;
    }
    this.stateValue = newState;
    if (this.onStateChange) {
      try {
        const result = this.onStateChange(newState) as unknown;
        if (result && typeof (result as Promise<unknown>).catch === 'function') {
          (result as Promise<unknown>).catch(() => { });
        }
      } catch {
        // Prevent callback exceptions from corrupting client lifecycle behavior
      }
    }
  }

  private failForServerExit(cause?: unknown): void {
    this.terminalError = this.createError(
      'SERVER_EXITED',
      'The MCP server process exited unexpectedly',
      { operation: 'connection', cause },
    );
    this.setState('FAILED');
  }

  private clientClosedError(
    operation: string,
    cause?: unknown,
    toolName?: string,
  ): Agent44ClientError {
    return this.createError(
      'CLIENT_CLOSED',
      'Agent44ProxyClient has been closed',
      { operation, toolName, cause },
    );
  }

  private createError(
    code: Agent44ClientErrorCode,
    message: string,
    context: {
      operation: string;
      cause?: unknown;
      toolName?: string;
      timeoutMs?: number;
    },
  ): Agent44ClientError {
    return new Agent44ClientError({
      code,
      message,
      ...context,
    });
  }
}

export function createAgent44ProxyClient(
  stdioCommand: string,
  options?: Agent44ProxyClientOptions,
): Agent44ProxyClient;
export function createAgent44ProxyClient(
  stdioCommand: string,
  stdin: NodeJS.ReadableStream,
  stdout: NodeJS.WritableStream,
  options?: Agent44ProxyClientOptions,
): Agent44ProxyClient;
export function createAgent44ProxyClient(
  stdioCommand: string,
  stdinOrOptions?: NodeJS.ReadableStream | Agent44ProxyClientOptions,
  stdout?: NodeJS.WritableStream,
  options?: Agent44ProxyClientOptions,
): Agent44ProxyClient {
  if (stdout !== undefined || isStream(stdinOrOptions)) {
    return new Agent44ProxyClient(
      stdioCommand,
      stdinOrOptions as NodeJS.ReadableStream,
      stdout as NodeJS.WritableStream,
      options,
    );
  }
  return new Agent44ProxyClient(
    stdioCommand,
    stdinOrOptions as Agent44ProxyClientOptions | undefined,
  );
}
