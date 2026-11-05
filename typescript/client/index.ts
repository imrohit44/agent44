// TypeScript client adapter for Agent44 provenance propagation
// Milestone 3C.1
// Uses @modelcontextprotocol/sdk v1 - MCP stdio transport

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type {
  CallToolRequestParams,
  CallToolResult as MCPCallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';

type MCPToolResponse = Awaited<ReturnType<Client['callTool']>>;

function isMCPCallToolResult(result: MCPToolResponse): result is MCPCallToolResult {
  return 'content' in result && Array.isArray(result.content);
}

export interface ProvenanceReference {
  id: string;
  sourceTool: string;
}

export interface ToolCallResult {
  success: boolean;
  text: string | null;
  error: string | null;
  provenance?: ProvenanceReference;
}

export interface Agent44ProxyClientOptions {
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export class Agent44ProxyClient {
  private readonly client: Client;
  private readonly transport: StdioClientTransport;
  private connection: Promise<void> | undefined;
  private closed = false;

  constructor(
    stdioCommand: string,
    _stdin: NodeJS.ReadableStream,
    _stdout: NodeJS.WritableStream,
    options: Agent44ProxyClientOptions = {},
  ) {
    this.transport = new StdioClientTransport({
      command: stdioCommand,
      args: options.args,
      cwd: options.cwd,
      env: options.env,
    });
    this.client = new Client({
      name: '@imrohit44/agent44-ts-client',
      version: '0.1.0',
    });
  }

  async connect(): Promise<void> {
    if (this.closed) {
      throw new Error('Agent44ProxyClient has been closed');
    }
    if (this.connection) {
      return this.connection;
    }

    this.connection = this.client.connect(this.transport).catch((error: unknown) => {
      this.connection = undefined;
      throw error;
    });
    return this.connection;
  }

  async listTools(): Promise<Tool[]> {
    await this.connect();
    const result = await this.client.listTools();
    return result.tools;
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    provenance?: ProvenanceReference
  ): Promise<ToolCallResult> {
    await this.connect();

    // Separate provenance metadata from business arguments
    const businessArgs: Record<string, unknown> = { ...args };

    // Build tool call parameters with optional _meta for provenance
    const callParams: CallToolRequestParams = {
      name: toolName,
      arguments: businessArgs,
    };

    // Include provenance reference in _meta if supplied
    // The proxy forwards this reference as metadata, but does not treat it as
    // validated provenance or policy evidence.
    if (provenance) {
      callParams._meta = {
        provenanceReference: {
          id: provenance.id,
          sourceTool: provenance.sourceTool,
        },
      };
    }

    // Execute via MCP stdio transport
    const response = await this.client.callTool(
      callParams,
      CallToolResultSchema
    );
    if (!isMCPCallToolResult(response)) {
      throw new Error('Task-based MCP tool results are not supported by this client');
    }

    // Extract provenance from response _meta
    const extractedProvenance = this.extractProvenance(response);

    // Parse response
    const text = response.content?.[0]?.type === 'text' ? response.content[0].text : null;
    const result: ToolCallResult = {
      success: !response.isError,
      text,
      error: response.isError ? text ?? 'Tool call failed' : null,
      provenance: extractedProvenance,
    };

    return result;
  }

  extractProvenance(result: MCPCallToolResult): ProvenanceReference | undefined {
    // Extract provenance reference from response _meta
    const reference = result._meta?.provenanceReference;
    if (
      typeof reference === 'object'
      && reference !== null
      && 'id' in reference
      && typeof reference.id === 'string'
      && 'sourceTool' in reference
      && typeof reference.sourceTool === 'string'
    ) {
      return { id: reference.id, sourceTool: reference.sourceTool };
    }
    return undefined;
  }

  async cleanup(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    await this.client.close();
  }
}

export function createAgent44ProxyClient(
  stdioCommand: string,
  stdin: NodeJS.ReadableStream,
  stdout: NodeJS.WritableStream,
  options?: Agent44ProxyClientOptions,
): Agent44ProxyClient {
  return new Agent44ProxyClient(stdioCommand, stdin, stdout, options);
}
