import React from "react";

const NotFound = () => {
  return (
    <section className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-destructive">404</h1>
        <p className="text-muted/80 mt-4">Page not found</p>
        <a href="/" className="text-accent mt-6">Go home</a>
      </div>
    </section>
  );
};

export default NotFound;