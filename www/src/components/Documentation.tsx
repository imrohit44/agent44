import { useState, type ReactNode } from "react";
import PageHeader from "./PageHeader";
import CodeBlock from "./CodeBlock";

const documentationSections = [
  { id: "overview", label: "Overview" },
  { id: "installation", label: "Installation" },
  { id: "quickstart", label: "Quickstart" },
  { id: "configuration", label: "Configuration" },
  { id: "integration", label: "Integration" },
  { id: "api-reference", label: "API reference" },
  { id: "boundaries", label: "Boundaries" },
];

const installCommand = "npm install @imrohit44/agent44-ts-client";

const quickstart = `import path from "node:path";
import { createAgent44ProxyClient } from "@imrohit44/agent44-ts-client";

const agent44Root = process.env.AGENT44_REPO;
if (!agent44Root) {
  throw new Error("Set AGENT44_REPO to the Agent44 repository directory.");
}

const client = createAgent44ProxyClient(
  "uv",
  process.stdin,
  process.stdout,
  {
    args: [
      "run", "--project", agent44Root, "--",
      "python", "-m", "agent44.proxy",
      "--policy", path.join(agent44Root, "evaluation", "demo.yaml"),
      "--",
      "uv", "run", "--project", agent44Root, "--",
      "python", "-m", "agent44.demo_server",
    ],
    cwd: agent44Root,
  },
);

try {
  await client.connect();
  const tools = await client.listTools();
  console.log("Available tools:", tools.map((tool) => tool.name));

  const result = await client.callTool("add", { a: 2, b: 3 });
  if (!result.success) {
    throw new Error(result.error ?? "Tool call failed");
  }
  console.log("Result:", result.text);
} finally {
  await client.cleanup();
}`;

function CopyableCode({
  code,
  label,
  language,
}: {
  code: string;
  label: string;
  language: string;
}) {
  const [status, setStatus] = useState("");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Copied to clipboard.");
    } catch {
      setStatus("Clipboard unavailable. Select and copy the code manually.");
    }
  }

  return (
    <div className="docs-code">
      <div className="docs-code__toolbar">
        <span className="docs-code__label">{label}</span>
        <button
          aria-label={`Copy ${label.toLowerCase()} code`}
          className="docs-code__copy"
          onClick={copyCode}
          type="button"
        >
          Copy
        </button>
      </div>
      <CodeBlock code={code} language={language} />
      <span aria-live="polite" className="docs-code__status" role="status">
        {status}
      </span>
    </div>
  );
}

function DocumentationSection({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="docs-section" id={id}>
      <p className="docs-overline">{eyebrow}</p>
      <h2>{title}</h2>
      <div className="docs-section__content">{children}</div>
    </section>
  );
}

