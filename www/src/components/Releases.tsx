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
    href: "https://github.com/imrohit44/agent44/releases/tag/v0.2.0",
    label: "GitHub release",
    detail: "Agent44 TypeScript Client v0.2.0",
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
            title="Agent44 TypeScript Client v0.2.0."
          />
        </div>
      </section>

      <Section className="release-current">
        <div className="release-current__heading">
          <div>
            <p className="release-overline">CURRENT PUBLISHED RELEASE</p>
            <h2>0.2.0</h2>
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
          <h2>Real MCP stdio transport.</h2>
          <p>
            Version 0.2.0 connects a TypeScript MCP client to the Agent44
            Python proxy and its downstream MCP server.
          </p>
        </header>

        <ol className="release-changes">
          <li>
            <span>01</span>
            <div>
              <h3>Initialize a session and discover tools</h3>
              <p>
                The client starts a configured command through stdio, performs
                MCP initialization, and exposes downstream tool discovery.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Invoke tools and close the child process</h3>
              <p>
                Tool calls return a simplified result shape, and
                <code> cleanup() </code> closes the transport and child
                process.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Configure the spawned process</h3>
              <p>
                Optional arguments, working directory, and environment are
                supported by the client options.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>Carry provenance references as MCP metadata</h3>
              <p>
                The client can add <code>_meta.provenanceReference</code> and
                extract a reference from a response. This is metadata
                transport, not provenance validation or authorization.
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
            The release source and published package were checked with a local
            deterministic MCP server through the Python proxy.
          </p>
        </header>
        <ul className="release-verification__list">
          <li>MCP initialization and downstream tool discovery</li>
          <li>Successful calls and policy denial</li>
          <li>No downstream execution for policy-denied calls</li>
          <li>Metadata round-trip and unknown-tool error handling</li>
          <li>Client shutdown and process cleanup</li>
        </ul>
        <Callout title="Release boundary" tone="warning">
          <p>
            These checks demonstrate the tested integration behavior; they do
            not establish comprehensive attack prevention, production
            security, or end-to-end provenance enforcement. Using the proxy
            also requires the Agent44 Python project and its dependencies.
          </p>
        </Callout>
      </Section>

      <Section className="release-version-note">
        <p>
          <span className="release-overline">VERSION CONTEXT</span>
          Published <strong>0.2.0</strong> includes the stdio transport
          integration described here. Published <strong>0.1.0</strong>
          predates that functionality. The repository roadmap lists future
          work separately; planned items are not part of this release.
        </p>
        <Callout title="Published package README" tone="warning">
          <p>
            The README embedded in the immutable npm v0.2.0 tarball predates
            publication and incorrectly says 0.2.0 is unpublished. The
            repository release notes clarify the published status; the
            existing npm tarball was not changed.
          </p>
        </Callout>
      </Section>
    </div>
  );
}
