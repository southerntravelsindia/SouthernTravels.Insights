// The one client for STPLCostSheetAPI. INS-01 routes are built only from the contract (docs-claude
// planned/contracts/INS-01.md v0.1); the login routes follow the existing Insights login (Services/AccountService.cs),
// which has no contract file yet. Every call has a timeout and maps errors to a safe message plus a trace id.

import { config } from '../app/config';
import { clearSession, getSession, loginPath } from './auth';

/** One id per page load, sent on every call; the API echoes it in error bodies as traceId (H13). */
export const correlationId = newId();

function newId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes); // available on plain HTTP too, unlike crypto.randomUUID
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly traceId: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Reads a property whatever its casing (the API's login reply casing is not documented). */
export function prop<T = unknown>(obj: unknown, name: string): T | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const key = Object.keys(obj).find((k) => k.toLowerCase() === name.toLowerCase());
  return key === undefined ? undefined : ((obj as Record<string, unknown>)[key] as T);
}

/** Session gone or token refused: forget it and open the login page, which returns here afterwards. */
function toLogin(): void {
  clearSession();
  const base = import.meta.env.BASE_URL; // ends with "/"
  const path = window.location.pathname;
  const inApp = path.startsWith(base) ? `/${path.slice(base.length)}` : path; // returnTo is relative to the base path
  window.location.assign(`${base}${loginPath(inApp + window.location.search)}&expired=1`);
}

async function post(route: string, body: unknown, signal?: AbortSignal, timeoutMs = TIMEOUT_MS): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(config().apiBaseUrl + route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Correlation-ID': correlationId },
      body: JSON.stringify(body),
      credentials: 'omit', // the token travels in the body as the contract asks; no cookies cross to the API
      signal: AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])]),
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    const timedOut = e instanceof DOMException && e.name === 'TimeoutError';
    throw new ApiError(timedOut ? 'The server took too long to answer.' : 'The server could not be reached.', 0, correlationId);
  }

  const json: unknown = await res.json().catch(() => null);
  const traceId = prop<string>(json, 'traceId') ?? correlationId;
  if (!res.ok) {
    // Only the API's own short message for a broken limit (400) is shown; anything else gets a generic text.
    const message = res.status === 400 ? (prop<string>(json, 'message') ?? 'The request was not accepted.') : 'Something went wrong.';
    throw new ApiError(message, res.status, traceId);
  }
  return json;
}

/** Envelope { Success, Message, Data } → Data, or an error when Success is false. */
function unwrap<T>(json: unknown): T {
  if (prop<boolean>(json, 'success') !== true) {
    throw new ApiError(prop<string>(json, 'message') || 'Something went wrong.', 200, correlationId);
  }
  return prop<T>(json, 'data') as T;
}

/**
 * An INS-01 report route (POST api/TicketServiceStatus/<route>). Adds the signed-in user's token as securityKey and
 * the login name as UserName; neither comes from anything the page shows or the URL.
 */
export async function reportCall<T>(route: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const s = getSession();
  if (!s) {
    toLogin();
    throw new ApiError('Please sign in.', 401, correlationId);
  }
  return unwrap<T>(await apiCall(`api/TicketServiceStatus/${route}`, { ...body, securityKey: s.token, UserName: s.userName }, signal));
}

/** A signed-in call whose body the caller builds (it carries the token itself); 401 → login. Returns the raw reply. */
export async function apiCall(route: string, body: Record<string, unknown>, signal?: AbortSignal, timeoutMs = TIMEOUT_MS): Promise<unknown> {
  try {
    return await post(route, body, signal, timeoutMs);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      toLogin();
      throw new ApiError('Your session has expired.', 401, e.traceId);
    }
    throw e;
  }
}

/** Login routes (no token): Account/SendOTP and Account/ValidateUserOTP. Returns the raw reply. */
export async function accountCall(action: 'SendOTP' | 'ValidateUserOTP', body: Record<string, unknown>): Promise<unknown> {
  return post(`Account/${action}`, body);
}
