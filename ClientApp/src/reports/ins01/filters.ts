// The ten filters and four date ranges (AC21, AC22), their lists, and the contract request fields they become.
// Lists come from api/Reports/GetOperationsReportFilters (the route and body the Insights site used at 56d2c67; not in the
// INS-01 contract). They are cached for the browser session and loaded with a 10 s timeout; on failure the built-in
// lists below are used (AC26, H2). A list with no built-in ids is shown as unavailable rather than guessed.
import { ApiError, apiCall, prop } from '../../lib/api';
import { getSession } from '../../lib/auth';
import { resolvePeriod, spanDays } from '../../lib/period';
import type { FilterKey, Ins01State, RangeKey } from '../../lib/urlState';

export interface Option {
  value: string;
  text: string;
}

export interface FilterDef {
  key: FilterKey;
  label: string;
  /** Contract field (list) in TicketWiseFilterRequest. */
  field: string;
  /** Values are ids (int[]) or codes/names (string[]). */
  numeric: boolean;
  /** Applies to services, so the drill-down calls send it too (TicketServicesRequest). */
  serviceLevel: boolean;
  /** Key of the list in the GetOperationsReportFilters reply, and how to read one item; null = built-in list only. */
  source: { list: string; value: string; text: string } | null;
  /** Built-in list (ids/codes from the contract); empty = none known. */
  fallback: Option[];
}

export const FILTERS: FilterDef[] = [
  { key: 'ts', label: 'Ticket Status', field: 'TicketStatusIds', numeric: true, serviceLevel: false, source: { list: 'TicketStatus', value: 'StatusID', text: 'StatusName' }, fallback: [] },
  {
    key: 'os', label: 'OPS Status', field: 'OpsStatusIds', numeric: true, serviceLevel: false, source: { list: 'OpsStatus', value: 'StatusID', text: 'StatusName' },
    // Contract v0.1 roll-up ids (provisional, BA Q8).
    fallback: [{ value: '1', text: 'New' }, { value: '9', text: 'In Progress' }, { value: '4', text: 'Completed' }, { value: '7', text: 'Cancelled' }],
  },
  { key: 'be', label: 'Booking Executive', field: 'BookingExecutives', numeric: false, serviceLevel: false, source: { list: 'BookingExecutive', value: 'UserName', text: 'UserName' }, fallback: [] },
  { key: 'bb', label: 'Booking Branch', field: 'BookingBranches', numeric: false, serviceLevel: false, source: { list: 'BookingBranch', value: 'BranchCode', text: 'BranchName' }, fallback: [] },
  { key: 'ou', label: 'OPS User', field: 'OpsUsers', numeric: false, serviceLevel: true, source: { list: 'OpsUser', value: 'ExecutivesId', text: 'Name' }, fallback: [] },
  { key: 'ob', label: 'OPS Branch', field: 'OpsBranches', numeric: false, serviceLevel: true, source: { list: 'OpsBranch', value: 'OpsBranch', text: 'OpsBranch' }, fallback: [] },
  {
    key: 'st', label: 'Service Type', field: 'ServiceTypes', numeric: false, serviceLevel: true, source: null,
    fallback: [
      { value: 'ACCOMMODATION', text: 'Accommodation' }, { value: 'TRANSPORT', text: 'Transport' }, { value: 'GUIDE', text: 'Guide' },
      { value: 'ENROUTE', text: 'En-Route Meals' }, { value: 'OTHER', text: 'Other' },
    ],
  },
  { key: 'sc', label: 'Service City', field: 'ServiceCityIds', numeric: true, serviceLevel: true, source: { list: 'ServiceCity', value: 'CityID', text: 'CityName' }, fallback: [] },
  {
    key: 'ss', label: 'Service Status', field: 'ServiceStatusIds', numeric: true, serviceLevel: true, source: { list: 'ServiceStatus', value: 'StatusID', text: 'StatusName' },
    // Contract v0.1 supplier status ids (provisional, BA Q8).
    fallback: [{ value: '2', text: 'Pending' }, { value: '6', text: 'Confirmed' }, { value: '7', text: 'Cancelled' }],
  },
  // Vendor ids from the current list (HotelID); the unified vendor list (TSD Phase 2b, Q23) may change this source.
  { key: 'vn', label: 'Vendor Name', field: 'VendorIds', numeric: true, serviceLevel: true, source: { list: 'Vendor', value: 'HotelID', text: 'HotelName' }, fallback: [] },
];

export interface RangeDef {
  key: RangeKey;
  label: string;
  /** Contract fields: <prefix>From / <prefix>To. */
  prefix: string;
  serviceLevel: boolean;
}

export const RANGES: RangeDef[] = [
  { key: 'bd', label: 'Booking Date', prefix: 'BookingDate', serviceLevel: false },
  { key: 'ts', label: 'Tour Start Date', prefix: 'TourStart', serviceLevel: false },
  { key: 'ss', label: 'Service Start Date', prefix: 'ServiceStart', serviceLevel: true },
  { key: 'c', label: 'Confirmation Date', prefix: 'Confirmation', serviceLevel: true },
];

// ---------------------------------------------------------------------------------------------------------------
// Lists

export type FilterLists = Record<FilterKey, { options: Option[]; fromApi: boolean }>;

const CACHE_KEY = 'ins01.filterLists';
const LIST_TIMEOUT_MS = 10_000;

