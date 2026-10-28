// Ticket-Wise View (Views/TicketServiceStatus/Index.cshtml, ticket tab): one row per ticket, its services on expand.
import { ActionsMenu } from '../../components/ActionsMenu';
import { Badge, FileNo } from '../../components/Cell';
import { DataTable, type Column } from '../../components/DataTable';
import { RowToggle } from '../../components/RowToggle';
import * as f from '../../lib/format';
import { TicketServices } from './TicketServices';
import type { DrillState } from './useDrill';
import type { TicketRow, TicketService } from './types';

export function TicketWiseTable({ rows, drill }: { rows: TicketRow[]; drill: DrillState<TicketService> }) {
  const columns: Column<TicketRow>[] = [
    {
      key: 'lead', header: '', tdClass: 'lead', card: 'lead',
      render: (t) => (
        <div className="stack">
          <span className="mdot" />
          <RowToggle open={drill.isOpen(t.ticketRowKey)} onToggle={() => drill.toggle(t.ticketRowKey)} />
        </div>
      ),
    },
    {
      key: 'ticket', header: 'Ticket Details', thClass: 'ta-c', align: 'left', card: 'title',
      render: (t) => <><div className="tno">{t.ticketNo}</div><div className="sub">{t.mbkNo}</div></>,
    },
    { key: 'file', header: 'File No.', thClass: 'ta-c', tdClass: 'file', align: 'left', card: 'extra', render: (t) => <FileNo file={t.fileNo} /> },
    {
      key: 'pax-tour', header: 'Passenger / Tour', thClass: 'ta-c', align: 'left',
      render: (t) => <><div className="fw6">{t.passenger}</div><div className="tour">{t.tourName}</div></>,
    },
    { key: 'pax', header: 'Pax', thClass: 'ta-c', tdClass: 'fw7', align: 'center', card: 'extra', render: (t) => t.pax },
    {
      key: 'status', header: 'Ticket Status', thClass: 'ta-c', align: 'center',
      render: (t) => <><Badge status={t.ticketStatus} className="nw" /><div className="sub mt3">Booked: {f.date(t.bookingDate)}</div></>,
    },
    {
      key: 'exec', header: 'Booking Exec', thClass: 'ta-c', align: 'left', card: 'extra',
      render: (t) => <><div>{t.bookingExecutiveName}</div><div className="sub">{t.bookingBranch}</div></>,
    },
    {
      key: 'ops', header: 'OPS Status', align: 'center',
      render: (t) => <><Badge status={t.opsStatus} className="nw" /><div className="sub mt3">{f.list(t.opsBranchCodes, ' / ')}</div></>,
    },
    {
      key: 'period', header: 'Tour Period', thClass: 'ta-c', tdClass: 'fs11', align: 'center',
      render: (t) => (
        <>
          <div>{f.date(t.tourStartDate)}</div>
          <div className="c-mut fs10">to</div>
          <div>{f.date(t.tourEndDate)}</div>
          <div className="fw7 mt2">{t.tourDays} days</div>
        </>
      ),
    },
    {
      key: 'days-left', header: 'Days Left', thClass: 'ta-c', align: 'center', card: 'extra',
      render: (t) => <span className={`dl ${f.daysLeftTone(t.daysLeft)}`}>{f.daysLeftText(t.daysLeft)}</span>,
    },
    {
      key: 'fin', header: 'Financials', thClass: 'ta-c', tdClass: 'fin', align: 'right',
      render: (t) => {
        const due = t.balancePending > 0;
        return (
          <>
            {due ? (
              <>
                <div className="bal">{f.inr(t.balancePending)}</div>
                <div className="bal-cap">Bal. Pending · {f.pctOf(t.balancePending, t.totalAmount)}</div>
              </>
            ) : (
              <div className="paid-full">Fully Paid · 100%</div>
            )}
            <div className="sub">{f.inr(t.totalAmount)} total</div>
            {due && <div className="sub">{f.inr(t.paidAmount)} paid · {f.pct(t.percentPaid, t.totalAmount)}</div>}
          </>
        );
      },
    },
    { key: 'svc', header: 'Service', thClass: 'ta-c', card: 'extra', render: (t) => <span className="svc-n">{t.serviceCount}</span> },
    {
      key: 'actions', header: 'Actions', thClass: 'ta-c', align: 'center', card: 'extra',
      // Downloads arrive in Phase 7; contract v0.1 has no ticket-level voucher flag yet, so the item stays disabled.
      render: () => (
        <ActionsMenu
          items={[
            { label: 'Download Ticket' },
            { label: 'Download Itinerary' },
            { label: 'View Cost Sheet' },
            { label: 'Download Vouchers', disabled: true, title: 'All services must be completed first' },
          ]}
        />
      ),
    },
  ];

  return (
    <DataTable
      className="tt cards t-tss-ticket"
      grouped
      columns={columns}
      rows={rows}
      rowKey={(t) => t.ticketRowKey}
      rowClassName={(t) => (t.isMine ? 'mine' : undefined)}
      drill={{
        isOpen: (t) => drill.isOpen(t.ticketRowKey),
        render: (t) => (
          <div className="drill-tbl-wrap">
            <TicketServices state={drill.entry(t.ticketRowKey)} onRetry={() => drill.retry(t.ticketRowKey)} />
          </div>
        ),
      }}
      emptyText="No tickets found."
    />
  );
}
