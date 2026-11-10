import Callout from "./Callout";
import CodeBlock from "./CodeBlock";
import PageHeader from "./PageHeader";
import Section from "./Section";

const releaseLinks = [
  {
    href: "https://github.com/imrohit44/agent44",
    label: "GitHub repository",
    detail: "Source and project documentation",
  },
  {
    href: "https://www.npmjs.com/package/@imrohit44/agent44-ts-client",
    label: "npm package",
    detail: "@imrohit44/agent44-ts-client",
  },
  {
    href: "https://github.com/imrohit44/agent44/releases/tag/v0.3.0",
    label: "GitHub release",
    detail: "Agent44 TypeScript SDK v0.3.0",
  },
  {
    href: "https://github.com/imrohit44/agent44/blob/main/typescript/CHANGELOG.md",
    label: "Changelog",
    detail: "SDK release history",
  },
];

export default function Releases() {
  return (
    <div className="releases-page">
      <section className="releases-intro">
        <div className="site-container">
          <PageHeader
            description="Published package details and the verified scope of the Agent44 TypeScript client release."
            eyebrow="RELEASES / PUBLISHED"
            title="Agent44 TypeScript SDK v0.3.0."
          />
        </div>
      </section>

      <Section className="release-current">
        <div className="release-current__heading">
          <div>
            <p className="release-overline">CURRENT PUBLISHED RELEASE</p>
            <h2>0.3.0</h2>
          </div>
          <span className="release-status">
            <span aria-hidden="true" />
            AVAILABLE ON NPM
          </span>
        </div>

        <p className="release-package">
          <span>PACKAGE</span>
          <strong>@imrohit44/agent44-ts-client</strong>
        </p>

        <div className="release-install">
          <div>
            <p className="release-overline">INSTALL</p>
            <p>Node.js 18 or later · ESM</p>
          </div>
          <CodeBlock
            code="npm install @imrohit44/agent44-ts-client"
            language="bash"
          />
        </div>

        <nav aria-label="Release resources" className="release-links">
          {releaseLinks.map((link) => (
            <a href={link.href} key={link.label}>
              <span>
                <strong>{link.label}</strong>
                <span>{link.detail}</span>
              </span>
              <span aria-hidden="true">↗</span>
            </a>
          ))}
        </nav>
      </Section>

      <Section className="release-highlights">
        <header className="release-section-heading">
          <p className="release-overline">WHAT SHIPPED</p>
          <h2>More reliable MCP client lifecycle.</h2>
          <p>
            Version 0.3.0 builds on the stdio transport introduced in 0.2.0
            with explicit connection and request lifecycle controls.
          </p>
        </header>

        <ol className="release-changes">
          <li>
            <span>01</span>
            <div>
              <h3>Isolate connection cancellation</h3>
              <p>
                A caller can cancel its wait without cancelling a connection
                attempt shared with other callers. Explicit cleanup cancels
                startup for everyone waiting on it.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Bound and cancel requests</h3>
              <p>
                Connection and request timeouts are configurable. Request
                cancellation cleans up client-side pending work but does not
                guarantee that a downstream tool stops executing.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Retry failed cleanup</h3>
              <p>
                Concurrent cleanup calls share one operation. Successful
                cleanup is idempotent; if transport closure fails, the client
                reports the error and allows a later cleanup attempt.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>Use typed lifecycle errors</h3>
              <p>
                Explicit client states and error codes distinguish policy tool
                errors from connection, timeout, cancellation, and cleanup
                failures.
              </p>
            </div>
          </li>
        </ol>
      </Section>

      <Section className="release-verification">
        <header className="release-section-heading">
          <p className="release-overline">VERIFICATION SCOPE</p>
          <h2>What the integration check exercised.</h2>
          <p>
            The repository source was checked with a local deterministic MCP
            server through the Python proxy. The npm registry confirms that
            version 0.3.0 is published.
          </p>
        </header>
        <ul className="release-verification__list">
          <li>Deterministic connection, cancellation, timeout, and cleanup reliability tests</li>
          <li>Real MCP stdio initialization, discovery, and tool-call integration</li>
          <li>Policy denial including no downstream execution for denied calls</li>
          <li>Metadata round-trip and unknown-tool error handling</li>
        </ul>
        <Callout title="Release boundary" tone="warning">
          <p>
            These checks demonstrate the tested integration behavior; they do
            not establish comprehensive attack prevention, production
            security, or end-to-end provenance enforcement. Using the proxy
            also requires the Agent44 Python project and its dependencies.
            Client cancellation does not guarantee downstream tool
            termination.
          </p>
        </Callout>
        <Callout title="Stdio shutdown limitation" tone="warning">
          <p>
            <code>cleanup()</code> delegates transport shutdown to the MCP SDK.
            For stdio transports, child-process termination is best-effort;
            successful cleanup does not independently confirm that the child
            process has exited. Applications requiring strict process-exit
            confirmation should monitor the child process separately.
          </p>
        </Callout>
      </Section>

      <Section className="release-version-note">
        <p>
          <span className="release-overline">VERSION CONTEXT</span>
          Published <strong>0.3.0</strong> adds lifecycle reliability to the
          stdio transport introduced in <strong>0.2.0</strong>. Published
          <strong>0.1.0</strong> predates that transport. Planned work is not
          part of this release.
        </p>
        <Callout title="Published package README" tone="warning">
          <p>
            The published v0.3.0 npm tarball still contains pre-release README
            text. The current repository README and changelog are accurate;
            the published archive is immutable, and this synchronization does
            not publish another npm version.
          </p>
        </Callout>
      </Section>
    </div>
  );
}
