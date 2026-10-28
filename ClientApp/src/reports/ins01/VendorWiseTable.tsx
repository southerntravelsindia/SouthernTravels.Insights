// Vendor-Wise View (Views/TicketServiceStatus/Index.cshtml, vendor tab): one row per vendor, its services on expand.
import { Badge, Ln, Pill } from '../../components/Cell';
import { DataTable, type Column } from '../../components/DataTable';
import { RowToggle } from '../../components/RowToggle';
import * as f from '../../lib/format';
import { VendorServices } from './VendorServices';
import type { DrillState } from './useDrill';
import type { VendorRow, VendorService } from './types';

export function VendorWiseTable({ rows, drill }: { rows: VendorRow[]; drill: DrillState<VendorService> }) {
  const columns: Column<VendorRow>[] = [
    { key: 'chev', header: '', tdClass: 'chev', card: 'lead', render: (g) => <RowToggle open={drill.isOpen(g.vendorId)} onToggle={() => drill.toggle(g.vendorId)} /> },
    { key: 'id', header: 'Vendor ID', align: 'left', card: 'title', render: (g) => <Ln className="fw7 c-blue">{g.vendorCode}</Ln> },
    { key: 'name', header: 'Vendor Name', align: 'left', render: (g) => <Ln className="fw7">{g.vendorName}</Ln> },
    { key: 'cities', header: 'City / Cities', align: 'left', card: 'extra', render: (g) => <Ln>{f.list(g.cities)}</Ln> },
    {
      key: 'types', header: 'Service Type(s)',
      render: (g) => f.splitList(g.serviceTypes).map((ty) => <div className="ln " key={ty}><Pill type={ty} /></div>),
    },
    { key: 'files', header: 'Files', tdClass: 'ta-c', card: 'extra', render: (g) => <Ln className="fw7">{g.tickets}</Ln> },
    { key: 'sell', header: 'Total Sale Value', tdClass: 'ta-r', align: 'right', render: (g) => <Ln className="fw7 c-blue">{f.inr(g.totalSaleValue)}</Ln> },
    { key: 'payable', header: 'Vendor Payable', tdClass: 'ta-r', align: 'right', card: 'extra', render: (g) => <Ln className="fw7">{f.inr(g.vendorPayable)}</Ln> },
    {
      key: 'balance', header: 'Balance Pending', tdClass: 'ta-r', align: 'right',
      render: (g) =>
        g.balancePending > 0
          ? <><Ln className="fw7 c-red">{f.inr(g.balancePending)}</Ln><Ln className="fs9 c-mut">to be paid</Ln></>
          : <Ln className="c-grn">{f.inr(0)}</Ln>,
    },
    { key: 'active', header: 'Active', tdClass: 'ta-c', align: 'center', render: (g) => <div className="ln "><Badge status={g.isActive ? 'Active' : 'Inactive'} /></div> },
  ];

  return (
    <DataTable
      className="gt cards t-tss-vendor"
      grouped
      headerWrap
      columns={columns}
      rows={rows}
      rowKey={(g) => g.vendorId}
      drill={{
        isOpen: (g) => drill.isOpen(g.vendorId),
        render: (g) => (
          <div className="drill-in">
            <div className="sec">
              <div className="sec-t">{g.vendorName} — services</div>
              <VendorServices state={drill.entry(g.vendorId)} onRetry={() => drill.retry(g.vendorId)} />
            </div>
          </div>
        ),
      }}
      emptyText="No vendors found."
    />
  );
}
