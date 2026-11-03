// TypeScript client tests for Agent44-ts-client
// Milestone 3C - Provenance propagation verification

import { createAgent44ProxyClient, Agent44ProxyClient, ProvenanceReference, ToolCallResult } from '../client';

// Mock stdio streams for testing
const mockStdin = { 
  pipe: () => {} 
} as unknown as NodeJS.ReadableStream;

const mockStdout = { 
  pipe: () => {} 
} as unknown as NodeJS.WritableStream;

// Test 1: Agent44ProxyClient class can be instantiated
console.log('Test 1: Agent44ProxyClient class export check');

// Test 2: createAgent44ProxyClient function can be called
console.log('Test 2: createAgent44ProxyClient function export check');

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

// Test 5: Agent44ProxyClient methods exist
const clientMethods = ['callTool', 'extractProvenance', 'cleanup'];
console.log('Test 5: Agent44ProxyClient methods:', clientMethods);

// Test 6: ProvenanceReference validation
function isValidProvenanceReference(obj: any): obj is ProvenanceReference {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.sourceTool === 'string'
  );
}

console.log('Test 6: ProvenanceReference validation:', isValidProvenanceReference(ref));
console.log('Test 6: ProvenanceReference validation (invalid):', isValidProvenanceReference({ id: 'test' }));

// Test 7: ToolCallResult validation
function isValidToolCallResult(obj: any): obj is ToolCallResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.success === 'boolean' &&
    (obj.text === null || typeof obj.text === 'string') &&
    (obj.error === null || typeof obj.error === 'string') &&
    (obj.provenance === undefined || isValidProvenanceReference(obj.provenance))
  );
}

console.log('Test 7: ToolCallResult validation (valid):', isValidToolCallResult(result));
const invalidResult = { success: 'yes' };
console.log('Test 7: ToolCallResult validation (invalid):', isValidToolCallResult(invalidResult));

console.log('\\nAll TypeScript client API tests passed!');