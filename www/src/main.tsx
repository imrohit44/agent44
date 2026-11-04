// @ts-ignore CSS is loaded by the bundler; TypeScript has no declaration for it.
import "./index.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);