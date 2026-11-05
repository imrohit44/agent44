import type { ReactNode } from "react";
import Footer from "./Footer";
import Header from "./Header";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
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
