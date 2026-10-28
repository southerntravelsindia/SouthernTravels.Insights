// INS-01 page state lives in the URL query (D3), so links, reload and Back work. Same keys as the Razor page
// (Infrastructure/ReportQuery.cs): tab, page, all. Filters, search and period join in Phase 5.

export type Ins01Tab = 'ticket' | 'vendor';

export interface Ins01State {
  tab: Ins01Tab;
  page: number;
  /** "Show all" (all=1); otherwise only the files assigned to the signed-in user. */
  all: boolean;
}

export const TABS: { key: Ins01Tab; label: string }[] = [
  { key: 'ticket', label: 'Ticket-Wise View' },
  { key: 'vendor', label: 'Vendor-Wise View' },
];

/** Reads the state; an unknown tab falls back to Ticket-Wise, a missing, zero or non-numeric page to 1. */
export function readState(q: URLSearchParams): Ins01State {
  const tab = q.get('tab') === 'vendor' ? 'vendor' : 'ticket';
  const n = Number.parseInt(q.get('page') ?? '', 10);
  return { tab, page: Number.isFinite(n) && n > 0 ? n : 1, all: q.get('all') === '1' };
}

/** Link to a tab (keeps Show all, starts at page 1). */
export const tabHref = (tab: Ins01Tab, s: Ins01State): string => `?tab=${tab}${s.all ? '&all=1' : ''}`;

/** Link to a page of the current tab. */
export const pageHref = (page: number, s: Ins01State): string => `?tab=${s.tab}&page=${page}${s.all ? '&all=1' : ''}`;

/** The legend's Show all / Show mine only toggle (back to page 1). */
export const showAllHref = (s: Ins01State): string => (s.all ? `?tab=${s.tab}` : `?tab=${s.tab}&all=1`);