/** Trims, drops blanks and duplicate values; sorts by text except the short status lists (the API's order). */
function toOptions(def: FilterDef, items: unknown): Option[] {
  if (!def.source || !Array.isArray(items)) return [];
  const seen = new Set<string>();
  const out: Option[] = [];
  for (const it of items) {
    const value = String(prop(it, def.source.value) ?? '').trim();
    const raw = String(prop(it, def.source.text) ?? '').trim();
    const text = def.key === 'bb' && raw ? `${raw} (${value})` : raw || value;
    if (!value || !text || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    out.push({ value, text });
  }
  const keepApiOrder = def.key === 'ts' || def.key === 'os' || def.key === 'ss';
  return keepApiOrder ? out : out.sort((a, b) => a.text.localeCompare(b.text, 'en', { sensitivity: 'base' }));
}

export function builtInLists(): FilterLists {
  const r: Partial<FilterLists> = {};
  for (const d of FILTERS) r[d.key] = { options: d.fallback, fromApi: false };
  return r as FilterLists;
}

/** Builds the lists from the API reply; any list the API left empty keeps its built-in list. */
export function listsFrom(data: unknown): FilterLists {
  const r = builtInLists();
  for (const d of FILTERS) {
    const options = d.source ? toOptions(d, prop(data, d.source.list)) : [];
    if (options.length > 0) r[d.key] = { options, fromApi: true };
  }
  return r;
}

function readCache(): FilterLists | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as FilterLists) : null;
  } catch {
    return null;
  }
}

/** The filter lists: once per browser session, 10 s timeout, built-in lists on any failure (never throws). */
export async function loadFilterLists(): Promise<{ lists: FilterLists; fallback: boolean }> {
  const cached = readCache();
  if (cached) return { lists: cached, fallback: false };
  const s = getSession();
  if (!s) return { lists: builtInLists(), fallback: true };
  try {
    const reply = await apiCall(
      'api/Reports/GetOperationsReportFilters',
      { tenantID: s.tenantId, userId: s.userName, userName: s.userName, securityKey: s.token },
      undefined,
      LIST_TIMEOUT_MS,
    );
    if (prop<boolean>(reply, 'success') !== true) throw new ApiError('No lists', 200, '');
    const lists = listsFrom(prop(reply, 'data'));
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(lists)); } catch { /* storage full or blocked: no cache */ }
    return { lists, fallback: false };
  } catch {
    return { lists: builtInLists(), fallback: true };
  }
}

export const forgetFilterLists = () => {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* blocked */ }
};

// ---------------------------------------------------------------------------------------------------------------
// Request bodies and limits

/** H6 limits, mirrored for messages only (the API enforces them). */
export const LIMITS = { maxValues: 50, maxRangeDays: 366, maxSearch: 100 } as const;
const TEXT_VALUE = /^[A-Za-z0-9 ._\-/&()']{1,100}$/;

/** The first broken limit as a message for the user, or null. */
export function validate(s: Ins01State): string | null {
  if (s.q.length > LIMITS.maxSearch) return `Search can be at most ${LIMITS.maxSearch} characters.`;
  for (const d of FILTERS) {
    const vals = s.filters[d.key];
    if (vals.length > LIMITS.maxValues) return `${d.label}: choose at most ${LIMITS.maxValues}.`;
    if (d.numeric && vals.some((v) => !/^[1-9]\d{0,9}$/.test(v))) return `${d.label}: the link holds a value that is not valid.`;
    if (!d.numeric && vals.some((v) => !TEXT_VALUE.test(v))) return `${d.label}: a chosen value has characters the report can't search on.`;
  }
  const spans: [string, { from: string | null; to: string | null }][] = RANGES.map((r) => [r.label, s.ranges[r.key]]);
  if (s.period === 'custom') spans.push(['Period', s.custom]);
  for (const [label, r] of spans) {
    if (r.from && r.to) {
      if (r.from > r.to) return `${label}: the From date is after the To date.`;
      if (spanDays(r.from, r.to) > LIMITS.maxRangeDays) return `${label}: choose at most ${LIMITS.maxRangeDays} days.`;
    }
  }
  if (s.period === 'custom' && !(s.custom.from && s.custom.to)) return 'Period: choose both Custom dates.';
  return null;
}

const values = (d: FilterDef, vals: string[]) => (d.numeric ? vals.map(Number) : vals);

/**
 * TicketWiseFilterRequest fields for the current state (contract v0.1): search, the ten lists, the four ranges, and the
 * Period on Booking Date unless a Booking Date range replaces it (AC22). Empty lists and ranges are left out.
 */
export function filterBody(s: Ins01State, now: Date = new Date()): Record<string, unknown> {
  const body: Record<string, unknown> = { MineOnly: !s.all };
  if (s.q) body.SearchText = s.q;
  for (const d of FILTERS) if (s.filters[d.key].length) body[d.field] = values(d, s.filters[d.key]);
  for (const r of RANGES) {
    const v = s.ranges[r.key];
    if (v.from) body[`${r.prefix}From`] = v.from;
    if (v.to) body[`${r.prefix}To`] = v.to;
  }
  const booking = s.ranges.bd;
  if (!booking.from && !booking.to) {
    const p = resolvePeriod(s.period, { from: s.custom.from ?? undefined, to: s.custom.to ?? undefined }, now);
    if (p) {
      body.PeriodFrom = p.from;
      body.PeriodTo = p.to;
    }
  }
  return body;
}

/** TicketServicesRequest fields: the list's scope, search and the service-level filters only. */
export function serviceFilterBody(s: Ins01State): Record<string, unknown> {
  const body: Record<string, unknown> = { MineOnly: !s.all, ApplyFilters: true };
  if (s.q) body.SearchText = s.q;
  for (const d of FILTERS) if (d.serviceLevel && s.filters[d.key].length) body[d.field] = values(d, s.filters[d.key]);
  for (const r of RANGES) {
    if (!r.serviceLevel) continue;
    const v = s.ranges[r.key];
    if (v.from) body[`${r.prefix}From`] = v.from;
    if (v.to) body[`${r.prefix}To`] = v.to;
  }
  return body;
}
