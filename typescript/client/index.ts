// TypeScript client adapter for Agent44 provenance propagation
// Milestone 3C.1
// Uses @modelcontextprotocol/sdk v1 - MCP stdio transport

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
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

export class Agent44ProxyClient {
  private readonly client: Client;
  private readonly transport: StdioClientTransport;

  constructor(stdioCommand: string, stdin: NodeJS.ReadableStream, stdout: NodeJS.WritableStream) {
    this.transport = new StdioClientTransport({
      command: stdioCommand,
      args: ['--policy', 'policy.yaml', '--'],
    });
    this.client = new Client({
      name: 'agent44-ts-client',
      version: '1.0.0',
    });
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    provenance?: ProvenanceReference
  ): Promise<ToolCallResult> {
    // Separate provenance metadata from business arguments
    const businessArgs: Record<string, unknown> = { ...args };

    // Build tool call parameters with optional _meta for provenance
    const callParams: CallToolRequestParams = {
      name: toolName,
      arguments: businessArgs,
    };

    // Include provenance reference in _meta if supplied
    // The MCP SDK uses _meta for out-of-band metadata including provenance references
    // The Agent44 proxy (proxy.py) extracts string argument values
    // as provenance references and validates them against the session registry.
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
    const result: ToolCallResult = {
      success: !response.isError,
      text: response.content?.[0]?.type === 'text' ? response.content[0].text : null,
      error: response.content?.[0]?.type === 'text'
        && (response.content[0].text.includes('denied') || response.isError)
        ? 'Provenance policy denied'
        : null,
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
    await this.transport.close();
  }
}

export function createAgent44ProxyClient(
  stdioCommand: string,
  stdin: NodeJS.ReadableStream,
  stdout: NodeJS.WritableStream
): Agent44ProxyClient {
  return new Agent44ProxyClient(stdioCommand, stdin, stdout);
}
