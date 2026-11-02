// TypeScript client adapter for Agent44 provenance propagation
// Milestone 3C.1
// Uses @modelcontextprotocol/sdk v1 - MCP stdio transport

import {
  StdioClientTransport,
  StdioServerTransport,
  MCPClient,
  MCPToolResponse,
  ProvenanceReference as SDKProvenanceReference,
} from '@modelcontextprotocol/sdk';

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
  private readonly client: MCPClient;
  private readonly transport: StdioClientTransport;

  constructor(stdioCommand: string, stdin: NodeJS.ReadableStream, stdout: NodeJS.WritableStream) {
    this.transport = new StdioClientTransport({
      command: stdioCommand,
      args: ['--policy', 'policy.yaml', '--'],
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.client = new MCPClient({
      transport: this.transport,
    });
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    provenance?: ProvenanceReference
  ): Promise<ToolCallResult> {
    // Separate provenance metadata from business arguments
    const businessArgs: Record<string, unknown> = { ...args };

    // Build tool call parameters
    const callParams: any = {
      name: toolName,
      arguments: businessArgs,
    };

    // Include provenance reference in _meta if supplied
    // The MCP SDK uses _meta for out-of-band metadata including provenance references
    // The Agent44 proxy (proxy.py lines 350-381) extracts string argument values
    // as provenance references and validates them against the session registry.
    if (provenance) {
      ;(callParams as any)._meta = {
        provenanceReference: {
          id: provenance.id,
          sourceTool: provenance.sourceTool,
        },
      };
    }

    // Execute via MCP stdio transport
    const response: MCPToolResponse = await this.client.callTool({
      name: toolName,
      arguments: businessArgs,
      // _meta is set above
    });

    // Parse response
    const result: ToolCallResult = {
      success: true,
      text: response.content?.[0]?.text ?? null,
      error: response.content?.[0]?.text?.includes('denied') || response.isError
        ? 'Provenance policy denied'
        : null,
      provenance: undefined,
    };

    return this.extractProvenance(result);
  }

  extractProvenance(result: MCPToolResponse): ProvenanceReference | undefined {
    // Extract provenance reference from response _meta
    const meta = result._meta as Record<string, unknown> | undefined;
    if (meta && 'provenanceReference' in meta) {
      const prefin = meta.provenanceReference as Record<string, unknown>;
      if (prefin.id && typeof prefin.id === 'string') {
        return { id: prefin.id, sourceTool: prefin.sourceTool as string | undefined };
      }
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
