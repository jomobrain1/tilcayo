import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useAuth } from '../app/auth'

export function Navigation() {
  const { isAuthenticated, logout, logoutStatus } = useAuth();
  const [notice, setNotice] = useState("");
  async function signOut() {
    setIsOpen(false);
    setNotice("");
    try {
      await logout();
    } catch {
      setNotice(
        "Signed out on this device. The server could not confirm sign-out; please try again when connected.",
      );
    }
  }
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 48rem)");
    const closeOnResize = () => setIsOpen(false);
    desktop.addEventListener("change", closeOnResize);
    return () => desktop.removeEventListener("change", closeOnResize);
  }, []);

  return (
    <nav
      className="tl-container starter-nav"
      aria-label="Main navigation"
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          setIsOpen(false);
          toggleRef.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setIsOpen(false);
      }}
    >
      <Link className="starter-brand" to="/" onClick={() => setIsOpen(false)}>
        Tilcayo
      </Link>
      <button
        ref={toggleRef}
        className="starter-menu-toggle"
        type="button"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isOpen}
        aria-controls="starter-navigation-links"
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path
            d={isOpen ? "M6 6l12 12M6 18L18 6" : "M4 6h16M4 12h16M4 18h16"}
          />
        </svg>
      </button>
      <div
        id="starter-navigation-links"
        className={`starter-nav-links${isOpen ? " is-open" : ""}`}
      >
        <NavLink to="/" end onClick={() => setIsOpen(false)}>
          Home
        </NavLink>
        <NavLink to="/elements" onClick={() => setIsOpen(false)}>
          Elements
        </NavLink>
        <NavLink to="/about" onClick={() => setIsOpen(false)}>
          About
        </NavLink>
        {isAuthenticated ? (
          <>
            <NavLink to="/dashboard" onClick={() => setIsOpen(false)}>
              Dashboard
            </NavLink>
            <button
              className="tl-btn tl-btn-outline"
              type="button"
              onClick={signOut}
              disabled={logoutStatus.isLoading}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" onClick={() => setIsOpen(false)}>
              Log in
            </NavLink>
            <NavLink to="/register" onClick={() => setIsOpen(false)}>
              Register
            </NavLink>
          </>
        )}
        {notice && <p role="status">{notice}</p>}
      </div>
    </nav>
  );
}
