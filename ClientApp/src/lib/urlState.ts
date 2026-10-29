// INS-01 page state lives in the URL query (D3), so links, reload and Back work.
//   tab, page, all                 as the Razor page (Infrastructure/ReportQuery.cs at 56d2c67)
//   q                              search text (AC23)
//   period, pf, pt                 Period and its Custom dates (AC24)
//   ts os be bb ou ob st sc ss vn  the ten filters, comma-separated values (AC21)
//   bdf bdt tsf tst ssf sst cf ct  the four date ranges, from / to (AC22)
// Any change other than paging goes back to page 1.

import { DEFAULT_PERIOD, isIsoDate, type PeriodKey } from './period';

export type Ins01Tab = 'ticket' | 'vendor';

export const FILTER_KEYS = ['ts', 'os', 'be', 'bb', 'ou', 'ob', 'st', 'sc', 'ss', 'vn'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export const RANGE_KEYS = ['bd', 'ts', 'ss', 'c'] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];

export interface Range {
  from: string | null;
  to: string | null;
}

export interface Ins01State {
  tab: Ins01Tab;
  page: number;
  /** "Show all" (all=1); otherwise only the files assigned to the signed-in user. */
  all: boolean;
  q: string;
  period: PeriodKey;
  custom: Range;
  filters: Record<FilterKey, string[]>;
  ranges: Record<RangeKey, Range>;
}

export const TABS: { key: Ins01Tab; label: string }[] = [
  { key: 'ticket', label: 'Ticket-Wise View' },
  { key: 'vendor', label: 'Vendor-Wise View' },
];

const PERIOD_KEYS: PeriodKey[] = ['today', 'week', 'month', 'custom'];
const date = (v: string | null) => (isIsoDate(v) ? v : null);
const list = (v: string | null) => (v ?? '').split(',').map((x) => x.trim()).filter((x) => x.length > 0);

function byFilter(value: (k: FilterKey) => string[]): Record<FilterKey, string[]> {
  const r: Partial<Record<FilterKey, string[]>> = {};
  for (const k of FILTER_KEYS) r[k] = value(k);
  return r as Record<FilterKey, string[]>;
}

function byRange(value: (k: RangeKey) => Range): Record<RangeKey, Range> {
  const r: Partial<Record<RangeKey, Range>> = {};
  for (const k of RANGE_KEYS) r[k] = value(k);
  return r as Record<RangeKey, Range>;
}

/** Reads the state; anything unknown or malformed falls back to the default (Ticket-Wise, page 1, This Month). */
export function readState(q: URLSearchParams): Ins01State {
  const n = Number.parseInt(q.get('page') ?? '', 10);
  const period = q.get('period') as PeriodKey | null;
  return {
    tab: q.get('tab') === 'vendor' ? 'vendor' : 'ticket',
    page: Number.isFinite(n) && n > 0 ? n : 1,
    all: q.get('all') === '1',
    q: (q.get('q') ?? '').trim(),
    period: period && PERIOD_KEYS.includes(period) ? period : DEFAULT_PERIOD,
    custom: { from: date(q.get('pf')), to: date(q.get('pt')) },
    filters: byFilter((k) => list(q.get(k))),
    ranges: byRange((k) => ({ from: date(q.get(`${k}f`)), to: date(q.get(`${k}t`)) })),
  };
}

/** The query string for a state ("?tab=…"); defaults are left out so links stay short. */
export function toQuery(s: Ins01State): string {
  const p = new URLSearchParams();
  p.set('tab', s.tab);
  if (s.page > 1) p.set('page', String(s.page));
  if (s.all) p.set('all', '1');
  if (s.q) p.set('q', s.q);
  if (s.period !== DEFAULT_PERIOD) p.set('period', s.period);
  if (s.period === 'custom') {
    if (s.custom.from) p.set('pf', s.custom.from);
    if (s.custom.to) p.set('pt', s.custom.to);
  }
  for (const k of FILTER_KEYS) if (s.filters[k].length) p.set(k, s.filters[k].join(','));
  for (const k of RANGE_KEYS) {
    if (s.ranges[k].from) p.set(`${k}f`, s.ranges[k].from!);
    if (s.ranges[k].to) p.set(`${k}t`, s.ranges[k].to!);
  }
  return `?${p.toString()}`;
}

/** A changed state starts again at page 1 (only paging keeps the page). */
export const change = (s: Ins01State, patch: Partial<Omit<Ins01State, 'page'>>): Ins01State => ({ ...s, ...patch, page: 1 });

/** Link to a tab: keeps Show all, search, period and filters (they apply to both tabs), page 1. */
export const tabHref = (tab: Ins01Tab, s: Ins01State): string => toQuery(change(s, { tab }));

/** Link to a page of the current view. */
export const pageHref = (page: number, s: Ins01State): string => toQuery({ ...s, page });

/** The legend's Show all / Show mine only toggle: keeps the tab, back to page 1 (AC4). */
export const showAllHref = (s: Ins01State): string => toQuery(change(s, { all: !s.all }));

/** Clear filters: drops the ten filters and four date ranges; tab, Show all, search and period stay. */
export const clearFilters = (s: Ins01State): Ins01State =>
  change(s, { filters: byFilter(() => []), ranges: byRange(() => ({ from: null, to: null })) });

/** How many filters and ranges are set (the Filters button badge). */
export const activeFilterCount = (s: Ins01State): number =>
  FILTER_KEYS.filter((k) => s.filters[k].length > 0).length + RANGE_KEYS.filter((k) => s.ranges[k].from || s.ranges[k].to).length;
