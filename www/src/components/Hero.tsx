import { Link } from "react-router-dom";
import Callout from "./Callout";
import CodeBlock from "./CodeBlock";
import Section from "./Section";

const architectureSteps = [
  {
    label: "01 / SOURCE",
    title: "Agent",
    description: "Requests a tool action",
    kind: "source",
  },
  {
    label: "02 / PROTOCOL",
    title: "MCP client",
    description: "Sends the tool call",
    kind: "protocol",
  },
  {
    label: "03 / GATEWAY",
    title: "Agent44 proxy",
    description: "Receives the request",
    kind: "proxy",
  },
  {
    label: "04 / DECISION",
    title: "Policy decision",
    description: "Evaluates eligible calls",
    kind: "decision",
  },
  {
    label: "05 / DESTINATION",
    title: "MCP tool",
    description: "Runs only when allowed",
    kind: "tool",
  },
];

function ArchitectureDiagram() {
  return (
    <figure
      aria-labelledby="request-flow-title"
      className="home-diagram"
      id="request-flow"
    >
      <div className="home-diagram__topline">
        <p className="home-diagram__label" id="request-flow-title">
          REQUEST PATH / POLICY-ENABLED CALL
        </p>
        <span className="home-diagram__status">
          <span aria-hidden="true" className="home-diagram__status-mark" />
          DECISION BEFORE EXECUTION
        </span>
      </div>

      <ol aria-label="Tool call request path" className="home-diagram__flow">
        {architectureSteps.map((step) => (
          <li
            className={`home-diagram__node home-diagram__node--${step.kind}`}
            key={step.kind}
          >
            <span className="home-diagram__node-label">{step.label}</span>
            <span className="home-diagram__node-title">{step.title}</span>
            <span className="home-diagram__node-description">
              {step.description}
            </span>
          </li>
        ))}
      </ol>

      <div aria-label="Policy outcomes" className="home-diagram__outcomes">
        <div className="home-diagram__outcome home-diagram__outcome--allow">
          <span aria-hidden="true" className="home-diagram__outcome-line" />
          <span className="home-diagram__outcome-label">ALLOW</span>
          <span>Forward the tool call</span>
        </div>
        <div className="home-diagram__outcome home-diagram__outcome--deny">
          <span aria-hidden="true" className="home-diagram__outcome-line" />
          <span className="home-diagram__outcome-label">DENY</span>
          <span>Return a tool error; do not forward</span>
        </div>
      </div>

      <figcaption className="home-diagram__caption">
        Tool discovery is forwarded. Policy decisions apply to eligible tool
        calls when a policy is enabled.
      </figcaption>
    </figure>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="home-section-heading">
      <p className="home-eyebrow">{eyebrow}</p>
      <h2 className="home-section-heading__title">{title}</h2>
      <p className="home-section-heading__description">{description}</p>
    </header>
  );
}

