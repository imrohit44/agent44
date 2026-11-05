import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const internalLinks = [
  { to: "/architecture", label: "Architecture" },
  { to: "/policy-lab", activePaths: ["/policy", "/policy-lab"], label: "Policy Lab" },
  { to: "/docs", label: "Docs" },
  { to: "/engineering", label: "Engineering" },
  { to: "/releases", label: "Releases" },
  { to: "/journey", label: "Journey" },
];

function NavigationLinks({
  onNavigate,
  pathname,
}: {
  onNavigate?: () => void;
  pathname: string;
}) {
  return (
    <>
      {internalLinks.map((link) => (
        <NavLink
          className={({ isActive }) =>
            `site-nav__link ${
              isActive ||
              link.activePaths?.includes(pathname)
                ? "site-nav__link--active"
                : ""
            }`
          }
          end
          key={link.to}
          onClick={onNavigate}
          to={link.to}
        >
          {link.label}
        </NavLink>
      ))}
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
          <NavigationLinks pathname={location.pathname} />
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
        <NavigationLinks onNavigate={closeMenu} pathname={location.pathname} />
      </nav>
    </header>
  );
}
