// Ticket drill-down: the ticket's services (Index.cshtml, table.svt).
import { Badge, Pill } from '../../components/Cell';
import { DataTable, type Column } from '../../components/DataTable';
import * as f from '../../lib/format';
import { DrillStatus } from './DrillStatus';
import type { DrillEntry } from './useDrill';
import type { TicketService } from './types';

const columns: Column<TicketService>[] = [
  { key: 'type', header: 'Svc Type', card: 'title', render: (s) => <Pill type={s.svcType} className="nw" /> },
  { key: 'city', header: 'City', render: (s) => s.city },
  { key: 'name', header: 'Name of Service', tdClass: 'name', tdTitle: (s) => s.nameOfService, render: (s) => s.nameOfService },
  { key: 'cat', header: 'Category', render: (s) => s.category },
  { key: 'meal', header: 'Meal Plan', render: (s) => s.mealPlan },
  { key: 'ops', header: 'OPS User / Branch', render: (s) => <><div>{s.opsUser}</div><div className="fs10 c-mut">{s.opsBranch}</div></> },
  { key: 'ops-st', header: 'OPS Status', render: (s) => <Badge status={s.opsStatus} className="nw" /> },
  {
    key: 'conf', header: 'Conf. Date',
    cell: (s) => (s.confirmationDate ? null : { className: 'c-warn fw7', content: 'Pending' }),
    render: (s) => f.short(s.confirmationDate),
  },
  { key: 'conf-no', header: 'Conf. No.', render: (s) => s.confirmationNo },
  { key: 'start', header: 'Svc Start', render: (s) => f.short(s.svcStart) },
  { key: 'end', header: 'Svc End', render: (s) => f.short(s.svcEnd) },
  { key: 'days', header: 'Days', thClass: 'ta-c', tdClass: 'ta-c', render: (s) => s.days },
  {
    key: 'voucher', header: 'Action', thClass: 'ta-c', tdClass: 'ta-c',
    render: (s) => (
      <button
        type="button"
        className={s.isVoucherEnabled ? 'voucher ' : 'voucher off'}
        title={s.isVoucherEnabled ? 'Download voucher' : 'Service must be completed and confirmed first'}
        aria-disabled={!s.isVoucherEnabled || undefined}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
        </svg>
        Voucher
      </button>
    ),
  },
];

export function TicketServices({ state, onRetry }: { state: DrillEntry<TicketService>; onRetry: () => void }) {
  if (state.status !== 'ok') return <DrillStatus state={state} onRetry={onRetry} />;
  return <DataTable className="svt cards t-tss-svc" columns={columns} rows={state.items} rowKey={(s) => s.serviceRowId} />;
}
