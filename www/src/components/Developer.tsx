import PageHeader from "./PageHeader";
import Section from "./Section";

export default function Developer() {
  return (
    <div className="legacy-page developer-page">
      <section className="legacy-page__intro">
        <div className="site-container">
          <PageHeader
            description="Set up the Python proxy and use the separately published TypeScript MCP client."
            eyebrow="DEVELOPER RESOURCES"
            title="Start with the implementation."
          />
        </div>
      </section>

      <Section className="legacy-page__content">
        <div className="legacy-resource-columns">
          <article>
            <p className="legacy-overline">PYTHON PROXY</p>
            <h2>Run from the repository</h2>
            <ol>
              <li>Install the project environment with <code>uv sync</code>.</li>
              <li>
                Start the proxy with a supported policy and downstream MCP
                command.
              </li>
              <li>
                Follow the{" "}
                <a href="https://github.com/imrohit44/Agent44/blob/main/README.md">
                  repository quickstart
                </a>{" "}
                and{" "}
                <a href="https://github.com/imrohit44/Agent44/blob/main/docs/policy-engine.md">
                  policy guide
                </a>
                .
              </li>
            </ol>
          </article>
          <article>
            <p className="legacy-overline">TYPESCRIPT / ESM</p>
            <h2>Install the published client</h2>
            <pre className="legacy-code"><code>npm install @imrohit44/agent44-ts-client</code></pre>
            <p>
              Client v0.2.0 supports MCP stdio connection, discovery, tool
              calls, and cleanup. It does not bundle the Python proxy.
            </p>
            <a href="https://www.npmjs.com/package/@imrohit44/agent44-ts-client">
              View the npm package
            </a>
          </article>
        </div>
      </Section>

      <Section className="legacy-page__principles">
        <header className="legacy-section-heading">
          <p className="legacy-overline">INTEGRATION BOUNDARY</p>
          <h2>Metadata transport is not validation.</h2>
          <p>
            The client can carry a provenance reference in MCP metadata.
            Transport does not validate provenance or authorize a tool call.
          </p>
        </header>
        <p className="legacy-source-link">
          <a href="https://github.com/imrohit44/Agent44">
            Open the Agent44 GitHub repository
          </a>
        </p>
      </Section>
    </div>
  );
}
