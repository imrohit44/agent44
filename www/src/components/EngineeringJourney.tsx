import React from "react";

const EngineeringJourney = () => {
  return (
    <section className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl lg:text-4xl font-bold mb-8">Engineering Journey</h2>
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-bg">1</div>
            <span>Observation and Evidence Foundation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/60 flex items-center justify-center text-sm font-bold text-primary">2</div>
            <span>Deterministic Policy Engine</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center text-sm font-bold text-secondary">3</div>
            <span>Decision Contract</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-accent">4</div>
            <span>Model-Based Decision Adapter</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-accent">5</div>
            <span>Provenance Propagation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-accent">6</div>
            <span>TypeScript Client</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EngineeringJourney;