import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <section className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-destructive">404</h1>
        <p className="text-muted-foreground mt-4">Page not found</p>
        <Link to="/" className="text-accent mt-6">Go home</Link>
      </div>
    </section>
  );
};

export default NotFound;