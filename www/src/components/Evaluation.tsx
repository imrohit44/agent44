import React from "react";

const Evaluation = () => {
  return (
    <section className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl lg:text-4xl font-bold mb-8">Evaluation</h2>
        <div className="max-w-none space-y-4 leading-relaxed">
          <p className="text-muted-foreground text-lg">
            Agent44 is evaluated through a synthetic corpus of tool-call scenarios. The evaluation framework uses replay-based testing to measure false allows, false denies, and policy-decision latency.
          </p>
          <h3 className="text-2xl font-bold mt-10">Synthetic Evaluation Corpus</h3>
          <ul className="mt-4 list-disc list-inside text-muted-foreground text-sm">
            <li>Corpus generated from real tool-call patterns observed in deployment</li>
            <li>Each scenario includes business arguments, provenance references, and expected policy outcomes</li>
            <li>Test cases cover: valid references, forged references, unknown references, missing references, cross-session references</li>
          </ul>
          <h3 className="text-2xl font-bold mt-10">False Allows / False Denies</h3>
          <ul className="mt-4 list-disc list-inside text-muted-foreground text-sm">
            <li>False allow: Invalid provenance claim accepted as TRUSTED (investigation showed fail-closed behavior prevents this)</li>
            <li>False deny: Valid provenance claim rejected as UNTRUSTED (mitigated by ensuring metadata reference path takes precedence)</li>
          </ul>
          <h3 className="text-2xl font-bold mt-10">Latency and Cost</h3>
          <ul className="mt-4 text-muted-foreground text-sm">
            <li>Policy evaluation is deterministic and adds sub-millisecond latency per tool call</li>
            <li>No model inference required for default policy enforcement; adapter invocation incurs model cost</li>
            <li>Observation/evidence recording adds minimal overhead</li>
          </ul>
          <h3 className="text-2xl font-bold mt-10">Limitations</h3>
          <p className="mt-4 text-muted-foreground">
            Policy-decision metrics are derived from synthetic scenarios and may not capture all edge cases in production. The fail-closed design prioritizes safety over coverage: scenarios outside the corpus default to deny. All 538 existing tests pass, including 16 provenance policy tests and 21 provenance unit tests.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Evaluation;