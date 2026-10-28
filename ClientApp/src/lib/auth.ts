// The signed-in user and their STPLCostSheetAPI token, kept in sessionStorage: one browser tab, gone when the tab
// closes, never in localStorage or a cookie. Any script on the page can read it, so the site must not load third-party
// scripts and must be served with a strict CSP (README). Identity and scope are decided by the API from the token.

const KEY = 'ins01.session';

export interface UserSession {
  /** User JWT, sent as securityKey (contract INS-01 v0.1 "Auth and visibility"). */
  token: string;
  /** Login user name, sent as UserName (required by the API's model validation, not used for identity). */
  userName: string;
  /** Display name for the header and the "Files assigned to you" legend. */
  name: string;
  opsBranch: string;
  isAdmin: boolean;
  /** Tenant from the login reply; Reports/GetOperationsReportFilters needs it as tenantID. */
  tenantId: number;
}

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getSession(): UserSession | null {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<UserSession>;
    return s.token && s.userName ? (s as UserSession) : null;
  } catch {
    return null;
  }
}

export function setSession(s: UserSession): void {
  storage()?.setItem(KEY, JSON.stringify(s));
}

/** Sign-out: the token and everything kept for this user (filter lists, last report view). */
export function clearSession(): void {
  const s = storage();
  if (!s) return;
  for (const k of Object.keys(s)) if (k === KEY || k.startsWith('ins01.')) s.removeItem(k);
}

/** Path to the login page that brings the user back to `back` (a path inside this app) after sign-in. */
export function loginPath(back: string): string {
  return `login?returnTo=${encodeURIComponent(back)}`;
}

/** Only paths inside this app are accepted as a return target (no open redirect, security rule 11). */
export function safeReturnTo(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/';
}
