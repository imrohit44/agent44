// TypeScript client tests for Agent44-ts-client
// Milestone 3C - Provenance propagation verification

import {
  Agent44ProxyClient,
  createAgent44ProxyClient,
  type ProvenanceReference,
  type ToolCallResult,
} from './index.js';
import type { CallToolResult as MCPCallToolResult } from '@modelcontextprotocol/sdk/types.js';
import assert from 'node:assert/strict';

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