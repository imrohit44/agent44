import Callout from "./Callout";
import PageHeader from "./PageHeader";
import Section from "./Section";

const requestComponents = [
  { index: "01", name: "AI Agent", detail: "Chooses to request a tool" },
  { index: "02", name: "MCP client", detail: "Connects over stdio" },
  { index: "03", name: "Agent44 proxy", detail: "Routes MCP requests" },
  { index: "04", name: "MCP server", detail: "Exposes downstream tools" },
];

const lifecycle = [
  {
    title: "The client starts Agent44",
    description:
      "The TypeScript client launches and connects to the configured Agent44 proxy process over MCP stdio.",
  },
  {
    title: "The proxy initializes downstream",
    description:
      "During its server lifespan, the Python proxy starts the configured downstream MCP server, initializes an MCP session, and reuses that session for upstream requests.",
  },
  {
    title: "Tool discovery is forwarded",
    description:
      "A tools/list request is sent to the downstream session. The proxy returns the downstream tool descriptors; this path does not run policy evaluation.",
  },
  {
    title: "An eligible tool call reaches the proxy",
    description:
      "A tools/call request enters the proxy. If no policy was configured, the proxy forwards the call without policy enforcement. With a policy, it evaluates the request before forwarding.",
  },
  {
    title: "The policy engine resolves the call",
    description:
      "Deterministic rules run first. A configured adapter is consulted only when those rules leave the request unresolved and the tool is listed as adapter-eligible.",
  },
  {
    title: "Allow continues; deny stops at the proxy",
    description:
      "An allow decision permits the proxy to send the call downstream. A deny decision returns a tool-level error and does not invoke the downstream tool.",
  },
  {
    title: "The outcome returns to the client",
    description:
      "The downstream result or error is returned for forwarded calls; policy denials are returned by the proxy. Optional observation records do not change the tool-call result.",
  },
];

function ArchitectureDiagram() {
  return (
    <figure
      aria-labelledby="architecture-diagram-title"
      className="architecture-diagram"
      id="system-map"
    >
      <div className="architecture-diagram__heading">
        <div>
          <p className="architecture-overline">SYSTEM MAP / MCP STDIO</p>
          <h2 id="architecture-diagram-title">One proxy, two request paths.</h2>
        </div>
        <span className="architecture-diagram__legend">
          <span aria-hidden="true" />
          REQUEST / RESULT FLOW
        </span>
      </div>

      <ol aria-label="MCP system components in request order" className="architecture-components">
        {requestComponents.map((component) => (
          <li className="architecture-component" key={component.index}>
            <span className="architecture-component__index">{component.index}</span>
            <strong>{component.name}</strong>
            <span>{component.detail}</span>
          </li>
        ))}
      </ol>

      <div className="architecture-lanes">
        <section
          aria-labelledby="discovery-path-title"
          className="architecture-lane architecture-lane--discovery"
        >
          <div className="architecture-lane__label">
            <span className="architecture-overline">PATH A</span>
            <h3 id="discovery-path-title">Tool discovery</h3>
            <p><code>tools/list</code></p>
          </div>
          <ol aria-label="Tool discovery is forwarded without policy evaluation" className="architecture-path">
            <li>MCP client</li>
            <li>Agent44 proxy</li>
            <li>Downstream server returns tool definitions</li>
          </ol>
          <p className="architecture-lane__note">
            Forwarded through the proxy; no policy decision is made for discovery.
          </p>
        </section>

        <section
          aria-labelledby="call-path-title"
          className="architecture-lane architecture-lane--call"
        >
          <div className="architecture-lane__label">
            <span className="architecture-overline">PATH B</span>
            <h3 id="call-path-title">Tool execution</h3>
            <p><code>tools/call</code></p>
          </div>
          <ol aria-label="Tool call request path" className="architecture-path">
            <li>MCP client</li>
            <li>Agent44 proxy</li>
            <li className="architecture-path__decision">Policy evaluation<br /><span>when enabled</span></li>
          </ol>

          <div className="architecture-adapter">
            <span className="architecture-overline">OPTIONAL DECISION ADAPTER</span>
            <p>
              Consulted only for an unresolved call to a configured
              adapter-eligible tool. It returns a decision; it does not invoke
              or reformat the downstream tool call.
            </p>
          </div>

          <div className="architecture-outcomes">
            <div className="architecture-outcome architecture-outcome--allow">
              <span className="architecture-outcome__label">ALLOW</span>
              <span className="architecture-outcome__route">
                Forward call <span aria-hidden="true">→</span> Downstream MCP server
                <span aria-hidden="true">→</span> Tool execution
              </span>
            </div>
            <div className="architecture-outcome architecture-outcome--deny">
              <span className="architecture-outcome__label">DENY</span>
              <span className="architecture-outcome__route">
                Block at proxy <span aria-hidden="true">→</span> Return tool error to client
              </span>
            </div>
          </div>

          <div className="architecture-sidechannels">
            <div>
              <span className="architecture-overline">OPTIONAL / OBSERVATION</span>
              <p>
                A configured JSONL observer records call outcomes separately;
                it does not change the response.
              </p>
            </div>
            <div>
              <span className="architecture-overline">MCP META / PROVENANCE REFERENCE</span>
              <p>
                A reference may be forwarded as metadata. Transport alone does
                not validate it or grant authorization.
              </p>
            </div>
          </div>
        </section>
      </div>

      <figcaption className="architecture-diagram__caption">
        The proxy returns downstream results for forwarded calls and its own
        tool-level error for denials. With no policy configured, tool calls
        bypass policy evaluation and are forwarded.
      </figcaption>
    </figure>
  );
}

function StageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="architecture-section-heading">
      <p className="architecture-overline">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  );
}

export default function Architecture() {
  return (
    <div className="architecture-page">
      <section aria-labelledby="architecture-title" className="architecture-intro">
        <div className="site-container">
          <PageHeader
            description="Follow an MCP tool request through Agent44—from client connection and tool discovery to policy evaluation and downstream execution."
            eyebrow="ARCHITECTURE / REQUEST LIFECYCLE"
            title="Understand every decision between agent and tool."
          />
          <div className="architecture-intro__overview">
            <p>
              <span>AGENT</span>
              <span aria-hidden="true">→</span>
              <span>MCP CLIENT</span>
              <span aria-hidden="true">→</span>
              <span>AGENT44 PROXY</span>
              <span aria-hidden="true">→</span>
              <span>DOWNSTREAM MCP SERVER</span>
            </p>
            <a href="#system-map">View the system map <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </section>

      <Section className="architecture-map-section">
        <ArchitectureDiagram />
      </Section>

      <Section className="architecture-lifecycle" id="lifecycle">
        <StageHeading
          description="The downstream MCP session is established before the proxy handles requests. Discovery and tool execution then follow different paths."
          eyebrow="01 / REQUEST LIFECYCLE"
          title="From connection to outcome."
        />
        <ol className="architecture-timeline">
          {lifecycle.map((stage, index) => (
            <li className="architecture-timeline__item" key={stage.title}>
              <span aria-hidden="true" className="architecture-timeline__number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{stage.title}</h3>
                <p>{stage.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="architecture-decisions" id="decisions">
        <StageHeading
          description="A decision controls whether this proxy forwards the eligible call. It does not certify that all unsafe requests have been identified."
          eyebrow="02 / POLICY OUTCOMES"
          title="Allow is permission to proceed. Deny is a stop at the proxy."
        />
        <div className="architecture-decision-compare">
          <article className="architecture-decision architecture-decision--allow">
            <p className="architecture-overline">DECISION / ALLOW</p>
            <h3>The call proceeds downstream.</h3>
            <p>
              When the configured policy resolves a call as allowed, Agent44
              sends the tool name and business arguments to the downstream MCP
              session. The resulting tool response is returned to the client.
            </p>
            <p className="architecture-decision__route">
              POLICY ALLOWS <span aria-hidden="true">→</span> PROXY FORWARDS
              <span aria-hidden="true">→</span> TOOL RUNS
            </p>
          </article>
          <article className="architecture-decision architecture-decision--deny">
            <p className="architecture-overline">DECISION / DENY</p>
            <h3>The call stops at the proxy.</h3>
            <p>
              Agent44 returns a tool-level error to the MCP client. The
              downstream server is not called for this denied request.
            </p>
            <p className="architecture-decision__route">
              POLICY DENIES <span aria-hidden="true">→</span> PROXY BLOCKS
              <span aria-hidden="true">→</span> NO TOOL INVOCATION
            </p>
          </article>
        </div>
      </Section>

      <Section className="architecture-components-section" id="components">
        <StageHeading
          description="Each component has a bounded role in the request path."
          eyebrow="03 / COMPONENTS"
          title="The parts and their responsibilities."
        />
        <dl className="architecture-responsibilities">
          <div>
            <dt>TypeScript MCP client</dt>
            <dd>
              Starts and connects to a configured proxy command over stdio,
              lists tools, calls tools, and closes the client connection. It
              can forward a provenance reference in MCP metadata.
            </dd>
          </div>
          <div>
            <dt>Python MCP proxy</dt>
            <dd>
              Manages the downstream MCP process and session, forwards tool
              discovery, and handles tool calls. When given a policy, it runs
              the decision before forwarding a call.
            </dd>
          </div>
          <div>
            <dt>Policy engine</dt>
            <dd>
              Applies deterministic rules in precedence order, including
              hard-deny rules. It invokes an adapter only for explicitly
              configured eligible tools whose calls remain unresolved.
            </dd>
          </div>
          <div>
            <dt>Optional decision adapter</dt>
            <dd>
              Supplies an ALLOW or DENY at the adapter tier; it does not
              override an earlier deterministic decision. Adapter errors,
              invalid or undecided outputs, missing adapters, and timeouts
              fail closed to DENY.
            </dd>
          </div>
          <div>
            <dt>Downstream MCP server</dt>
            <dd>
              Advertises its tools and receives only calls the proxy forwards.
              It executes a forwarded tool call and returns its result.
            </dd>
          </div>
        </dl>
      </Section>

      <Section className="architecture-boundaries" id="boundaries">
        <StageHeading
          description="Understand what the current execution path enforces—and what it does not establish."
          eyebrow="04 / TRUST BOUNDARIES"
          title="A policy boundary, not a universal security guarantee."
        />
        <ul className="architecture-boundary-list">
          <li>
            Policy evaluation applies to eligible <code>tools/call</code>{" "}
            requests only when a policy is configured.
          </li>
          <li>
            <code>tools/list</code> discovery is forwarded; it is not passed
            through policy evaluation.
          </li>
          <li>
            A <code>_meta.provenanceReference</code> transported by the
            TypeScript client is metadata forwarding. The reference by itself
            does not establish registry validation or authorization.
          </li>
          <li>
            The proxy can optionally write observations to a JSONL observer.
            Observation is a separate, non-intrusive side path and does not
            change the tool-call result.
          </li>
          <li>
            A model-based adapter is an optional decision input at a
            restricted policy tier, not a substitute for deterministic
            enforcement. Model judgment and rule evaluation are distinct.
          </li>
          <li>
            An ALLOW means this policy resolved the request as allowed; it is
            not proof that the request is safe or that every attack is
            prevented. Agent44 is an engineering experiment.
          </li>
        </ul>
        <Callout title="Keep the boundary precise" tone="warning">
          <p>
            Provenance metadata transport, policy decisions, and downstream
            tool execution are separate steps. Do not treat metadata supplied
            by a client as verified provenance or as authorization evidence.
          </p>
        </Callout>
      </Section>
    </div>
  );
}
