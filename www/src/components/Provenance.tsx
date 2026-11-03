import React from "react";

const Provenance = () => {
  return (
    <section className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl lg:text-4xl font-bold mb-8">Provenance Propagation</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-6">Trust Classifications</h3>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-medium">VALID</dt>
                <dd className="text-muted/80">Provenance reference exists in the validating session's registry</dd>
              </div>
              <div>
                <dt className="font-medium">UNKNOWN</dt>
                <dd className="text-muted/80">Reference is well-formed but does not exist in the current session's registry</dd>
              </div>
              <div>
                <dt className="font-medium">UNTRUSTED</dt>
                <dd className="text-muted/80">Default for missing/invalid references; fail-closed behavior</dd>
              </div>
              <div>
                <dt className="font-medium">TRUSTED</dt>
                <dd className="text-muted/80">Only attainable via validated validate_transition(); no unpromotion possible</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-6">Key Principles</h3>
            <ul className="space-y-4 text-muted/80 text-sm">
              <li>Metadata reference takes precedence</li>
              <li>Argument-value fallback</li>
              <li>External ID generation</li>
              <li>No untrusted-to-trusted promotion</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Provenance;