// Drill-down state for one list page: which rows are open and their services, fetched on first expand (one key) and
// cached for the page; Expand All fetches every missing row of the page (in contract-sized batches, G11).
// Open rows and cache belong to one resetKey (tab, page, Show all); after it changes they read as empty straight away,
// so rows of the new list never show the previous list's state.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../lib/api';

export type DrillEntry<S> =
  | { status: 'loading' }
  | { status: 'ok'; items: S[] }
  | { status: 'error'; message: string; traceId: string };

export interface DrillState<S> {
  isOpen: (key: number) => boolean;
  entry: (key: number) => DrillEntry<S>;
  toggle: (key: number) => void;
  retry: (key: number) => void;
  expandAll: (keys: number[]) => void;
  collapseAll: () => void;
}

interface Scoped<S> {
  key: string;
  open: ReadonlySet<number>;
  cache: ReadonlyMap<number, DrillEntry<S>>;
}

/**
 * @param fetchBatch loads the services of several rows; returns them grouped by row key.
 * @param resetKey   changes when the list page changes (tab, page, Show all).
 */
export function useDrill<S>(fetchBatch: (keys: number[], signal: AbortSignal) => Promise<Map<number, S[]>>, resetKey: string): DrillState<S> {
  const [raw, setRaw] = useState<Scoped<S>>({ key: resetKey, open: new Set(), cache: new Map() });
  const st: Scoped<S> = raw.key === resetKey ? raw : { key: resetKey, open: new Set(), cache: new Map() };
  const current = useRef(st);
  current.current = st;
  const abort = useRef(new AbortController());

  // A new list page: cancel calls still running for the previous one.
  useEffect(() => () => {
    abort.current.abort();
    abort.current = new AbortController();
  }, [resetKey]);

  /** Updates the state of this resetKey only (late replies for an older page are dropped). */
  const update = useCallback((key: string, f: (s: Scoped<S>) => Scoped<S>) => {
    setRaw((prev) => {
      const base = prev.key === key ? prev : { key, open: new Set<number>(), cache: new Map() };
      return f(base);
    });
  }, []);

  const load = useCallback(
    (key: string, rowKeys: number[]) => {
      if (rowKeys.length === 0) return;
      const signal = abort.current.signal;
      const put = (entry: (k: number) => DrillEntry<S>) =>
        update(key, (s) => ({ ...s, cache: new Map([...s.cache, ...rowKeys.map((k) => [k, entry(k)] as const)]) }));
      put(() => ({ status: 'loading' }));
      fetchBatch(rowKeys, signal).then(
        (byKey) => { if (!signal.aborted) put((k) => ({ status: 'ok', items: byKey.get(k) ?? [] })); },
        (e: unknown) => {
          if (signal.aborted) return;
          const err = e instanceof ApiError ? e : new ApiError('Something went wrong.', 0, '');
          put(() => ({ status: 'error', message: err.message, traceId: err.traceId }));
        },
      );
    },
    [fetchBatch, update],
  );

  const needs = (k: number) => {
    const e = current.current.cache.get(k);
    return e === undefined || e.status === 'error';
  };

  return {
    isOpen: (k) => st.open.has(k),
    entry: (k) => st.cache.get(k) ?? { status: 'loading' },
    toggle: (k) => {
      const opening = !st.open.has(k);
      update(resetKey, (s) => {
        const open = new Set(s.open);
        if (opening) open.add(k); else open.delete(k);
        return { ...s, open };
      });
      if (opening && needs(k)) load(resetKey, [k]);
    },
    retry: (k) => load(resetKey, [k]),
    expandAll: (keys) => {
      update(resetKey, (s) => ({ ...s, open: new Set(keys) }));
      load(resetKey, keys.filter(needs));
    },
    collapseAll: () => update(resetKey, (s) => ({ ...s, open: new Set() })),
  };
}