export default function Documentation() {
  return (
    <div className="documentation-page">
      <div className="site-container documentation-page__intro">
        <PageHeader
          description="Start with the published TypeScript MCP client, understand its configuration, and follow a tool call through the Agent44 proxy."
          eyebrow="DOCUMENTATION / TYPESCRIPT CLIENT 0.2.0"
          title="Build with Agent44."
        />
      </div>

      <div className="site-container docs-layout">
        <nav aria-label="Documentation sections" className="docs-sidebar">
          <p className="docs-sidebar__title">ON THIS PAGE</p>
          <ul>
            {documentationSections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="docs-content">
          <DocumentationSection
            eyebrow="01 / OVERVIEW"
            id="overview"
            title="A policy boundary for MCP tool calls."
          >
            <p>
              Agent44 is a Python MCP stdio proxy between an MCP client and a
              downstream MCP server. When a policy is configured, eligible
              <code> tools/call </code> requests are evaluated before
              forwarding. Tool discovery is forwarded separately; without a
              policy, calls are forwarded without policy enforcement.
            </p>
            <p>
              The published TypeScript client provides MCP stdio connection,
              tool discovery, tool calls, and cleanup. It starts the configured
              proxy command as a child process; it does not bundle the Python
              proxy or install its dependencies.
            </p>
            <p>
              Policy decisions do not guarantee comprehensive attack
              prevention. Provenance metadata transport does not itself verify
              provenance or authorize a call.
            </p>
            <a
              className="docs-inline-link"
              href="https://github.com/imrohit44/Agent44/blob/main/docs/architecture.md"
            >
              Read the architecture guide <span aria-hidden="true">↗</span>
            </a>
          </DocumentationSection>

          <DocumentationSection
            eyebrow="02 / INSTALLATION"
            id="installation"
            title="Install the published client."
          >
            <p>
              The package requires Node.js 18 or later and is ESM. Install it
              in a JavaScript or TypeScript project:
            </p>
            <CopyableCode
              code={installCommand}
              label="SHELL"
              language="bash"
            />
            <p>
              This installs the TypeScript client only. To run the Agent44
              Python proxy, clone the repository and install its environment
              with <code>uv sync</code>. See the{" "}
              <a href="https://github.com/imrohit44/Agent44/blob/main/docs/development.md">
                development guide
              </a>
              .
            </p>
          </DocumentationSection>

          <DocumentationSection
            eyebrow="03 / QUICKSTART"
            id="quickstart"
            title="Connect, discover, call, and close."
          >
            <p>
              This example assumes the Agent44 repository is checked out,
              <code> uv sync </code> has completed, and{" "}
              <code>AGENT44_REPO</code> points to that repository directory.
              It launches the proxy with the checked-in demo policy and demo
              downstream MCP server.
            </p>
            <CopyableCode
              code={quickstart}
              label="MJS / ESM"
              language="javascript"
            />
            <p>
              Run this from an ESM-enabled Node.js project after installing the
              client, for example with <code>node quickstart.mjs</code>. The
              sample uses <code>uv</code> and the repository&apos;s demo server;
              replace the command and arguments to launch your own compatible
              proxy and downstream server.
            </p>
          </DocumentationSection>

          <DocumentationSection
            eyebrow="04 / CONFIGURATION"
            id="configuration"
            title="Configure the child process explicitly."
          >
            <p>
              The factory takes a command, two compatibility stream arguments,
              and optional child-process options. The SDK starts the child
              process and owns its protocol stdin/stdout; the retained
              <code> stdin </code> and <code> stdout </code> parameters are
              accepted but unused.
            </p>
            <dl className="docs-options">
              <div>
                <dt><code>stdioCommand: string</code></dt>
                <dd>Executable used to start the MCP client transport.</dd>
              </div>
              <div>
                <dt><code>args?: string[]</code></dt>
                <dd>Arguments passed to the executable as separate values.</dd>
              </div>
              <div>
                <dt><code>cwd?: string</code></dt>
                <dd>Working directory supplied to the spawned process.</dd>
              </div>
              <div>
                <dt><code>env?: Record&lt;string, string&gt;</code></dt>
                <dd>Environment options passed to the stdio transport.</dd>
              </div>
            </dl>
            <p>
              Put the Agent44 proxy command and its options in the child
              command/argument list. In proxy mode, <code>--</code> separates
              Agent44 options from the downstream MCP server command. The
              example sets a policy explicitly; the client API does not expose
              a separate policy option.
            </p>
          </DocumentationSection>

          <DocumentationSection
            eyebrow="05 / INTEGRATION"
            id="integration"
            title="The client launches the proxy; the proxy manages downstream."
          >
            <ol className="docs-numbered">
              <li>
                <strong>TypeScript client:</strong> starts the configured
                command through the MCP SDK&apos;s stdio transport and initializes
                an MCP session.
              </li>
              <li>
                <strong>Python proxy:</strong> starts and initializes the
                downstream MCP process in its server lifespan, then reuses
                that session for requests.
              </li>
              <li>
                <strong>Discovery:</strong> <code>tools/list</code> is
                forwarded to the downstream session and its tool descriptors
                are returned.
              </li>
              <li>
                <strong>Tool call:</strong> with policy enabled, the proxy
                evaluates the call before forwarding. A deny returns a
                tool-level error without invoking the downstream tool.
              </li>
              <li>
                <strong>Cleanup:</strong> call <code>cleanup()</code> to close
                the MCP client transport and child process.
              </li>
            </ol>
            <a
              className="docs-inline-link"
              href="https://github.com/imrohit44/Agent44/blob/main/docs/typescript-client.md"
            >
              TypeScript client implementation notes <span aria-hidden="true">↗</span>
            </a>
          </DocumentationSection>

          <DocumentationSection
            eyebrow="06 / API REFERENCE"
            id="api-reference"
            title="Public exports."
          >
            <div className="docs-api-list">
              <article>
                <h3><code>createAgent44ProxyClient(...)</code></h3>
                <p>
                  Factory returning an <code>Agent44ProxyClient</code>. It
                  takes the executable, Node.js readable and writable stream
                  arguments, and optional <code>Agent44ProxyClientOptions</code>.
                </p>
              </article>
              <article>
                <h3><code>Agent44ProxyClient</code></h3>
                <p>
                  Constructible client exposing <code>connect()</code>,
                  <code> listTools()</code>, <code>callTool()</code>,
                  <code> extractProvenance()</code>, and <code>cleanup()</code>.
                </p>
              </article>
              <article>
                <h3><code>connect(): Promise&lt;void&gt;</code></h3>
                <p>
                  Starts the MCP connection and initializes the session.
                  <code> listTools()</code> and <code>callTool()</code> connect
                  automatically when needed.
                </p>
              </article>
              <article>
                <h3><code>listTools(): Promise&lt;Tool[]&gt;</code></h3>
                <p>
                  Connects if needed and returns the MCP SDK tool descriptors.
                  The <code>Tool</code> type comes from the MCP SDK, not a
                  named export of this package.
                </p>
              </article>
              <article>
                <h3>
                  <code>callTool(name, args, provenance?)</code>
                </h3>
                <p>
                  Calls a named tool with a <code>Record&lt;string,
                  unknown&gt;</code> of business arguments and an optional{" "}
                  <code>ProvenanceReference</code>. Returns{" "}
                  <code>ToolCallResult</code>; task-based MCP tool results are
                  not supported and throw an error.
                </p>
              </article>
              <article>
                <h3><code>ProvenanceReference</code></h3>
                <p>
                  Type shape: <code>{"{ id: string; sourceTool: string }"}</code>.
                  When supplied to <code>callTool</code>, it is attached to MCP
                  request <code>_meta.provenanceReference</code>.
                </p>
              </article>
              <article>
                <h3><code>ToolCallResult</code></h3>
                <p>
                  <code>success: boolean</code>, <code>text: string | null</code>,
                  <code> error: string | null</code>, and optional{" "}
                  <code>provenance: ProvenanceReference</code>. Text is taken
                  from the first text content item, when present.
                </p>
              </article>
              <article>
                <h3>
                  <code>
                    extractProvenance(result: MCPCallToolResult):
                    ProvenanceReference | undefined
                  </code>
                </h3>
                <p>
                  Accepts the MCP SDK&apos;s <code>MCPCallToolResult</code>,
                  then reads <code>provenanceReference</code> from its{" "}
                  <code>_meta</code> and returns it when both <code>id</code>{" "}
                  and <code>sourceTool</code> are strings; otherwise it returns
                  <code> undefined</code>. This shape check is not registry
                  validation.
                </p>
              </article>
              <article>
                <h3><code>cleanup(): Promise&lt;void&gt;</code></h3>
                <p>
                  Closes the MCP client and transport. Cleanup can be called
                  more than once; later connection attempts reject because the
                  client is closed.
                </p>
              </article>
              <article>
                <h3><code>Agent44ProxyClientOptions</code></h3>
                <p>
                  Optional <code>args</code>, <code>cwd</code>, and{" "}
                  <code>env</code> properties described in{" "}
                  <a href="#configuration">Configuration</a>.
                </p>
              </article>
            </div>
            <p>
              The constructor and factory also take <code>stdin</code> and{" "}
              <code>stdout</code> parameters for compatibility. The package
              entry point is ESM and exports these client/type symbols; it does
              not export <code>Tool</code> from the MCP SDK.
            </p>
          </DocumentationSection>

          <DocumentationSection
            eyebrow="07 / BOUNDARIES"
            id="boundaries"
            title="Transport is not provenance validation."
          >
            <p>
              The client can add a provenance reference to MCP request
              metadata and extract a reference from response metadata. In
              v0.2.0, the proxy forwards a dictionary-valued reference to the
              downstream server; this metadata transport does not validate
              the reference against the Python provenance registry or use it
              as policy evidence.
            </p>
            <p>
              Policy decisions apply only to eligible tool calls when policy
              is enabled. A decision is not a guarantee of comprehensive
              attack prevention or production security.
            </p>
            <div className="docs-related-links">
              <a href="https://github.com/imrohit44/Agent44/blob/main/docs/policy-engine.md">
                Policy engine guide <span aria-hidden="true">↗</span>
              </a>
              <a href="https://github.com/imrohit44/Agent44/blob/main/docs/provenance.md">
                Provenance guide <span aria-hidden="true">↗</span>
              </a>
              <a href="https://github.com/imrohit44/Agent44/blob/main/README.md">
                Project README <span aria-hidden="true">↗</span>
              </a>
            </div>
          </DocumentationSection>
        </div>
      </div>
    </div>
  );
}
