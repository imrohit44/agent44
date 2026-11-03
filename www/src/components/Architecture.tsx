import React from "react";

const Architecture = () => {
  return (
    <section className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-card p-8 rounded-2xl border border-border/20">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">Architecture</h2>
          <div className="prose max-w-none">
            <p>
              Agent44 provides a policy layer that sits between AI agents and MCP
              downstream tools, ensuring tool calls are evaluated for safety,
              explainability, and measurability before execution.
            </p>
            <ol className="mt-6 space-y-3 text-muted/80 text-sm">
              <li>
                AI Agent — The model-driven agent that generates tool calls.
              </li>
              <li>
                MCP Proxy — Intercepts and routes tool calls through the policy
                engine.
              </li>
              <li>
                Policy Engine — Evaluates calls against defined policies, trust
 classes, and session registries.
              </li>
              <li>
                Adapter — Converts validated calls into downstream tool invocation
                format.
              </li>
              <li>
                Observation — Captures execution results for provenance and
                auditing.
              </li>
              <li>
                Downstream Tool — The actual tool or service being invoked.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Architecture;