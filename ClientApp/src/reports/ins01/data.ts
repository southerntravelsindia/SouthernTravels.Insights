// INS-01 calls to STPLCostSheetAPI (api/TicketServiceStatus/*), built only from the contract docs-claude
// planned/contracts/INS-01.md v0.1. The API answers in PascalCase; the mappers below turn its DTOs into the page's types
// and pass every value through unchanged (calculations are the API's, display rules are format.ts).
import { useEffect, useRef, useState } from 'react';
import { ApiError, reportCall } from '../../lib/api';
import type { Ins01State } from '../../lib/urlState';
import { filterBody, serviceFilterBody } from './filters';
import type { Kpi, ListPage, Paging, TicketRow, TicketService, VendorRow, VendorService } from './types';

/** Rows per page (contract: 1–100, default 10; the Razor page shows 10). */
export const PAGE_SIZE = 10;
/** Most row keys in one drill-down call (contract: ≤ 100). */
export const MAX_BATCH = 100;

type Api = Record<string, unknown>;
const str = (v: unknown) => (v == null ? '' : String(v));
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0) || 0);
const numOrNull = (v: unknown) => (v == null || v === '' ? null : Number(v));
const strOrNull = (v: unknown) => (v == null || v === '' ? null : String(v));
const rows = (d: unknown, key: string): Api[] => ((d as Api | null)?.[key] as Api[] | undefined) ?? [];

const mapPaging = (p: Api | undefined): Paging => ({
  totalCount: num(p?.TotalCount),
  pageNumber: num(p?.PageNumber) || 1,
  pageSize: num(p?.PageSize) || PAGE_SIZE,
  showingFrom: num(p?.ShowingFrom),
  showingTo: num(p?.ShowingTo),
  totalPages: num(p?.TotalPages) || 1,
});

export const mapKpi = (k: Api): Kpi => ({
  totalTickets: num(k.TotalTickets),
  newTickets: num(k.NewTickets),
  inProgressTickets: num(k.InProgressTickets),
  completedTickets: num(k.CompletedTickets),
  cancelledTickets: num(k.CancelledTickets),
  newToCompletedTatDays: numOrNull(k.NewToCompletedTATDays),
});

export const mapTicket = (r: Api): TicketRow => ({
  ticketRowKey: num(r.TicketRowKey),
  mbkNo: str(r.MBKNo),
  ticketNo: str(r.TicketNo),
  fileNo: str(r.FileNo),
  passenger: str(r.Passenger),
  tourName: str(r.TourName),
  pax: numOrNull(r.Pax),
  ticketStatus: str(r.TicketStatus),
  bookingDate: strOrNull(r.BookingDate),
  bookingExecutiveName: str(r.BookingExecutiveName),
  bookingBranch: str(r.BookingBranch),
  opsStatus: str(r.OpsStatus),
  opsBranchCodes: str(r.OpsBranchCodes),
  tourStartDate: strOrNull(r.TourStartDate),
  tourEndDate: strOrNull(r.TourEndDate),
  tourDays: numOrNull(r.TourDays),
  daysLeft: numOrNull(r.DaysLeft),
  totalAmount: num(r.TotalAmount),
  paidAmount: num(r.PaidAmount),
  balancePending: num(r.BalancePending),
  percentPaid: num(r.PercentPaid),
  serviceCount: num(r.ServiceCount),
  completionPct: numOrNull(r.CompletionPct),
  pendingServices: num(r.PendingServices),
  cancelledServices: num(r.CancelledServices),
  isMine: r.IsMine === true,
  isCancelled: r.IsCancelled === true,
});

export const mapTicketService = (s: Api): TicketService => ({
  serviceRowId: num(s.ServiceRowId),
  ticketRowKey: num(s.TicketRowKey),
  svcType: str(s.SvcType),
  city: str(s.City),
  nameOfService: str(s.NameOfService),
  category: str(s.Category),
  mealPlan: str(s.MealPlan),
  opsUser: str(s.OpsUser),
  opsBranch: str(s.OpsBranch),
  opsStatus: str(s.OpsStatus),
  serviceStatus: str(s.ServiceStatus),
  confirmationDate: strOrNull(s.ConfirmationDate),
  confirmationNo: str(s.ConfirmationNo),
  svcStart: strOrNull(s.SvcStart),
  svcEnd: strOrNull(s.SvcEnd),
  days: numOrNull(s.Days),
  isVoucherEnabled: s.IsVoucherEnabled === true,
});

export const mapVendor = (g: Api): VendorRow => ({
  vendorId: num(g.VendorId),
  vendorCode: str(g.VendorCode),
  vendorName: str(g.VendorName),
  cities: str(g.Cities),
  serviceTypes: str(g.ServiceTypes),
  tickets: num(g.Tickets),
  serviceCount: num(g.ServiceCount),
  totalSaleValue: num(g.TotalSaleValue),
  vendorPayable: num(g.VendorPayable),
  vendorPaid: num(g.VendorPaid),
  balancePending: num(g.BalancePending),
  isActive: g.IsActive === true,
});

