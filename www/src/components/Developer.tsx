import React from "react";

const Developer = () => {
  return (
    <section className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="text-3xl lg:text-4xl font-bold mb-8">For Developers</h1>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-6">Python Project Setup</h3>
            <ol className="space-y-3 text-muted-foreground text-sm">
              <li>Install the repository environment with <code>uv sync</code>.</li>
              <li>Start the proxy with a policy and downstream MCP command.</li>
              <li>See the repository quickstart and policy documentation for supported configuration.</li>
            </ol>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-6">TypeScript Client Installation</h3>
            <ol className="space-y-3 text-muted-foreground text-sm">
              <li>Install the published client with <code>npm install @imrohit44/agent44-ts-client@0.2.0</code>.</li>
              <li><code>import {"{ createAgent44ProxyClient }"} from &apos;@imrohit44/agent44-ts-client&apos;</code></li>
              <li>The client supports MCP stdio connection, discovery, tool calls, and cleanup.</li>
              <li>Provenance metadata transport does not validate provenance or authorize calls.</li>
            </ol>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/20">
          <h3 className="text-2xl font-bold mb-4">GitHub Repository</h3>
          <p className="text-muted-foreground">
            <a href="https://github.com/imrohit44/Agent44" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent transition-colors">
              github.com/imrohit44/Agent44
            </a>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Version 0.2.0 is published and its stdio integration was verified against a local MCP server. The website itself is not evidence of production security or end-to-end provenance enforcement.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Developer;