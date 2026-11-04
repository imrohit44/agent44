import React from "react";

const Hero = () => {
  return (
    <section className="min-h-screen bg-gradient-to-b from-background via-accent/10 to-background fixed inset-0 overflow-hidden pt-20">
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-accent/70 text-sm uppercase tracking-wider mb-6">A Decision Layer for AI Agent Tool Calls</p>
          <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">Agent44</h1>
          <p className="text-muted/80 text-lg leading-relaxed mb-8">
            Policy layer designed to make agent actions safer, explainable, and measurable—without blindly trusting the model.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="/architecture" className="inline-block px-6 py-3 bg-accent/10 text-accent hover:bg-accent/20 rounded-full transition-colors font-medium">
              Explore Architecture
            </a>
            <a href="https://github.com/imrohit44/Agent44" className="inline-block px-6 py-3 border border-accent/50 text-accent hover:bg-accent/10 rounded-full transition-colors font-medium" target="_blank" rel="noopener">
              View GitHub
            </a>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="absolute -inset-4 bg-gradient-to-br from-accent/20 to-transparent rounded-full filter blur-lg opacity-70 animate-pulse-slow"></div>
        </div>
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[400px] lg:block">
        <svg className="w-full h-auto" viewBox="0 0 400 200" aria-hidden="true">
          <path d="M0 0 L400 0 L400 20 L200 20 L200 180 L0 180 Z" fill="var(--accent)" />
          <text x="200" y="190" text-anchor="middle" font-size="16" fill="var(--muted)">AI Agent → Policy → Tool</text>
        </svg>
      </div>
    </section>
  );
};

export default Hero;