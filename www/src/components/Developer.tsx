import React from "react";

const Developer = () => {
  return (
    <section className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl lg:text-4xl font-bold mb-8">For Developers</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-6">Python Project Setup</h3>
            <ol className="space-y-3 text-muted/80 text-sm">
              <li>pip install agent44 — Install the Agent44 proxy package</li>
              <li>agent44 proxy --policy policy.yaml -- <code>downstream-tools</code> — Start the proxy</li>
              <li>Configure policy file with enforcement: required or enforcement: off</li>
              <li>Use the provenance API: registry.classify_external(), registry.validate_reference(pid)</li>
            </ol>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-6">TypeScript Client Installation</h3>
            <ol className="space-y-3 text-muted/80 text-sm">
              <li>npm install agent44-ts-client — Install the TypeScript client (package currently implemented, build/typecheck/package archive verification pending)</li>
              <li>import { createAgent44ProxyClient } from 'agent44-ts-client'</li>
              <li>Initialize with stdio transport: createAgent44ProxyClient('agent44-proxy', stdin, stdout)</li>
              <li>Call tools with optional provenance: client.callTool('toolName', { /* args */ }, provenanceRef)</li>
            </ol>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/20">
          <h3 className="text-2xl font-bold mb-4">GitHub Repository</h3>
          <p className="text-muted/80">
            <a href="https://github.com/imrohit44/Agent44" target="_blank" rel="noopener" className="underline hover:text-accent transition-colors">
              github.com/imrohit44/Agent44
            </a>
          </p>
          <p className="mt-2 text-sm text-muted/60">
            The TypeScript package is currently implemented but build/typecheck/package archive validation remains unverified. Do not claim published npm availability.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Developer;