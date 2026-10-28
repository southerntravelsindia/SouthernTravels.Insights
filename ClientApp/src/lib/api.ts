// The only way the page talks to the server: the Insights BFF (/api/ins01/*), same origin, session cookie.
// No token or user id is ever sent from here; the BFF takes the user from its session (security rule 1).

import { pageConfig } from '../app/config';

/** One id per page load, sent on every call and shown in the error panel (H13). */
export const correlationId = crypto.randomUUID().replaceAll('-', '');

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

function antiforgeryToken(): string {
  return document.querySelector<HTMLMetaElement>('meta[name="ins01-xsrf"]')?.content ?? '';
}

/** Session gone: back to the login page, which returns here after sign-in. */
function toLogin(): void {
  const back = window.location.pathname + window.location.search;
  window.location.assign(`${pageConfig().loginUrl}?returnUrl=${encodeURIComponent(back)}`);
}

async function request<T>(path: string, init: RequestInit & { signal?: AbortSignal }): Promise<T> {
  const signals = [AbortSignal.timeout(TIMEOUT_MS), ...(init.signal ? [init.signal] : [])];
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Correlation-ID': correlationId,
  };
  if (init.method === 'POST') {
    headers['Content-Type'] = 'application/json';
    headers['X-XSRF-TOKEN'] = antiforgeryToken();
  }

  let res: Response;
  try {
    res = await fetch(pageConfig().apiBase + path, { ...init, headers, credentials: 'same-origin', signal: AbortSignal.any(signals) });
  } catch (e) {
    if (init.signal?.aborted) throw e;
    const timedOut = e instanceof DOMException && e.name === 'TimeoutError';
    throw new ApiError(timedOut ? 'The server took too long to answer.' : 'The server could not be reached.', 0, correlationId);
  }

  const traceId = res.headers.get('X-Correlation-ID') ?? correlationId;
  if (res.status === 401) {
    toLogin();
    throw new ApiError('Your session has expired.', 401, traceId);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string; traceId?: string } | null;
    throw new ApiError(body?.message ?? 'Something went wrong.', res.status, body?.traceId ?? traceId);
  }
  return (await res.json()) as T;
}

export const getJson = <T>(path: string, signal?: AbortSignal): Promise<T> => request<T>(path, { method: 'GET', signal });

export const postJson = <T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body), signal });
