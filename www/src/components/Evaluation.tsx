import React from "react";

const Evaluation = () => {
  return (
    <section className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="text-3xl lg:text-4xl font-bold mb-8">Evaluation</h1>
        <div className="max-w-none space-y-4 leading-relaxed">
          <p className="text-muted-foreground text-lg">
            Agent44 includes a hand-authored synthetic corpus for replaying individual tool-call decisions. These measurements describe policy-decision outcomes, not end-to-end attack prevention.
          </p>
          <h3 className="text-2xl font-bold mt-10">Synthetic Evaluation Corpus</h3>
          <ul className="mt-4 list-disc list-inside text-muted-foreground text-sm">
            <li>The corpus is synthetic and does not represent observed production traffic.</li>
            <li>Scenarios record tool-call inputs, categories, expected decisions, and rationale.</li>
            <li>Results apply only to the evaluated scenarios and configuration.</li>
          </ul>
          <h3 className="text-2xl font-bold mt-10">False Allows / False Denies</h3>
          <ul className="mt-4 list-disc list-inside text-muted-foreground text-sm">
            <li>False allow: an expected-deny scenario observed as allowed.</li>
            <li>False deny: an expected-allow scenario observed as denied.</li>
          </ul>
          <h3 className="text-2xl font-bold mt-10">Limitations</h3>
          <p className="mt-4 text-muted-foreground">
            The corpus does not establish universal production security. A DENY records that one call was not forwarded; it does not show whether a multi-step attack objective was prevented. The reported decision results should not be interpreted as latency, cost, or comprehensive security measurements.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Evaluation;