import React from "react";

const Problem = () => {
  return (
    <section className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-card p-8 rounded-2xl border border-border/20">
          <h1 className="text-3xl lg:text-4xl font-bold mb-6">The Challenge</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            AI agents can invoke tools via the Model-Context-Protocol (MCP), but tool execution needs a layer that evaluates whether a call should proceed. Without such a layer, agents blindly trust model outputs, risking unsafe or unexpected tool behavior.
          </p>
          <ul className="mt-6 space-y-3 text-muted-foreground text-sm">
            <li>Agents may invoke tools with unbounded authority</li>
            <li>No built-in mechanism to evaluate call safety</li>
            <li>Policy decisions must be deterministic and auditable</li>
            <li>Trust must be preserved or denied without silent promotion</li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default Problem;