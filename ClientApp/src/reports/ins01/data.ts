// BFF calls for INS-01 (Controllers/Api/Ins01Controller.cs). The browser sends only the URL state; never a user.
import { useEffect, useRef, useState } from 'react';
import { ApiError, getJson, postJson } from '../../lib/api';
import type { Ins01State } from '../../lib/urlState';
import type { Kpi, ListPage, TicketRow, TicketService, VendorRow, VendorService } from './types';

const all = (s: Pick<Ins01State, 'all'>) => (s.all ? 1 : 0);

export const fetchKpi = (s: Ins01State, signal?: AbortSignal) => getJson<Kpi>(`kpi?all=${all(s)}`, signal);

export const fetchTickets = (s: Ins01State, signal?: AbortSignal) =>
  getJson<ListPage<TicketRow>>(`tickets?all=${all(s)}&page=${s.page}`, signal);

export const fetchVendors = (s: Ins01State, signal?: AbortSignal) =>
  getJson<ListPage<VendorRow>>(`vendors?all=${all(s)}&page=${s.page}`, signal);

function byKey<S>(items: S[], key: (s: S) => number): Map<number, S[]> {
  const m = new Map<number, S[]>();
  for (const it of items) m.set(key(it), [...(m.get(key(it)) ?? []), it]);
  return m;
}

export async function fetchTicketServices(keys: number[], showAll: boolean, signal: AbortSignal) {
  const r = await postJson<{ services: TicketService[] }>('ticket-services', { ticketRowKeys: keys, all: showAll }, signal);
  return byKey(r.services, (s) => s.ticketRowKey);
}

export async function fetchVendorServices(ids: number[], showAll: boolean, signal: AbortSignal) {
  const r = await postJson<{ services: VendorService[] }>('vendor-services', { vendorIds: ids, all: showAll }, signal);
  return byKey(r.services, (s) => s.vendorId);
}

export type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; message: string; traceId: string };

/** Runs one call whenever its key changes; cancels the previous one. reload() runs it again. */
export function useLoad<T>(key: string, run: (signal: AbortSignal) => Promise<T>): [Load<T>, () => void] {
  const [state, setState] = useState<Load<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // `run` is rebuilt every render; only the key (or a reload) decides when it is called.
  const latest = useRef(run);
  latest.current = run;

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: 'loading' });
    latest.current(ctrl.signal).then(
      (data) => { if (!ctrl.signal.aborted) setState({ status: 'ok', data }); },
      (e: unknown) => {
        if (ctrl.signal.aborted) return;
        const err = e instanceof ApiError ? e : new ApiError('Something went wrong.', 0, '');
        setState({ status: 'error', message: err.message, traceId: err.traceId });
      },
    );
    return () => ctrl.abort();
  }, [key, attempt]);

  return [state, () => setAttempt((a) => a + 1)];
}
