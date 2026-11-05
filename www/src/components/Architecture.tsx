import React from "react";

const Architecture = () => {
  return (
    <section className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-card p-8 rounded-2xl border border-border/20">
          <h1 className="text-3xl lg:text-4xl font-bold mb-6">Architecture</h1>
          <div className="max-w-none leading-relaxed">
            <p className="text-foreground/90">
              Agent44 is an MCP stdio proxy between a client and a downstream
              server. When a policy is configured, tool calls are evaluated
              before forwarding. Without a policy, the proxy forwards calls
              without policy enforcement.
            </p>
            <ol className="mt-6 list-decimal list-inside space-y-3 text-muted-foreground text-sm">
              <li>
                Agent and MCP client — The application requests available tools
                and submits tool calls.
              </li>
              <li>
                Agent44 proxy — Forwards tool discovery and handles tool calls
                over stdio.
              </li>
              <li>
                Policy engine — If configured, evaluates the call using
                deterministic rules before forwarding.
              </li>
              <li>
                Optional decision adapter — Consulted only for unresolved calls
                to configured adapter-eligible tools.
              </li>
              <li>
                Downstream MCP server — Receives allowed calls and returns tool
                results. Observation is optional.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Architecture;