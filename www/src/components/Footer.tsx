import { Link } from "react-router-dom";

const footerLinks = [
  {
    href: "https://github.com/imrohit44/Agent44",
    label: "GitHub",
  },
  {
    href: "https://www.npmjs.com/package/@imrohit44/agent44-ts-client",
    label: "npm",
  },
  {
    to: "/docs",
    label: "Documentation",
  },
  {
    to: "/releases",
    label: "Releases",
  },
  {
    to: "/journey",
    label: "Project Journey",
  },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-container site-footer__inner">
        <p>Agent44 — an engineering experiment in policy for MCP tool calls.</p>
        <nav aria-label="Project links" className="site-footer__links">
          {footerLinks.map((link) => (
            "to" in link && typeof link.to === "string" ? (
              <Link key={link.label} to={link.to}>
                {link.label}
              </Link>
            ) : (
              <a href={link.href} key={link.label}>
                {link.label}
              </a>
            )
          ))}
        </nav>
      </div>
    </footer>
  );
}
