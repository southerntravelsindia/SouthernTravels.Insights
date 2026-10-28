// INS-01 Ticket & Service Status: title, KPI cards, pinned tabs + toolbar, legend, table and pager — the same blocks,
// in the same order, as the Razor page (Views/TicketServiceStatus/Index.cshtml at 56d2c67). Data: STPLCostSheetAPI.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { DateRangeValue } from '../../components/DateRange';
import { FilterPanel } from '../../components/FilterPanel';
import { ErrorPanel } from '../../components/ErrorPanel';
import { KpiRow, type KpiItem } from '../../components/KpiRow';
import { Pager } from '../../components/Pager';
import { ReportHeader } from '../../components/ReportHeader';
import { ReportTabs } from '../../components/ReportTabs';
import { StickyBar } from '../../components/StickyBar';
import { Toolbar } from '../../components/Toolbar';
import * as f from '../../lib/format';
import { ApiError } from '../../lib/api';
import {
  TABS, activeFilterCount, change, clearFilters, pageHref, readState, showAllHref, tabHref, toQuery,
  type FilterKey, type Ins01State, type RangeKey,
} from '../../lib/urlState';
import { FILTERS, RANGES, builtInLists, loadFilterLists, validate, type FilterLists } from './filters';
import { fetchKpi, fetchTicketServices, fetchTickets, fetchVendorServices, fetchVendors, useLoad, type Load } from './data';
import { TicketWiseTable } from './TicketWiseTable';
import { useDrill, type DrillState } from './useDrill';
import { VendorWiseTable } from './VendorWiseTable';
import type { Kpi, ListPage, TicketRow, TicketService, VendorRow, VendorService } from './types';

const TAT_TIP = 'Average days from service creation to confirmation, across Completed + Confirmed services';

export function kpiItems(k: Kpi | null): KpiItem[] {
  const v = (n: number | undefined) => (n === undefined ? f.DASH : String(n));
  return [
    { label: 'Total Tickets', value: v(k?.totalTickets), color: 'var(--color-navy)', big: true },
    { label: 'New', value: v(k?.newTickets), color: 'var(--ink-muted)', big: true },
    { label: 'In Progress', value: v(k?.inProgressTickets), color: 'var(--info-ink)', big: true },
    { label: 'Completed', value: v(k?.completedTickets), color: 'var(--tint-green-ink)', big: true },
    // AC9: label, position and colour provisional until BA Q9.
    { label: 'Cancelled', value: v(k?.cancelledTickets), color: 'var(--danger-ink)', big: true, tip: 'Tickets cancelled, or with every service cancelled' },
    { label: 'New → Completed TAT', value: k ? f.tatDays(k.newToCompletedTatDays) : f.DASH, color: 'var(--color-action-blue)', tip: TAT_TIP },
  ];
}

const TITLE = 'Ticket & Service Status';
const DESCRIPTION = "Ticket & Service Status — an employee-wise view of every ticket and its linked services. Covers OPS Activity (what's New, In Progress, or Completed per OPS user), Pending Follow-up Identification (tickets needing immediate attention), Service Completion Tracking (a closed-loop log of everything marked Completed), Branch-wise OPS Performance (activity grouped by OPS Branch), and Overall OPS Status Visibility across the board.";

const LAST_QUERY = 'ins01.lastQuery';
const FILTER_PANEL_ID = 'ins01-filters';

