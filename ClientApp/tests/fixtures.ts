// Synthetic INS-01 data for component tests (no real customers).
import type { Kpi, ListPage, TicketRow, TicketService, VendorRow } from '../src/reports/ins01/types';

export const kpi: Kpi = { totalTickets: 3, newTickets: 1, inProgressTickets: 1, completedTickets: 1, cancelledTickets: 0, newToCompletedTatDays: 4.5 };

export const ticket = (n: number, over: Partial<TicketRow> = {}): TicketRow => ({
  ticketRowKey: n,
  mbkNo: `MBK-TEST-${n}`,
  ticketNo: `GRP${1000 + n}`,
  fileNo: `FN/00000${n}/2026-27/DEL001`,
  passenger: `Test Passenger ${n}`,
  tourName: 'Test Tour',
  pax: 2,
  ticketStatus: 'Confirmed',
  bookingDate: '2026-09-02',
  bookingExecutiveName: 'Test Exec',
  bookingBranch: 'Delhi',
  opsStatus: 'In Progress',
  opsBranchCodes: 'DEL001,HYD001',
  tourStartDate: '2026-10-12',
  tourEndDate: '2026-10-18',
  tourDays: 7,
  daysLeft: 7,
  totalAmount: 100000,
  paidAmount: 40000,
  balancePending: 60000,
  percentPaid: 40,
  serviceCount: 3,
  completionPct: 33,
  pendingServices: 2,
  cancelledServices: 0,
  isVoucherEnabled: false,
  isMine: n === 1,
  isCancelled: false,
  ...over,
});

export const ticketPage = (rows: TicketRow[]): ListPage<TicketRow> => ({
  rows,
  paging: { totalCount: rows.length, pageNumber: 1, pageSize: 10, showingFrom: rows.length ? 1 : 0, showingTo: rows.length, totalPages: 1 },
});

export const service = (ticketRowKey: number, i: number): TicketService => ({
  serviceRowId: ticketRowKey * 100 + i,
  ticketRowKey,
  svcType: 'Accommodation',
  city: 'Agra',
  nameOfService: `Test Hotel ${i}`,
  category: 'Deluxe',
  mealPlan: 'MAP',
  opsUser: 'Test Ops',
  opsBranch: 'DEL001',
  opsStatus: 'Completed',
  serviceStatus: 'Confirmed',
  confirmationDate: i === 0 ? null : '2026-09-09',
  confirmationNo: 'CN-1',
  svcStart: '2026-10-14',
  svcEnd: '2026-10-16',
  days: 2,
  isVoucherEnabled: i !== 0,
});

export const vendor: VendorRow = {
  vendorId: 101, vendorCode: 'V101', vendorName: 'Test Vendor', cities: 'Agra,Delhi', serviceTypes: 'Accommodation,Transport',
  tickets: 2, serviceCount: 3, totalSaleValue: 150000, vendorPayable: 120000, vendorPaid: 100000, balancePending: 20000, isActive: true,
};
