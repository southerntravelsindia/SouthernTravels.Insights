// Synthetic STPLCostSheetAPI replies (contract INS-01 v0.1 shapes, PascalCase). No real customers.
import type { UserSession } from '../src/lib/auth';

export const user: UserSession = { token: 'test-jwt', userName: 'test.ops', name: 'Test Ops', opsBranch: 'DEL001', isAdmin: false, tenantId: 1 };

export const envelope = (Data: unknown) => ({ Success: true, Message: 'ok', Data });

export const kpi = { TotalTickets: 3, NewTickets: 1, InProgressTickets: 1, CompletedTickets: 1, CancelledTickets: 0, NewToCompletedTATDays: 4.5 };

export const ticket = (n: number, over: Record<string, unknown> = {}) => ({
  TicketRowKey: n,
  CostsheetID: 500 + n,
  MBKID: 9000 + n,
  MBKNo: `MBK-TEST-${n}`,
  TicketNo: `GRP${1000 + n}`,
  FileNo: `FN/00000${n}/2026-27/DEL001`,
  Passenger: `Test Passenger ${n}`,
  TourName: 'Test Tour',
  Pax: 2,
  TicketStatus: 'Confirmed',
  BookingDate: '2026-09-02T00:00:00',
  BookingExecutiveName: 'Test Exec',
  BookingBranch: 'Delhi',
  OpsStatusId: 9,
  OpsStatus: 'In Progress',
  OpsBranchCodes: 'DEL001,HYD001',
  TourStartDate: '2026-10-12',
  TourEndDate: '2026-10-18',
  TourDays: 7,
  DaysLeft: 7,
  TotalAmount: 100000,
  PaidAmount: 40000,
  BalancePending: 60000,
  PercentPaid: 40,
  ServiceCount: 3,
  CompletionPct: 33,
  PendingServices: 2,
  CancelledServices: 0,
  IsMine: n === 1,
  IsCancelled: false,
  ...over,
});

export const paging = (count: number, page = 1) => ({
  TotalCount: count, PageNumber: page, PageSize: 10, ShowingFrom: count ? (page - 1) * 10 + 1 : 0, ShowingTo: Math.min(page * 10, count), TotalPages: Math.max(1, Math.ceil(count / 10)),
});

export const service = (ticketRowKey: number, i: number) => ({
  ServiceRowId: ticketRowKey * 100 + i,
  TicketRowKey: ticketRowKey,
  SvcType: 'Accommodation',
  City: 'Agra',
  NameOfService: `Test Hotel ${i}`,
  Category: 'Deluxe',
  MealPlan: 'MAP',
  OpsUser: 'Test Ops',
  OpsBranch: 'DEL001',
  OpsStatus: 'Completed',
  ServiceStatus: 'Confirmed',
  ConfirmationDate: i === 0 ? null : '2026-09-09',
  ConfirmationNo: 'CN-1',
  SvcStart: '2026-10-14',
  SvcEnd: '2026-10-16',
  Days: 2,
  IsVoucherEnabled: i !== 0,
});

export const vendor = (id: number) => ({
  VendorId: id, VendorCode: `V${id}`, VendorName: `Test Vendor ${id}`, Cities: 'Agra,Delhi', ServiceTypes: 'Accommodation,Transport',
  Tickets: 2, ServiceCount: 3, TotalSaleValue: 150000, VendorPayable: 120000, VendorPaid: 100000, BalancePending: 20000, IsActive: true,
});