/** True below 1150px, where the filter panel is a sheet that applies on Done (site.css). */
function useSheetLayout(): boolean {
  const query = '(max-width: 1149px)';
  const [sheet, setSheet] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia(query).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const m = window.matchMedia(query);
    const on = () => setSheet(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return sheet;
}

/** @param userName the signed-in user's display name, for the "Files assigned to you" legend. */
export function Ins01Page({ userName }: { userName: string }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const s: Ins01State = readState(params);
  const go = (next: Ins01State) => navigate(toQuery(next));

  // AC25: the page remembers its last view for this browser session; opening it without a query brings it back.
  const empty = params.toString() === '';
  useEffect(() => {
    if (!empty) return;
    try {
      const last = sessionStorage.getItem(LAST_QUERY);
      if (last && last.startsWith('?')) navigate(last, { replace: true });
    } catch { /* storage blocked */ }
  }, [empty, navigate]);
  const listKey = toQuery(s);
  useEffect(() => {
    if (empty) return;
    try { sessionStorage.setItem(LAST_QUERY, listKey); } catch { /* storage blocked */ }
  }, [empty, listKey]);

  // AC26: filter lists once per session, 10 s timeout, built-in lists on failure (never blocks the page).
  const [lists, setLists] = useState<{ lists: FilterLists; fallback: boolean } | null>(null);
  useEffect(() => {
    let live = true;
    void loadFilterLists().then((r) => { if (live) setLists(r); });
    return () => { live = false; };
  }, []);

  // H6 limits mirrored for messages: a broken one is shown instead of calling the API.
  const invalid = validate(s);
  const guard = <T,>(run: () => Promise<T>) => (invalid ? Promise.reject(new ApiError(invalid, 400, '')) : run());

  const kpiKey = toQuery({ ...s, tab: 'ticket', page: 1 }); // KPIs are the same on both tabs and every page
  const [kpi, reloadKpi] = useLoad(kpiKey, (signal) => guard(() => fetchKpi(s, signal)));
  const [list, reloadList] = useLoad<ListPage<TicketRow> | ListPage<VendorRow>>(listKey, (signal) =>
    guard<ListPage<TicketRow> | ListPage<VendorRow>>(() => (s.tab === 'ticket' ? fetchTickets(s, signal) : fetchVendors(s, signal))),
  );

  // The drill-down calls depend on the whole state, which listKey stands for.
  const stateRef = useRef(s);
  stateRef.current = s;
  const ticketBatch = useCallback((keys: number[], signal: AbortSignal) => fetchTicketServices(keys, stateRef.current, signal), []);
  const vendorBatch = useCallback((ids: number[], signal: AbortSignal) => fetchVendorServices(ids, stateRef.current, signal), []);
  const ticketDrill = useDrill(ticketBatch, listKey);
  const vendorDrill = useDrill(vendorBatch, listKey);

  // Filter panel. Desktop applies each change; the tablet/phone sheet keeps a draft until Done (TSD §2.1).
  const sheet = useSheetLayout();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<Ins01State | null>(null);
  const editing = sheet && draft ? draft : s;
  const edit = (next: Ins01State) => (sheet ? setDraft(next) : go(next));
  const closePanel = () => { setFiltersOpen(false); setDraft(null); };
  const panelLists = lists?.lists ?? builtInLists();

  const rows = list.status === 'ok' ? list.data.rows : [];
  const paging = list.status === 'ok' ? list.data.paging : null;
  const unit = s.tab === 'ticket' ? 'tickets' : 'vendors';

  const expandAll = () =>
    s.tab === 'ticket'
      ? ticketDrill.expandAll((rows as TicketRow[]).map((t) => t.ticketRowKey))
      : vendorDrill.expandAll((rows as VendorRow[]).map((g) => g.vendorId));
  const collapseAll = () => (s.tab === 'ticket' ? ticketDrill.collapseAll() : vendorDrill.collapseAll());

  return (
    <>
      <ReportHeader
        title={TITLE}
        description={DESCRIPTION}
        period={s.period}
        custom={s.custom}
        onPeriod={(period) => go(change(s, { period }))}
        onCustom={(custom: DateRangeValue) => go(change(s, { custom }))}
      />
      {kpi.status === 'error' ? (
        <KpiDegraded onRetry={reloadKpi} />
      ) : (
        <KpiRow items={kpiItems(kpi.status === 'ok' ? kpi.data : null)} loading={kpi.status === 'loading'} />
      )}

      <StickyBar>
        <ReportTabs tabs={TABS} active={s.tab} hrefFor={(t) => tabHref(t, s)} />
        <Toolbar
          hasTabs
          searchPlaceholder="Search MBK No., Ticket No., Passenger, File No."
          search={s.q}
          onSearch={(q) => go(change(s, { q }))}
          resultLabel={paging ? `${paging.totalCount} ${unit}` : ''}
          filtersOpen={filtersOpen}
          filtersId={FILTER_PANEL_ID}
          activeFilters={activeFilterCount(s)}
          onToggleFilters={() => (filtersOpen ? closePanel() : setFiltersOpen(true))}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
        />
        {filtersOpen && (
          <FilterPanel
            id={FILTER_PANEL_ID}
            filters={FILTERS.map((d) => ({ key: d.key, label: d.label, options: panelLists[d.key].options, selected: editing.filters[d.key] }))}
            ranges={RANGES.map((r) => ({ key: r.key, label: r.label, value: editing.ranges[r.key] }))}
            onFilter={(key, values) => edit(change(editing, { filters: { ...editing.filters, [key as FilterKey]: values } }))}
            onRange={(key, value) => edit(change(editing, { ranges: { ...editing.ranges, [key as RangeKey]: value } }))}
            onClear={() => edit(clearFilters(editing))}
            onDone={() => { if (draft) go(draft); closePanel(); }}
            onClose={closePanel}
            notice={lists?.fallback ? <span className="fs11 c-warn ins01-lists-note">Some filter lists could not be loaded.</span> : null}
          />
        )}
      </StickyBar>

      <div className="results">
        <div className="legend">
          <span className="swatch" />Files assigned to you ({userName})
          <Link className="legend-btn" to={showAllHref(s)}>{s.all ? 'Show mine only' : 'Show all'}</Link>
        </div>
        {invalid ? (
          <ErrorPanel message={invalid} traceId="" />
        ) : (
          <Results list={list} tab={s.tab} ticketDrill={ticketDrill} vendorDrill={vendorDrill} onRetry={reloadList} />
        )}
        {paging && !invalid && (
          <Pager
            label={f.showing(paging.showingFrom, paging.showingTo, paging.totalCount)}
            page={paging.pageNumber}
            totalPages={paging.totalPages}
            hrefFor={(p) => pageHref(p, s)}
          />
        )}
      </div>
    </>
  );
}

function Results({ list, tab, ticketDrill, vendorDrill, onRetry }: {
  list: Load<ListPage<TicketRow> | ListPage<VendorRow>>;
  tab: Ins01State['tab'];
  ticketDrill: DrillState<TicketService>;
  vendorDrill: DrillState<VendorService>;
  onRetry: () => void;
}) {
  if (list.status === 'error')
    return <ErrorPanel message="The report could not be loaded." traceId={list.traceId} onRetry={onRetry} />;
  if (list.status === 'loading')
    return <div className="card"><div className="empty ins01-loading" role="status">Loading…</div></div>;
  return (
    <div className="card">
      {tab === 'ticket'
        ? <TicketWiseTable rows={list.data.rows as TicketRow[]} drill={ticketDrill} />
        : <VendorWiseTable rows={list.data.rows as VendorRow[]} drill={vendorDrill} />}
    </div>
  );
}

/** KPI call failed: the list still shows; the cards show "–" with a note (H2). */
function KpiDegraded({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <KpiRow items={kpiItems(null)} />
      <div className="fs11 c-warn ins01-kpi-note" role="alert">
        Figures unavailable. <button type="button" className="btn-clear" onClick={onRetry}>Reload</button>
      </div>
    </>
  );
}
