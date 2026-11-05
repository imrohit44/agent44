import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const documentationLinks = [
  {
    href: "https://github.com/imrohit44/Agent44/blob/main/docs/development.md",
    label: "Engineering",
  },
];

const internalLinks = [
  { to: "/architecture", label: "Architecture" },
  { to: "/policy-lab", label: "Policy Lab" },
  { to: "/docs", label: "Docs" },
];

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {internalLinks.map((link) => (
        <NavLink
          className="site-nav__link"
          end
          key={link.to}
          onClick={onNavigate}
          to={link.to}
        >
          {link.label}
        </NavLink>
      ))}
      {documentationLinks.map((link) => (
        <a
          className="site-nav__link"
          href={link.href}
          key={link.label}
          onClick={onNavigate}
        >
          {link.label}
        </a>
      ))}
      <NavLink
        className="site-nav__link"
        end
        onClick={onNavigate}
        to="/releases"
      >
        Releases
      </NavLink>
    </>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <header className="site-header">
      <div className="site-container site-header__inner">
        <Link
          aria-label="Agent44 home"
          className="site-brand"
          onClick={closeMenu}
          to="/"
        >
          <span aria-hidden="true" className="site-brand__mark" />
          <span>Agent44</span>
        </Link>

        <nav aria-label="Primary navigation" className="site-nav site-nav--desktop">
          <NavigationLinks />
        </nav>

        <button
          aria-controls="mobile-primary-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="mobile-nav-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          ref={menuButtonRef}
          type="button"
        >
          <span aria-hidden="true">{menuOpen ? "Close" : "Menu"}</span>
        </button>
      </div>

      <nav
        aria-label="Mobile primary navigation"
        className="site-container site-nav site-nav--mobile"
        hidden={!menuOpen}
        id="mobile-primary-navigation"
      >
        <NavigationLinks onNavigate={closeMenu} />
      </nav>
    </header>
  );
}
