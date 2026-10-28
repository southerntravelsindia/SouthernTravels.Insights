// Drill-down state for one list page: which rows are open and their services, fetched on first expand (one key) and
// cached for the page; Expand All fetches every missing row of the page in one batch call (G11).
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

/**
 * @param fetchBatch loads the services of several rows; returns them grouped by row key.
 * @param resetKey   changes when the list page changes (tab, page, Show all): open rows and cache start again.
 */
export function useDrill<S>(fetchBatch: (keys: number[], signal: AbortSignal) => Promise<Map<number, S[]>>, resetKey: string): DrillState<S> {
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const [cache, setCache] = useState<ReadonlyMap<number, DrillEntry<S>>>(new Map());
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const abort = useRef(new AbortController());

  useEffect(() => {
    setOpen(new Set());
    setCache(new Map());
    return () => {
      abort.current.abort();
      abort.current = new AbortController();
    };
  }, [resetKey]);

  const load = useCallback(
    (keys: number[]) => {
      if (keys.length === 0) return;
      const signal = abort.current.signal;
      setCache((c) => new Map([...c, ...keys.map((k) => [k, { status: 'loading' } as DrillEntry<S>] as const)]));
      fetchBatch(keys, signal).then(
        (byKey) => {
          if (signal.aborted) return;
          setCache((c) => new Map([...c, ...keys.map((k) => [k, { status: 'ok', items: byKey.get(k) ?? [] } as DrillEntry<S>] as const)]));
        },
        (e: unknown) => {
          if (signal.aborted) return;
          const err = e instanceof ApiError ? e : new ApiError('Something went wrong.', 0, '');
          const entry: DrillEntry<S> = { status: 'error', message: err.message, traceId: err.traceId };
          setCache((c) => new Map([...c, ...keys.map((k) => [k, entry] as const)]));
        },
      );
    },
    [fetchBatch],
  );

  const needs = (k: number) => {
    const e = cacheRef.current.get(k);
    return e === undefined || e.status === 'error';
  };

  return {
    isOpen: (k) => open.has(k),
    entry: (k) => cache.get(k) ?? { status: 'loading' },
    toggle: (k) => {
      const opening = !open.has(k);
      setOpen((o) => {
        const n = new Set(o);
        if (opening) n.add(k); else n.delete(k);
        return n;
      });
      if (opening && needs(k)) load([k]);
    },
    retry: (k) => load([k]),
    expandAll: (keys) => {
      setOpen(new Set(keys));
      load(keys.filter(needs));
    },
    collapseAll: () => setOpen(new Set()),
  };
}
