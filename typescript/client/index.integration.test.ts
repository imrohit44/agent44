import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createAgent44ProxyClient,
  type Agent44ProxyClient,
} from './index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const uvCommand = process.env.UV_EXECUTABLE ?? (process.platform === 'win32' ? 'uv.exe' : 'uv');
const policyPath = path.join(repoRoot, 'evaluation', 'demo.yaml');
const metadataServerPath = path.join(
  repoRoot,
  'tests',
  'fixtures',
  'mcp_metadata_echo_server.py',
);

function createProxyClient(
  downstreamArgs: string[],
  enforcePolicy: boolean,
): Agent44ProxyClient {
  const projectRunArgs = ['run', '--project', repoRoot, '--'];
  const args = [
    ...projectRunArgs,
    'python',
    '-m',
    'agent44.proxy',
    ...(enforcePolicy ? ['--policy', policyPath] : []),
    '--',
    uvCommand,
    ...projectRunArgs,
    ...downstreamArgs,
  ];

  return createAgent44ProxyClient(
    uvCommand,
    process.stdin,
    process.stdout,
    { args, cwd: repoRoot },
  );
}

async function testPolicyAndMetadataFlow(): Promise<void> {
  const client = createProxyClient(['python', metadataServerPath], true);
  try {
    await client.connect();
    const tools = await client.listTools();
    assert.deepEqual(new Set(tools.map((tool) => tool.name)), new Set(['add', 'echo']));

    const sum = await client.callTool('add', { a: 2, b: 3 });
    assert.equal(sum.success, true);
    assert.equal(sum.text, '5');
    assert.equal(sum.error, null);

    const reference = { id: 'integration-reference', sourceTool: 'echo' };
    const echo = await client.callTool('echo', { message: 'metadata passed' }, reference);
    assert.equal(echo.success, true);
    assert.equal(echo.text, 'metadata passed');
    assert.deepEqual(echo.provenance, reference);

    const denied = await client.callTool('echo', {
      message: 'must be denied',
      eval: true,
    });
    assert.equal(denied.success, false);
    assert.match(denied.error ?? '', /deny-eval-flag/);

    const unknown = await client.callTool('not_a_tool', {});
    assert.equal(unknown.success, false);
    assert.match(unknown.error ?? '', /denied by policy/);
  } finally {
    await client.cleanup();
  }

  await assert.rejects(clientCallAfterCleanup(client), /has been closed/);
  await client.cleanup();
}

async function testDownstreamToolError(): Promise<void> {
  const client = createProxyClient(['python', metadataServerPath], false);
  try {
    const unknown = await client.callTool('not_a_tool', {});
    assert.equal(unknown.success, false);
    assert.match(unknown.error ?? '', /unknown tool/);
  } finally {
    await client.cleanup();
  }
}

async function clientCallAfterCleanup(client: Agent44ProxyClient): Promise<unknown> {
  return client.callTool('add', { a: 1, b: 2 });
}

await testPolicyAndMetadataFlow();
await testDownstreamToolError();
console.log('Real MCP proxy integration tests passed.');
