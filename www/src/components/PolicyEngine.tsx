import React from "react";

const PolicyEngine = () => {
  return (
    <section className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl lg:text-4xl font-bold mb-8">Policy Engine</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-6">Rule Precedence</h3>
            <ol className="space-y-4 text-muted-foreground text-sm">
              <li>Hard-deny — Takes absolute precedence; no provenance or adapter can override</li>
              <li>Provenance validation — Reference validated against session registry; unknown → UNTRUSTED</li>
              <li>Trust transition — Only explicit validate_transition() enables UNTRUSTED → TRUSTED</li>
              <li>Default action — When no rules match, the default denies the call</li>
            </ol>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-6">Behavior</h3>
            <ul className="space-y-4 text-muted-foreground text-sm">
              <li>Fail-closed — Unknown or invalid provenance references are treated as UNTRUSTED</li>
              <li>No untrusted-to-trusted promotion — derive() preserves taint; only validate_transition() enables elevation</li>
              <li>Hard-deny always wins — Even valid provenance cannot override a hard-deny rule</li>
              <li>Optional model adapter — When enforcement is active, the adapter may be consulted; when off, all policy defaults apply</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PolicyEngine;