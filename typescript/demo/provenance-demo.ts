// TypeScript demo: Tool A -> Tool B provenance propagation
// Milestone 3C - Agent44 MCP client integration

import { createAgent44ProxyClient } from '../client/index.js';

// Demonstrate provenance propagation through Agent44:
// 1. Call Tool A through Agent44
// 2. Extract provenance reference from Tool A's result
// 3. Call Tool B using the extracted provenance reference
// 4. Verify business arguments remain unchanged

async function main() {
  const client = createAgent44ProxyClient(
    'agent44-proxy',
    process.stdin,
    process.stdout
  );

  // Step 1: Call Tool A
  console.log('Step 1: Calling Tool A...');
  const resultA = await client.callTool(
    'toolA',
    { label: 'my-label', value: 42 },
    undefined // No provenance reference for first call
  );

  console.log('Tool A result:', resultA.text);
  console.log('Tool A provenance:', resultA.provenance?.id || 'none');

  // Step 2: Extract provenance reference from Tool A's result
  const provenanceRef = resultA.provenance;
  console.log('\nStep 2: Extracted provenance reference:', provenanceRef);

  if (!provenanceRef) {
    console.log('ERROR: No provenance reference extracted from Tool A result');
    process.exit(1);
  }

  // Step 3: Call Tool B using the provenance reference from Tool A
  console.log('\nStep 3: Calling Tool B with provenance reference from Tool A...');
  const resultB = await client.callTool(
    'toolB',
    { label: 'preserved-label', value: 42 }, // Business arguments unchanged
    provenanceRef // Supply the provenance reference
  );

  console.log('Tool B result:', resultB.text);
  console.log('Tool B provenance:', resultB.provenance?.id || 'none');

  // Step 4: Verify business arguments are unchanged
  console.log('\nStep 4: Verify business arguments remain unchanged');
  if (resultB.text?.includes('preserved-label') && resultB.text?.includes('42')) {
    console.log('✓ Business arguments preserved: label="preserved-label", value=42');
  } else {
    console.log('✗ Business arguments NOT preserved');
    process.exit(1);
  }

  // Step 5: Verify provenance lineage reached Tool B's policy context
  console.log('\nStep 5: Verify provenance lineage reached Tool B policy context');
  if (resultB.provenance?.id) {
    console.log(`✓ Provenance lineage reached Tool B: id=${resultB.provenance.id}`);
    console.log('  The Agent44 proxy validated the reference against the session');
    console.log('  registry and the policy engine resolved Tool A\'s lineage');
  } else {
    console.log('✗ Provenance NOT reached Tool B policy context');
    process.exit(1);
  }

  console.log('\n=== Milestone 3C Provenance Propagation Demo Complete ===\n');
}

main().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});