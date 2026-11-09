import type { ReactNode } from "react";
import Footer from "./Footer";
import Header from "./Header";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div aria-hidden="true" className="ambient-background">
        <span className="ambient-background__signal ambient-background__signal--cyan" />
        <span className="ambient-background__signal ambient-background__signal--amber" />
      </div>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header />
      <main className="site-main" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </>
  );
}
