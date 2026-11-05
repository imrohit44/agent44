import React from "react";

const Provenance = () => {
  return (
    <section className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="text-3xl lg:text-4xl font-bold mb-8">Provenance Propagation</h1>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-6">Trust Classifications</h3>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-medium">TRUSTED</dt>
                <dd className="text-muted-foreground">Assigned at an explicit trusted boundary or by an authorized validation transition.</dd>
              </div>
              <div>
                <dt className="font-medium">UNTRUSTED</dt>
                <dd className="text-muted-foreground">Classification for external input or an unknown reference.</dd>
              </div>
              <div>
                <dt className="font-medium">DERIVED_UNTRUSTED</dt>
                <dd className="text-muted-foreground">A derived value with missing, unknown, or untrusted lineage.</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-6">Key Principles</h3>
            <ul className="space-y-4 text-muted-foreground text-sm">
              <li>Caller-supplied fields do not establish trust.</li>
              <li>Unknown references do not become trusted by being well formed.</li>
              <li>The TypeScript client transports provenance metadata, but the proxy does not validate it against its provenance registry.</li>
              <li>Metadata transport is not provenance-based authorization.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Provenance;