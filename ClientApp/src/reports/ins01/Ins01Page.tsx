// INS-01 Ticket & Service Status: title, KPI cards, pinned tabs + toolbar, legend, table and pager — the same blocks,
// in the same order, as the Razor page (Views/TicketServiceStatus/Index.cshtml at 56d2c67). Data: STPLCostSheetAPI.
import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ErrorPanel } from '../../components/ErrorPanel';
import { KpiRow, type KpiItem } from '../../components/KpiRow';
import { Pager } from '../../components/Pager';
import { ReportHeader } from '../../components/ReportHeader';
import { ReportTabs } from '../../components/ReportTabs';
import { StickyBar } from '../../components/StickyBar';
import { Toolbar } from '../../components/Toolbar';
import * as f from '../../lib/format';
import { TABS, pageHref, readState, showAllHref, tabHref, type Ins01State } from '../../lib/urlState';
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
    { label: 'New → Completed TAT', value: k ? f.tatDays(k.newToCompletedTatDays) : f.DASH, color: 'var(--color-action-blue)', tip: TAT_TIP },
  ];
}

const TITLE = 'Ticket & Service Status';
const DESCRIPTION = "Ticket & Service Status — an employee-wise view of every ticket and its linked services. Covers OPS Activity (what's New, In Progress, or Completed per OPS user), Pending Follow-up Identification (tickets needing immediate attention), Service Completion Tracking (a closed-loop log of everything marked Completed), Branch-wise OPS Performance (activity grouped by OPS Branch), and Overall OPS Status Visibility across the board.";

/** @param userName the signed-in user's display name, for the "Files assigned to you" legend. */
export function Ins01Page({ userName }: { userName: string }) {
  const [params] = useSearchParams();
  const s: Ins01State = readState(params);
  const listKey = `${s.tab}|${s.page}|${s.all}`;

  const [kpi, reloadKpi] = useLoad(`kpi|${s.all}`, (signal) => fetchKpi(s, signal));
  const [list, reloadList] = useLoad<ListPage<TicketRow> | ListPage<VendorRow>>(listKey, (signal) =>
    s.tab === 'ticket' ? fetchTickets(s, signal) : fetchVendors(s, signal),
  );

  const ticketBatch = useCallback((keys: number[], signal: AbortSignal) => fetchTicketServices(keys, s.all, signal), [s.all]);
  const vendorBatch = useCallback((ids: number[], signal: AbortSignal) => fetchVendorServices(ids, s.all, signal), [s.all]);
  const ticketDrill = useDrill(ticketBatch, listKey);
  const vendorDrill = useDrill(vendorBatch, listKey);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
      <ReportHeader title={TITLE} description={DESCRIPTION} />
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
          resultLabel={paging ? `${paging.totalCount} ${unit}` : ''}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((o) => !o)}
          onExport={() => undefined}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
        />
      </StickyBar>

      <div className="results">
        <div className="legend">
          <span className="swatch" />Files assigned to you ({userName})
          <Link className="legend-btn" to={showAllHref(s)}>{s.all ? 'Show mine only' : 'Show all'}</Link>
        </div>
        <Results list={list} tab={s.tab} ticketDrill={ticketDrill} vendorDrill={vendorDrill} onRetry={reloadList} />
        {paging && (
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
