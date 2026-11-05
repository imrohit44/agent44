import React from "react";

const PolicyEngine = () => {
  return (
    <section className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="text-3xl lg:text-4xl font-bold mb-8">Policy Engine</h1>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-6">Rule Precedence</h3>
            <ol className="space-y-4 text-muted-foreground text-sm">
              <li>Hard-deny tools and required authority or provenance checks run before ordinary rules.</li>
              <li>Argument constraints and hard DENY rules precede ordinary deny and allow rules.</li>
              <li>An adapter is considered only when deterministic rules are unresolved and the tool is eligible.</li>
              <li>The configured default resolves calls that remain undecided; the default is DENY when unspecified.</li>
            </ol>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-6">Behavior</h3>
            <ul className="space-y-4 text-muted-foreground text-sm">
              <li>Policy load and evaluation failures do not silently become approvals.</li>
              <li>Deterministic denials are final and cannot be overturned by an adapter.</li>
              <li>MCP provenance metadata is transported separately; it is not validated or used as policy evidence by this integration.</li>
              <li>Fail-closed decisions do not prove that a policy is complete or blocks every unsafe action.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PolicyEngine;