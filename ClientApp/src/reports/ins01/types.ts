// BFF response shapes (Models/Ins01/Ins01Models.cs, camelCase). Field meanings follow the API contract
// docs-claude planned/contracts/INS-01.md v0.1. Money is rupees as stored; dates are "yyyy-MM-dd".

export interface Paging {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  showingFrom: number;
  showingTo: number;
  totalPages: number;
}

export interface ListPage<T> {
  rows: T[];
  paging: Paging;
}

export interface Kpi {
  totalTickets: number;
  newTickets: number;
  inProgressTickets: number;
  completedTickets: number;
  cancelledTickets: number;
  newToCompletedTatDays: number | null;
}

export interface TicketRow {
  ticketRowKey: number;
  mbkNo: string;
  ticketNo: string;
  fileNo: string;
  passenger: string;
  tourName: string;
  pax: number | null;
  ticketStatus: string;
  bookingDate: string | null;
  bookingExecutiveName: string;
  bookingBranch: string;
  opsStatus: string;
  opsBranchCodes: string;
  tourStartDate: string | null;
  tourEndDate: string | null;
  tourDays: number | null;
  daysLeft: number | null;
  totalAmount: number;
  paidAmount: number;
  balancePending: number;
  percentPaid: number;
  serviceCount: number;
  completionPct: number | null;
  pendingServices: number;
  cancelledServices: number;
  /** Proposed (not in contract v0.1): every service voucher-ready. */
  isVoucherEnabled: boolean;
  isMine: boolean;
  isCancelled: boolean;
}

export interface TicketService {
  serviceRowId: number;
  ticketRowKey: number;
  svcType: string;
  city: string;
  nameOfService: string;
  category: string;
  mealPlan: string;
  opsUser: string;
  opsBranch: string;
  opsStatus: string;
  serviceStatus: string;
  confirmationDate: string | null;
  confirmationNo: string;
  svcStart: string | null;
  svcEnd: string | null;
  days: number | null;
  isVoucherEnabled: boolean;
}

export interface VendorRow {
  vendorId: number;
  vendorCode: string;
  vendorName: string;
  cities: string;
  serviceTypes: string;
  tickets: number;
  serviceCount: number;
  totalSaleValue: number;
  vendorPayable: number;
  vendorPaid: number;
  balancePending: number;
  isActive: boolean;
}

export interface VendorService {
  serviceRowId: number;
  vendorId: number;
  ticketRowKey: number;
  mbkNo: string;
  ticketNo: string;
  fileNo: string;
  passenger: string;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paidPercent: number;
  duePercent: number;
  svcType: string;
  city: string;
  nameOfService: string;
  startDate: string | null;
  endDate: string | null;
  days: number | null;
  selling: number;
  payable: number;
  profit: number;
  profitPercent: number | null;
  confirmationDate: string | null;
}
