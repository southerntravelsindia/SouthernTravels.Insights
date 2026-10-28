// Page frame for the report: the Insights header (logo, title, user, logout) and the scrolling <main> in page-scroll
// mode (SCROLL_BEHAVIOUR.md), with the same classes as Views/Shared/_Layout.cshtml so site.css lays it out the same way.
// The side menu of the other 14 reports is not part of this app.
import type { ReactNode } from 'react';
import logo from '../assets/logo-southern.png';
import { clearSession, type UserSession } from '../lib/auth';

function initials(name: string): string {
  return name.split(/[ .@]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
}

export function AppShell({ user, children }: { user: UserSession; children: ReactNode }) {
  const logout = () => {
    clearSession();
    window.location.assign(`${import.meta.env.BASE_URL}login`);
  };
  const role = (user.isAdmin ? 'Administrator' : 'User') + (user.opsBranch ? ` · ${user.opsBranch}` : '');

  return (
    <div className="app ins01-app" data-report="r1">
      <header className="topbar">
        <img className="logo" src={logo} alt="Southern Travels" />
        <span className="vsep" />
        <span className="dept">Southern Travels&nbsp; Insights</span>
        <span className="spacer" />
        <span className="ins01-user" title={`${user.name} · ${role}`}>
          <span className="avatar">{initials(user.name)}</span>
          <span className="who"><b>{user.name}</b><small>{role}</small></span>
        </span>
        <button type="button" className="bell ins01-logout" title="Log out" aria-label="Log out" onClick={logout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </header>
      <div className="shell">
        <main className="main page-scroll" id="main">
          <div className="ins01">{children}</div>
        </main>
      </div>
    </div>
  );
}
