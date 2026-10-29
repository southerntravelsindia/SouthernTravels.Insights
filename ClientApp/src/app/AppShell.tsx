// Page frame for the report, as Views/Shared/_Layout.cshtml at 56d2c67 so site.css lays it out unchanged: header,
// side menu with the 15 reports and the signed-in user, and the scrolling <main> in page-scroll mode (SCROLL_BEHAVIOUR.md).
// site.css drives the menu from the hidden #navtoggle checkbox: on desktop it widens the 56px icon rail to 216px, on
// phones (< 768px) it slides the menu in over a scrim. Here React owns that state and the toggles are real buttons (D10).
import { useEffect, useState, type ReactNode } from 'react';
import logo from '../assets/logo-southern.png';
import { clearSession, type UserSession } from '../lib/auth';
import { config } from './config';
import { NAV, THIS_REPORT, insightsHref } from './nav';

function initials(name: string): string {
  return name.split(/[ .@]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
}

const icon = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function AppShell({ user, children }: { user: UserSession; children: ReactNode }) {
  // Checked = rail expanded (desktop) / menu open (phone). The page opens with the rail collapsed, as after picking a report.
  const [menuOpen, setMenuOpen] = useState(false);
  const insightsUrl = config().insightsUrl;

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const logout = () => {
    clearSession();
    window.location.assign(`${import.meta.env.BASE_URL}login`);
  };
  const role = (user.isAdmin ? 'Administrator' : 'User') + (user.opsBranch ? ` · ${user.opsBranch}` : '');
  const toggle = () => setMenuOpen((o) => !o);

  return (
    <>
      <input type="checkbox" id="navtoggle" className="nav-chk" checked={menuOpen} readOnly aria-hidden="true" tabIndex={-1} />
      <div className="app ins01-app" data-report={THIS_REPORT} data-rail="collapsed">
        <header className="topbar">
          <button type="button" className="hamburger" aria-label="Open menu" aria-controls="ins01-sidebar" aria-expanded={menuOpen} onClick={toggle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <img className="logo" src={logo} alt="Southern Travels" />
          <span className="vsep" />
          <span className="dept">Southern Travels&nbsp; Insights</span>
          <span className="spacer" />
        </header>

        <div className="shell">
          <aside className="sidebar" id="ins01-sidebar" aria-label="Reports">
            <button type="button" className="toggle" title="Collapse / expand menu" aria-label="Collapse or expand menu" aria-expanded={menuOpen} onClick={toggle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /><path className="chev-open" d="M16 10l-2 2 2 2" /><path className="chev-closed" d="M14 10l2 2-2 2" />
              </svg>
            </button>
            <div className="section"><span className="lbl-full">Reports</span><span className="lbl-short">REP</span></div>
            <nav aria-label="Reports">
              {NAV.map((n) => {
                const content = (
                  <>
                    <svg {...icon} aria-hidden="true"><path d={n.icon} /></svg>
                    <span>{n.label}</span>
                  </>
                );
                if (n.id === THIS_REPORT)
                  return <a key={n.id} className="nav active" title={n.label} aria-current="page" href={`${import.meta.env.BASE_URL}ticket-service-status`}>{content}</a>;
                const href = insightsHref(n, insightsUrl);
                return href ? (
                  <a key={n.id} className="nav" title={n.label} href={href}>{content}</a>
                ) : (
                  <span key={n.id} className="nav ins01-nav-off" title={`${n.label}: opens in the Insights site (not linked in this build)`} aria-disabled="true">{content}</span>
                );
              })}
            </nav>
            <div className="nav-user" title={`${user.name} · ${role}`}>
              <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
              <span className="who"><b>{user.name}</b><small>{role}</small></span>
              <button type="button" className="logout" title="Log out" aria-label="Log out" onClick={logout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </div>
          </aside>
          <button type="button" className="scrim" aria-label="Close menu" tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)} />

          <main className="main page-scroll" id="main">
            <div className="ins01">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}
