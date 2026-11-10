import Callout from "./Callout";
import PageHeader from "./PageHeader";
import Section from "./Section";

const evidence = [
  {
    subject: "Python test suite",
    result: "544 passed",
    scope:
      "Full pytest suite run from the repository root with uv run pytest -q during this website phase.",
    source: "Current checkout; test output verified 2026-11-05.",
  },
  {
    subject: "Release checker",
    result: "5 / 5 checks",
    scope:
      "A historical frozen configuration verification: source assembly, tests, Ruff baseline comparison, imports, and frozen-file hash integrity.",
    source: "evaluation/CONFIGURATION_FREEZE_v1.md; historical snapshot recorded 2026-10-22.",
    sourceHref:
      "https://github.com/imrohit44/Agent44/blob/main/evaluation/CONFIGURATION_FREEZE_v1.md",
  },
  {
    subject: "MCP stdio integration",
    result: "Expanded for v0.3.0",
    scope:
      "Local client → Python proxy → deterministic MCP fixture: initialization, discovery, tool calls, policy denial without downstream execution, metadata round-trip, unknown tool, and cleanup. Separate deterministic tests exercise lifecycle and cancellation behavior.",
    source: "TypeScript integration and reliability tests; published npm v0.3.0 package.",
    sourceHref:
      "https://www.npmjs.com/package/@imrohit44/agent44-ts-client",
  },
  {
    subject: "TypeScript package",
    result: "0.3.0 published",
    scope:
      "Published ESM package with stdio MCP transport, lifecycle states, timeout controls, and cancellation support; this is a release fact, not an assurance level.",
    source: "npm registry; GitHub v0.3.0 release publication remains pending.",
    sourceHref:
      "https://www.npmjs.com/package/@imrohit44/agent44-ts-client",
  },
  {
    subject: "Previous TypeScript package",
    result: "0.2.0 historical",
    scope:
      "Preceding published release that introduced the MCP stdio transport integration.",
    source: "GitHub release v0.2.0.",
    sourceHref:
      "https://github.com/imrohit44/Agent44/releases/tag/v0.2.0",
  },
];

const decisions = [
  {
    title: "Put an explicit proxy at the tool boundary.",
    text:
      "The proxy accepts upstream MCP requests, forwards discovery, and can decide eligible calls before sending them to the downstream MCP server. That makes the policy decision point an explicit component in the execution path.",
  },
  {
    title: "Keep deterministic policy ahead of model judgment.",
    text:
      "The policy engine resolves deterministic tiers first. An adapter is only considered for unresolved calls to configured adapter-eligible tools, and adapter errors, timeouts, invalid output, and unresolved responses fail closed to DENY.",
  },
  {
    title: "Do not turn metadata into trust by implication.",
    text:
      "The TypeScript client can transport a provenance reference through MCP metadata. Transporting caller-provided metadata does not validate it against the Python registry or make it policy evidence.",
  },
  {
    title: "Make process ownership and cleanup explicit.",
    text:
      "The TypeScript client initializes an MCP stdio session, performs discovery and calls through that session, and exposes cleanup() to delegate transport shutdown to the MCP SDK. Stdio child-process termination is best-effort and is not independently confirmed.",
  },
];

const boundaries = [
  {
    title: "Policy scope",
    text:
      "Policy applies to eligible tools/call requests only when a policy is configured. Tool discovery is forwarded. Without a configured policy, tool calls are forwarded without policy enforcement.",
  },
  {
    title: "Rules and adapters",
    text:
      "Deterministic rules take precedence; adapters are optional decision inputs for a restricted unresolved tier. A model decision is judgment, not deterministic proof that a request is safe.",
  },
  {
    title: "Provenance",
    text:
      "_meta.provenanceReference metadata transport in the TypeScript integration is not registry validation, trust elevation, or provenance-based authorization.",
  },
  {
    title: "Failure and availability",
    text:
      "Configured-policy evaluation errors and adapter failures deny rather than approve. This fail-closed behavior may reduce availability; it does not demonstrate that policy covers every unsafe request.",
  },
  {
    title: "System-level security",
    text:
      "A denied call is not forwarded, but the project does not measure whether a multi-step agent objective succeeds. Decision correctness does not establish comprehensive attack prevention.",
  },
];

function EngineeringSectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="engineering-section-heading">
      <p className="engineering-overline">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  );
}

export default function Engineering() {
  return (
    <div className="engineering-page">
      <section className="engineering-intro">
        <div className="site-container">
          <PageHeader
            description="A closer look at Agent44’s design, verification records, and limits. Evidence is labeled by what it actually covers."
            eyebrow="ENGINEERING / EVIDENCE AND BOUNDARIES"
            title="Decisions you can inspect. Claims kept in scope."
          />
          <nav aria-label="Engineering sections" className="engineering-index">
            <a href="#principles">Principles</a>
            <a href="#evidence">Verification</a>
            <a href="#evaluation-method">Evaluation</a>
            <a href="#boundaries">Boundaries</a>
            <a href="#decisions">Decisions</a>
          </nav>
        </div>
      </section>

      <Section className="engineering-principles" id="principles">
        <EngineeringSectionHeading
          description="The system is designed around an explicit per-tool-call decision point—not a claim that the whole agent is secured."
          eyebrow="01 / ENGINEERING PRINCIPLES"
          title="Separate the decision from execution."
        />
        <div className="engineering-principle-list">
          <article>
            <span>01</span>
            <h3>Explicit outcomes</h3>
            <p>
              Policy resolves an eligible call to ALLOW or DENY before a
              policy-enabled request is forwarded.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Bounded responsibilities</h3>
            <p>
              The policy engine decides; the proxy controls downstream
              forwarding; the downstream server executes an allowed call.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Observable outcomes</h3>
            <p>
              An optional JSONL observer records call outcomes and safe
              metadata without changing tool-call result semantics.
            </p>
          </article>
          <article>
            <span>04</span>
            <h3>Reproducible checks</h3>
            <p>
              Tests, a local MCP fixture, and frozen synthetic evaluation
              artifacts make specific implementation behavior inspectable.
            </p>
          </article>
        </div>
      </Section>

      <Section className="engineering-evidence" id="evidence">
        <EngineeringSectionHeading
          description="Each record names its source and scope. Test totals measure test executions, not security outcomes."
          eyebrow="02 / TESTING EVIDENCE"
          title="Verification with provenance."
        />
        <div className="engineering-table-wrap" role="region" aria-label="Engineering evidence" tabIndex={0}>
          <table className="engineering-evidence-table">
            <thead>
              <tr>
                <th scope="col">Evidence</th>
                <th scope="col">Result</th>
                <th scope="col">What it covers</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((item) => (
                <tr key={item.subject}>
                  <th scope="row">{item.subject}</th>
                  <td className="engineering-evidence-table__result">{item.result}</td>
                  <td>{item.scope}</td>
                  <td>
                    {"sourceHref" in item ? (
                      <a href={item.sourceHref}>{item.source}</a>
                    ) : (
                      item.source
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="engineering-footnote">
          The full-suite count is from this phase’s current checkout. The
          release-checker result is historical and comes from the frozen
          configuration record; it is not represented as a fresh run against
          the current checkout. Pytest also emitted the existing
          pytest-asyncio fixture-loop-scope deprecation warning.
        </p>
      </Section>

      <Section className="engineering-evaluation" id="evaluation-method">
        <EngineeringSectionHeading
          description="The frozen artifacts compare per-call policy decisions to registered labels in a synthetic development corpus."
          eyebrow="03 / EVALUATION METHODOLOGY"
          title="Measure a decision, not an attack outcome."
        />
        <div className="engineering-evaluation__body">
          <div className="engineering-method-copy">
            <p>
              Each hand-authored corpus case contains tool arguments, a
              category, a registered expected ALLOW or DENY, and a rationale.
              A result measures whether the observed policy decision agrees
              with that scenario label.
            </p>
            <p>
              Rules-only results are compared with a condition that enables a
              local judge only for eligible, unresolved scenarios. It does
              not replace deterministic rules across all calls.
            </p>
            <p>
              False allow means an expected-DENY case was allowed; false deny
              means an expected-ALLOW case was denied. The evaluation guide
              documents denominator differences for label-based and
              category-based metrics.
            </p>
            <a
              className="engineering-source-link"
              href="https://github.com/imrohit44/Agent44/blob/main/docs/evaluation.md"
            >
              Read metric definitions and reconciliation <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="engineering-comparison" aria-label="Frozen Phase 10 results">
            <p className="engineering-overline">FROZEN PHASE 10 / 94 DEVELOPMENT SCENARIOS</p>
            <div className="engineering-comparison__row">
              <strong>Rules-only</strong>
              <span>94 / 94 agreement</span>
              <span>0 false allows / 45 expected DENY</span>
              <span>0 false denies / 49 expected ALLOW</span>
            </div>
            <div className="engineering-comparison__row engineering-comparison__row--adapter">
              <strong>Rules + local judge</strong>
              <span>90 / 94 agreement</span>
              <span>4 false allows / 45 expected DENY</span>
              <span>0 false denies / 49 expected ALLOW</span>
            </div>
            <p className="engineering-footnote">
              The judge was consulted for six adapter-eligible scenarios across
              three trials (18 calls). Four decisions changed from DENY to
              ALLOW and disagreed with the expected labels.
            </p>
            <a
              className="engineering-source-link engineering-comparison__source"
              href="https://github.com/imrohit44/Agent44/blob/main/evaluation/PHASE_10_BACKEND_EVALUATION_REPORT.md"
            >
              Open the frozen Phase 10 report <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        <Callout title="Evaluation limitation" tone="warning">
          <p>
            The corpus is synthetic, hand-authored, and limited to the
            repository demo tool surface. Held-out evaluation was not
            performed. These metrics measure individual policy decisions;
            they do not measure whether an end-to-end attack objective
            succeeds. Frozen configurations, datasets, and results were not
            rerun or changed for this page.
          </p>
        </Callout>
      </Section>

      <Section className="engineering-boundaries" id="boundaries">
        <EngineeringSectionHeading
          description="The trust boundary is the scope of what the current implementation can demonstrate."
          eyebrow="04 / SECURITY BOUNDARIES"
          title="What the system does—and does not—establish."
        />
        <dl className="engineering-boundary-list">
          {boundaries.map((boundary) => (
            <div key={boundary.title}>
              <dt>{boundary.title}</dt>
              <dd>{boundary.text}</dd>
            </div>
          ))}
        </dl>
        <Callout title="Project status" tone="warning">
          <p>
            Agent44 is an engineering experiment in policy decisions at an
            MCP tool-call boundary. It should not be described as
            comprehensive attack prevention or as a guarantee of production
            security.
          </p>
        </Callout>
      </Section>

      <Section className="engineering-decisions" id="decisions">
        <EngineeringSectionHeading
          description="These decisions are reflected in the current proxy, policy engine, and published TypeScript client."
          eyebrow="05 / ENGINEERING DECISIONS"
          title="Design choices with explicit tradeoffs."
        />
        <ol className="engineering-decision-list">
          {decisions.map((decision, index) => (
            <li key={decision.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{decision.title}</h3>
                <p>{decision.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="engineering-related-links">
          <a href="https://github.com/imrohit44/Agent44/blob/main/docs/architecture.md">
            Architecture guide <span aria-hidden="true">↗</span>
          </a>
          <a href="https://github.com/imrohit44/Agent44/blob/main/docs/policy-engine.md">
            Policy engine guide <span aria-hidden="true">↗</span>
          </a>
          <a href="https://github.com/imrohit44/Agent44/blob/main/docs/provenance.md">
            Provenance guide <span aria-hidden="true">↗</span>
          </a>
          <a href="https://github.com/imrohit44/Agent44/releases/tag/v0.3.0">
            TypeScript v0.3.0 release <span aria-hidden="true">↗</span>
          </a>
          <a href="https://github.com/imrohit44/Agent44/blob/main/typescript/CHANGELOG.md">
            TypeScript changelog <span aria-hidden="true">↗</span>
          </a>
        </div>
      </Section>
    </div>
  );
}
