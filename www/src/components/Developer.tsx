import React from "react";

const Developer = () => {
  return (
    <section className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl lg:text-4xl font-bold mb-8">For Developers</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-6">Python Project Setup</h3>
            <ol className="space-y-3 text-muted-foreground text-sm">
              <li>pip install agent44 — Install the Agent44 proxy package</li>
              <li>agent44 proxy --policy policy.yaml -- <code>downstream-tools</code> — Start the proxy</li>
              <li>Configure policy file with enforcement: required or enforcement: off</li>
              <li>Use the provenance API: registry.classify_external(), registry.validate_reference(pid)</li>
            </ol>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-6">TypeScript Client Installation</h3>
            <ol className="space-y-3 text-muted-foreground text-sm">
              <li>After publication, run npm install @imrohit44/agent44-ts-client (local package checks pass; live MCP integration is unverified)</li>
              <li><code>import {"{ createAgent44ProxyClient }"} from &apos;@imrohit44/agent44-ts-client&apos;</code></li>
              <li>Initialize with stdio transport: <code>createAgent44ProxyClient(&apos;agent44-proxy&apos;, stdin, stdout)</code></li>
              <li>Call tools with optional provenance: <code>client.callTool(&apos;toolName&apos;, {"{ /* args */ }"}, provenanceRef)</code></li>
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
            Local package tests, typecheck, build, and archive checks pass. Live MCP integration and npm publication are unverified.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Developer;