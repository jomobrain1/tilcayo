import { useId, useState, type ReactNode } from "react";
import { NavLink, Outlet } from "react-router";
import { Alert, Button, Card } from "@tilcayo/ui";

export interface AdminUser { name: string; email: string }
export interface AdminLink { label: string; to: string }
interface AdminLayoutProps {
  title?: string;
  basePath?: string;
  user?: AdminUser | null;
  links?: AdminLink[];
  onLogout?: () => unknown | Promise<unknown>;
  children?: ReactNode;
}

// Route protection belongs to the surrounding app's auth guard.
export function AdminLayout({ title = "Administration", basePath = "/admin", user, links = [], onLogout, children }: AdminLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const menuId = useId();
  async function logout() {
    setBusy(true);
    setError("");
    try { await onLogout?.(); }
    catch { setError("Unable to complete server logout. Please try again."); }
    finally { setBusy(false); }
  }
  const navigation = [
    { label: "Dashboard", to: basePath },
    { label: "Profile", to: `${basePath}/profile` },
    ...links,
  ];
  return <div className="tl-admin-shell">
    <a className="tl-admin-skip" href="#admin-main">Skip to content</a>
    <header className="tl-admin-header">
      <strong>{title}</strong>
      <Button className="tl-admin-toggle" variant="outline" aria-controls={menuId} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>Menu</Button>
      <span>{user?.name}</span>
      {onLogout && <Button variant="outline" disabled={busy} onClick={() => void logout()}>{busy ? "Signing out..." : "Sign out"}</Button>}
    </header>
    <aside id={menuId} className={`tl-admin-sidebar${menuOpen ? " tl-admin-sidebar-open" : ""}`}>
      <nav aria-label="Admin navigation" className="tl-stack">
        {navigation.map(link => <NavLink key={link.to} to={link.to} end onClick={() => setMenuOpen(false)}>{link.label}</NavLink>)}
      </nav>
    </aside>
    <main id="admin-main" tabIndex={-1} className="tl-admin-main tl-stack">
      {error && <Alert variant="danger">{error}</Alert>}
      {children ?? <Outlet />}
    </main>
  </div>;
}

export function AdminDashboard({ user }: { user?: AdminUser | null }) {
  return <ResourceLayout title="Dashboard" description="Manage your application resources.">
    <Card><h2>Welcome{user ? `, ${user.name}` : ""}</h2><p>Choose a resource from the navigation to get started.</p></Card>
  </ResourceLayout>;
}

export function AdminProfile({ user }: { user?: AdminUser | null }) {
  return <ResourceLayout title="Profile">
    <Card><dl><dt>Name</dt><dd>{user?.name ?? ""}</dd><dt>Email</dt><dd>{user?.email ?? ""}</dd></dl></Card>
  </ResourceLayout>;
}

export function ResourceLayout({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return <section className="tl-stack">
    <header className="tl-flex tl-flex-wrap tl-items-center tl-justify-between">
      <div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions}
    </header>
    {children}
  </section>;
}