export const mapVendorService = (x: Api): VendorService => ({
  serviceRowId: num(x.ServiceRowId),
  vendorId: num(x.VendorId),
  ticketRowKey: num(x.TicketRowKey),
  mbkNo: str(x.MBKNo),
  ticketNo: str(x.TicketNo),
  fileNo: str(x.FileNo),
  passenger: str(x.Passenger),
  grandTotal: num(x.GrandTotal),
  paidAmount: num(x.PaidAmount),
  balanceAmount: num(x.BalanceAmount),
  paidPercent: num(x.PaidPercent),
  duePercent: num(x.DuePercent),
  svcType: str(x.SvcType),
  city: str(x.City),
  nameOfService: str(x.NameOfService),
  startDate: strOrNull(x.StartDate),
  endDate: strOrNull(x.EndDate),
  days: numOrNull(x.Days),
  selling: num(x.Selling),
  payable: num(x.Payable),
  profit: num(x.Profit),
  profitPercent: numOrNull(x.ProfitPercent),
  confirmationDate: strOrNull(x.ConfirmationDate),
});

// Request bodies carry only the URL state (filters.ts); securityKey and UserName are added by reportCall from the session.

export const fetchKpi = async (s: Ins01State, signal?: AbortSignal) =>
  mapKpi(await reportCall<Api>('GetTicketWiseKpi', filterBody(s), signal));

const listBody = (s: Ins01State) => ({ ...filterBody(s), PageNumber: s.page, PageSize: PAGE_SIZE });

export async function fetchTickets(s: Ins01State, signal?: AbortSignal): Promise<ListPage<TicketRow>> {
  const d = await reportCall<Api>('GetTicketWiseList', listBody(s), signal);
  return { rows: rows(d, 'Rows').map(mapTicket), paging: mapPaging(d?.Paging as Api) };
}

export async function fetchVendors(s: Ins01State, signal?: AbortSignal): Promise<ListPage<VendorRow>> {
  const d = await reportCall<Api>('GetVendorWiseList', listBody(s), signal);
  return { rows: rows(d, 'Rows').map(mapVendor), paging: mapPaging(d?.Paging as Api) };
}

function byKey<S>(items: S[], key: (s: S) => number): Map<number, S[]> {
  const m = new Map<number, S[]>();
  for (const it of items) m.set(key(it), [...(m.get(key(it)) ?? []), it]);
  return m;
}

/** Splits keys into contract-sized batches and merges the replies. */
async function batched<S>(keys: number[], one: (chunk: number[]) => Promise<S[]>, key: (s: S) => number) {
  const chunks: number[][] = [];
  for (let i = 0; i < keys.length; i += MAX_BATCH) chunks.push(keys.slice(i, i + MAX_BATCH));
  return byKey((await Promise.all(chunks.map(one))).flat(), key);
}

/** Ticket drill-down: the list's scope, search and service-level filters (TicketServicesRequest). */
export const fetchTicketServices = (keys: number[], s: Ins01State, signal: AbortSignal) =>
  batched(
    keys,
    async (chunk) => rows(await reportCall<Api>('GetTicketWiseServices', { ...serviceFilterBody(s), TicketRowKeys: chunk }, signal), 'Services').map(mapTicketService),
    (s) => s.ticketRowKey,
  );

/** Vendor drill-down: the whole filter of the list plus the expanded vendors (VendorServicesRequest). */
export const fetchVendorServices = (ids: number[], s: Ins01State, signal: AbortSignal) =>
  batched(
    ids,
    async (chunk) => rows(await reportCall<Api>('GetVendorWiseServices', { ...filterBody(s), ExpandedVendorIds: chunk }, signal), 'Services').map(mapVendorService),
    (x) => x.vendorId,
  );

export type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; message: string; traceId: string };

/**
 * Runs one call whenever its key changes; cancels the previous one. The result is stored with its key, so a render
 * after the key changed shows "loading" instead of the previous key's data (e.g. ticket rows under the vendor tab).
 */
export function useLoad<T>(key: string, run: (signal: AbortSignal) => Promise<T>): [Load<T>, () => void] {
  const [state, setState] = useState<{ key: string; load: Load<T> }>({ key: '', load: { status: 'loading' } });
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(run);
  latest.current = run;

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ key, load: { status: 'loading' } });
    latest.current(ctrl.signal).then(
      (data) => { if (!ctrl.signal.aborted) setState({ key, load: { status: 'ok', data } }); },
      (e: unknown) => {
        if (ctrl.signal.aborted) return;
        const err = e instanceof ApiError ? e : new ApiError('Something went wrong.', 0, '');
        setState({ key, load: { status: 'error', message: err.message, traceId: err.traceId } });
      },
    );
    return () => ctrl.abort();
  }, [key, attempt]);

  return [state.key === key ? state.load : { status: 'loading' }, () => setAttempt((a) => a + 1)];
}
