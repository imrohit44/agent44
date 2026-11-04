import { Link } from "react-router-dom";

const NavLinks = [
  { path: "/", label: "Home" },
  { path: "/architecture", label: "Architecture" },
  { path: "/policy", label: "Policy" },
  { path: "/provenance", label: "Provenance" },
  { path: "/evaluation", label: "Evaluation" },
  { path: "/github", label: "GitHub" },
];

const Nav = () => (
  <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
    <div className="max-w-7xl mx-auto px-6 py-4">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold tracking-tighter">
          Agent44
        </Link>
        <div className="flex items-center gap-6">
          {NavLinks.map((link) => (
            <Link
              to={link.path}
              key={link.label}
              className="text-sm font-medium hover:text-accent transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
    </div>
  </div>
</nav>
);

export default Nav;