export default function Hero() {
  return (
    <div className="home-page">
      <section aria-labelledby="home-title" className="home-hero">
        <div className="site-container home-hero__grid">
          <div className="home-hero__copy">
            <p className="home-eyebrow">
              OPEN-SOURCE MCP POLICY INFRASTRUCTURE
            </p>
            <h1 className="home-hero__title" id="home-title">
              Give AI agents a controlled path to tools.
            </h1>
            <p className="home-hero__description">
              Agent44 sits between MCP clients and downstream tools, evaluating
              eligible tool calls against policy before execution and making
              decisions easier to inspect.
            </p>
            <div className="home-hero__actions">
              <Link className="home-action home-action--primary" to="/architecture">
                Explore the architecture
                <span aria-hidden="true">→</span>
              </Link>
              <a
                className="home-action home-action--secondary"
                href="https://github.com/imrohit44/agent44"
              >
                View on GitHub
              </a>
            </div>
            <a
              className="home-hero__npm-link"
              href="https://www.npmjs.com/package/@imrohit44/agent44-ts-client"
            >
              Install the TypeScript client
              <span aria-hidden="true">↗</span>
            </a>
          </div>
          <ArchitectureDiagram />
        </div>
        <div aria-hidden="true" className="home-hero__index">
          <span>AGENT44 / MCP TOOL-CALL DECISION LAYER</span>
          <span>POLICY FIRST · EXPLICIT OUTCOMES</span>
        </div>
      </section>

      <Section className="home-problem" id="problem" readingWidth>
        <SectionHeading
          description="An agent can propose a tool call. The downstream server performs it. The boundary between those events is where explicit policy decisions can be applied."
          eyebrow="01 / THE GAP"
          title="A tool call is an action, not just another model response."
        />
        <div className="home-problem__contrast">
          <div>
            <span className="home-overline">WITHOUT A POLICY GATE</span>
            <p>
              A client sends the tool request directly to its connected server.
            </p>
          </div>
          <span aria-hidden="true" className="home-problem__divider" />
          <div>
            <span className="home-overline">WITH AGENT44 POLICY ENABLED</span>
            <p>
              The proxy evaluates an eligible call before deciding whether to
              forward it.
            </p>
          </div>
        </div>
      </Section>

      <Section className="home-how" id="how-it-works">
        <SectionHeading
          description="A small, explicit path from request to outcome. A model does not replace the deterministic policy engine."
          eyebrow="02 / REQUEST LIFECYCLE"
          title="A decision boundary in the tool path."
        />
        <ol className="home-stages">
          <li className="home-stage">
            <span className="home-stage__number">01</span>
            <h3>Receive</h3>
            <p>
              The Agent44 MCP proxy receives client requests and forwards tool
              discovery to the downstream server.
            </p>
          </li>
          <li className="home-stage">
            <span className="home-stage__number">02</span>
            <h3>Evaluate</h3>
            <p>
              When policy is enabled, deterministic rules evaluate the eligible
              tool call before downstream execution.
            </p>
          </li>
          <li className="home-stage">
            <span className="home-stage__number">03</span>
            <h3>Resolve</h3>
            <p>
              A configured adapter may be consulted only for unresolved calls
              to adapter-eligible tools. Adapter failures do not approve a call.
            </p>
          </li>
          <li className="home-stage">
            <span className="home-stage__number">04</span>
            <h3>Forward or deny</h3>
            <p>
              Allowed calls are forwarded. Denied calls return an error without
              being sent to the downstream tool.
            </p>
          </li>
        </ol>
      </Section>

      <Section className="home-inspection" id="inspection">
        <div className="home-inspection__grid">
          <div>
            <SectionHeading
              description="Make the call path and decision scope understandable to the people building and operating an agent integration."
              eyebrow="03 / DESIGNED FOR INSPECTION"
              title="Clear rules. Visible boundaries."
            />
            <ul className="home-inspection__list">
              <li>Explicit policy outcomes before forwarding eligible calls.</li>
              <li>
                Optional observations of denials and completed tool calls.
              </li>
              <li>
                A local integration test that checks denied calls do not reach
                the downstream fixture.
              </li>
            </ul>
          </div>
          <Callout title="Boundary to keep clear" tone="warning">
            <p>
              The TypeScript client can forward{" "}
              <code>_meta.provenanceReference</code> as metadata. The proxy does
              not validate that reference against its provenance registry or
              use it as policy evidence.
            </p>
          </Callout>
        </div>
      </Section>

      <Section className="home-developers" id="developer-entry-points">
        <SectionHeading
          description="Explore the implementation, install the published client, or follow the release source."
          eyebrow="04 / DEVELOPER ENTRY POINTS"
          title="Start with the source."
        />
        <div className="home-resource-list">
          <a
            className="home-resource"
            href="https://github.com/imrohit44/agent44"
          >
            <span>
              <span className="home-resource__type">SOURCE</span>
              <span className="home-resource__title">GitHub repository</span>
            </span>
            <span aria-hidden="true" className="home-resource__arrow">↗</span>
          </a>
          <a
            className="home-resource"
            href="https://www.npmjs.com/package/@imrohit44/agent44-ts-client"
          >
            <span>
              <span className="home-resource__type">TYPESCRIPT / ESM</span>
              <span className="home-resource__title">
                @imrohit44/agent44-ts-client
              </span>
            </span>
            <span aria-hidden="true" className="home-resource__arrow">↗</span>
          </a>
          <a
            className="home-resource"
            href="https://github.com/imrohit44/agent44/tree/main/docs"
          >
            <span>
              <span className="home-resource__type">GUIDES</span>
              <span className="home-resource__title">Documentation</span>
            </span>
            <span aria-hidden="true" className="home-resource__arrow">↗</span>
          </a>
          <a
            className="home-resource"
            href="https://github.com/imrohit44/agent44/releases/tag/v0.2.0"
          >
            <span>
              <span className="home-resource__type">PUBLISHED RELEASE</span>
              <span className="home-resource__title">TypeScript client v0.2.0</span>
            </span>
            <span aria-hidden="true" className="home-resource__arrow">↗</span>
          </a>
        </div>
        <div className="home-install">
          <span className="home-overline">INSTALL THE PUBLISHED CLIENT</span>
          <CodeBlock
            code="npm install @imrohit44/agent44-ts-client@0.2.0"
            language="bash"
          />
        </div>
      </Section>

      <Section className="home-evidence" id="engineering-evidence">
        <SectionHeading
          description="Verification describes what was run and what it covers. It is not a security guarantee."
          eyebrow="05 / ENGINEERING EVIDENCE"
          title="Evidence with its scope attached."
        />
        <div className="home-evidence__grid">
          <div className="home-evidence__item">
            <strong>544</strong>
            <span>Python tests passed in the full repository suite.</span>
          </div>
          <div className="home-evidence__item">
            <strong>5 / 5</strong>
            <span>
              Release-checker steps passed, including tests, lint comparison,
              import checks, and evaluation path integrity check.
            </span>
          </div>
          <div className="home-evidence__item">
            <strong className="home-evidence__word">stdio MCP</strong>
            <span>
              Client-to-proxy-to-local-server integration was exercised,
              including downstream denial assertions.
            </span>
          </div>
          <div className="home-evidence__item">
            <strong className="home-evidence__word">v0.2.0</strong>
            <span>
              TypeScript client published and verified from its release
              tarball.
            </span>
          </div>
        </div>
        <Callout title="Scope" tone="warning">
          <p>
            Test results and policy-decision measurements do not establish
            comprehensive attack prevention, production security, or
            end-to-end provenance enforcement.
          </p>
        </Callout>
      </Section>
    </div>
  );
}
