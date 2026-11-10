import PageHeader from "./PageHeader";
import Section from "./Section";

const milestones = [
  {
    date: "2026-10-12",
    category: "FOUNDATION",
    title: "MCP stdio proxy and strict policy engine",
    description:
      "The repository history records the transparent stdio proxy, a demo server, a strict YAML policy engine, and the initial observation/evaluation foundation.",
    links: [
      {
        label: "Proxy foundation commit",
        href: "https://github.com/imrohit44/Agent44/commit/e06c70e04e9945bccac077615cea8494fe4b93ba",
      },
      {
        label: "Observation and evaluation foundation",
        href: "https://github.com/imrohit44/Agent44/commit/64a44b6bc1596610a995fadbdb9ce5420d9a2633",
      },
      {
        label: "Policy engine commit",
        href: "https://github.com/imrohit44/Agent44/commit/956ddd15fcf1059c815b8bd623bc6e5c1c7a9d85",
      },
    ],
  },
  {
    date: "2026-10-13",
    category: "DECISION MODEL",
    title: "Deterministic precedence and optional adapters",
    description:
      "The policy engine gained hard-deny behavior and a restricted adapter tier. Model-based and replay adapters were added for unresolved, explicitly eligible calls.",
    links: [
      {
        label: "Model adapter implementation",
        href: "https://github.com/imrohit44/Agent44/commit/75305e1b8ffeb3b835d32fd5ef6d08f96ad610d3",
      },
      {
        label: "Policy hard-deny precedence",
        href: "https://github.com/imrohit44/Agent44/commit/f918c6471beca8cc46bed0e5d8ff40977e56d51f",
      },
    ],
  },
  {
    date: "2026-10-18",
    category: "PROVENANCE MODEL",
    title: "Trust classes, lineage, and delegation work",
    description:
      "Python provenance tracking and taint concepts were implemented, followed by explicit delegation and transfer mechanisms. These repository components are distinct from the TypeScript metadata forwarding path.",
    links: [
      {
        label: "Provenance implementation",
        href: "https://github.com/imrohit44/Agent44/commit/e9c56cb8d89057ebc569b3d10a3b75c24fce33a4",
      },
      {
        label: "Delegation implementation",
        href: "https://github.com/imrohit44/Agent44/commit/facb43838dc428ed7577612036082eeff0b06f43",
      },
    ],
  },
  {
    date: "2026-10-21",
    category: "EVALUATION",
    title: "Phase 10 backend comparison documented",
    description:
      "A frozen report records a 94-scenario synthetic development-corpus comparison between rules-only decisions and rules with a local judge. The report documents metric scope and limitations; it is not end-to-end attack testing.",
    links: [
      {
        label: "Phase 10 report",
        href: "https://github.com/imrohit44/Agent44/blob/main/evaluation/PHASE_10_BACKEND_EVALUATION_REPORT.md",
      },
      {
        label: "Evaluation methodology",
        href: "https://github.com/imrohit44/Agent44/blob/main/docs/evaluation.md",
      },
    ],
  },
  {
    date: "2026-11-02",
    category: "TYPESCRIPT CLIENT",
    title: "TypeScript client work begins",
    description:
      "Git history records the initial TypeScript client source, followed by package setup and a provenance propagation demo.",
    links: [
      {
        label: "Initial client source",
        href: "https://github.com/imrohit44/Agent44/commit/ffcc817d4073acdf65c0cbbecbc9701ea108c289",
      },
      {
        label: "TypeScript client guide",
        href: "https://github.com/imrohit44/Agent44/blob/main/docs/typescript-client.md",
      },
    ],
  },
  {
    date: "2026-11-05",
    category: "MCP STDIO INTEGRATION",
    title: "Real client-to-proxy integration verified",
    description:
      "The v0.2.0 release source adds actual MCP stdio session initialization, discovery, tool calls, process options, and cleanup, with local integration coverage through the Python proxy.",
    links: [
      {
        label: "Integration implementation commit",
        href: "https://github.com/imrohit44/Agent44/commit/9a445098f112a1461dc04bb748aed14076b69465",
      },
    ],
  },
  {
    date: "2026-11-05",
    category: "PUBLISHED RELEASES",
    title: "npm 0.1.0, npm 0.2.0, and GitHub v0.2.0",
    description:
      "The npm registry records 0.1.0 and 0.2.0 publication on this date. Version 0.2.0 is tagged to the release source commit; the GitHub release was published later that day.",
    links: [
      {
        label: "npm package and versions",
        href: "https://www.npmjs.com/package/@imrohit44/agent44-ts-client",
      },
      {
        label: "GitHub v0.2.0 release",
        href: "https://github.com/imrohit44/Agent44/releases/tag/v0.2.0",
      },
      {
        label: "v0.2.0 source commit",
        href: "https://github.com/imrohit44/Agent44/commit/fa6cfd800275fd79e3b5335a62eeeea322bc5d49",
      },
    ],
  },
  {
    date: "2026-11-09",
    category: "TYPESCRIPT SDK 0.3.0",
    title: "Lifecycle reliability released on npm",
    description:
      "The npm registry records publication of v0.3.0 with caller-isolated connection cancellation, configurable timeouts, request cancellation, typed lifecycle errors, and retryable transport cleanup. Stdio child-process exit remains best-effort and is not independently confirmed.",
    links: [
      {
        label: "npm v0.3.0 package",
        href: "https://www.npmjs.com/package/@imrohit44/agent44-ts-client",
      },
      {
        label: "v0.3.0 changelog",
        href: "https://github.com/imrohit44/agent44/blob/main/typescript/CHANGELOG.md",
      },
      {
        label: "GitHub v0.3.0 release",
        href: "https://github.com/imrohit44/agent44/releases/tag/v0.3.0",
      },
    ],
  },
];

export default function Journey() {
  return (
    <div className="journey-page">
      <section className="journey-intro">
        <div className="site-container">
          <PageHeader
            description="A source-linked account of Agent44’s evolution, based on repository commits, frozen reports, package registry records, and the published release."
            eyebrow="PROJECT JOURNEY / VERIFIED MILESTONES"
            title="From policy boundary to MCP client integration."
          />
          <p className="journey-date-note">
            Dates are shown as calendar dates. Commit dates come from Git
            history; package dates come from npm registry metadata; the v0.2.0
            GitHub release publication date comes from GitHub Releases.
          </p>
        </div>
      </section>

      <Section className="journey-timeline">
        <ol className="journey-list">
          {milestones.map((milestone, index) => (
            <li className="journey-item" key={`${milestone.date}-${milestone.category}`}>
              <div className="journey-item__marker">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span aria-hidden="true" />
              </div>
              <article className="journey-item__content">
                <div className="journey-item__meta">
                  <time dateTime={milestone.date}>{milestone.date}</time>
                  <span>{milestone.category}</span>
                </div>
                <h2>{milestone.title}</h2>
                <p>{milestone.description}</p>
                <nav aria-label={`${milestone.title} sources`} className="journey-item__links">
                  {milestone.links.map((link) => (
                    <a href={link.href} key={link.label}>
                      {link.label} <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                </nav>
              </article>
            </li>
          ))}
        </ol>
        <p className="journey-endnote">
          This timeline records milestones with verifiable source dates. It
          does not claim that every engineering activity or intermediate
          release is represented.
        </p>
      </Section>
    </div>
  );
}
