// Vendor drill-down: the vendor's services with their ticket and figures (Index.cshtml, table.st).
import { FileNo, Ln, Pill } from '../../components/Cell';
import { DataTable, type Column } from '../../components/DataTable';
import * as f from '../../lib/format';
import { DrillStatus } from './DrillStatus';
import type { DrillEntry } from './useDrill';
import type { VendorService } from './types';

const columns: Column<VendorService>[] = [
  { key: 'mbk', header: 'MBK / Ticket No.', card: 'title', render: (x) => <><Ln className="fw6 c-blue">{x.mbkNo}</Ln><Ln className="fs105 c-mut">{x.ticketNo}</Ln></> },
  { key: 'file', header: 'File No.', render: (x) => <FileNo file={x.fileNo} className="fs105" /> },
  { key: 'pax', header: 'Passenger', render: (x) => <Ln>{x.passenger}</Ln> },
  {
    key: 'gpb', header: 'Grand / Paid / Balance', thClass: 'ta-r', tdClass: 'ta-r',
    render: (x) => (
      <>
        <Ln className="fw7">{f.inr(x.grandTotal)}</Ln>
        <Ln className="c-grn">{f.inr(x.paidAmount)} paid · {f.pct(x.paidPercent, x.grandTotal)}</Ln>
        {x.balanceAmount > 0
          ? <Ln className="fw7 c-red">{f.inr(x.balanceAmount)} due · {f.pct(x.duePercent, x.grandTotal)}</Ln>
          : <Ln className="c-grn">Nil · 0%</Ln>}
      </>
    ),
  },
  { key: 'type', header: 'Svc Type', render: (x) => <div className="ln "><Pill type={x.svcType} /></div> },
  { key: 'city', header: 'City', render: (x) => <Ln>{x.city}</Ln> },
  { key: 'name', header: 'Name of Service', render: (x) => <Ln className="fw6">{x.nameOfService}</Ln> },
  { key: 'dates', header: 'Start / End', render: (x) => <><Ln>{f.short(x.startDate)}</Ln><Ln className="c-mut">{f.short(x.endDate)}</Ln></> },
  {
    key: 'sell', header: 'Selling / Payable', thClass: 'ta-r', tdClass: 'ta-r',
    render: (x) => (
      <>
        <Ln className="fw7">{f.inr(x.selling)}</Ln><Ln className="fs9 c-mut">sell</Ln>
        <Ln className="c-blue mt3">{f.inr(x.payable)}</Ln><Ln className="fs9 c-mut">payable</Ln>
      </>
    ),
  },
  {
    key: 'profit', header: 'Profit / %', thClass: 'ta-r', tdClass: 'ta-r',
    render: (x) => (
      <>
        <Ln className="fw7 c-grn">{f.inr(x.profit)}</Ln><Ln className="fs9 c-mut">profit</Ln>
        <Ln className="mt3">{f.profitPct(x.profitPercent)}</Ln><Ln className="fs9 c-mut">on sell</Ln>
      </>
    ),
  },
  {
    key: 'conf', header: 'Conf. Date',
    render: (x) => (x.confirmationDate ? <Ln>{f.short(x.confirmationDate)}</Ln> : <Ln className="c-amb fw7">Pending</Ln>),
  },
];

export function VendorServices({ state, onRetry }: { state: DrillEntry<VendorService>; onRetry: () => void }) {
  if (state.status !== 'ok') return <DrillStatus state={state} onRetry={onRetry} />;
  return <DataTable className="st cards t-tss-vendor-d" columns={columns} rows={state.items} rowKey={(x) => x.serviceRowId} />;
}
