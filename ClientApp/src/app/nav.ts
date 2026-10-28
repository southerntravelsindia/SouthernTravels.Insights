// The Insights side menu: the 15 reports in the original order with their icons (Reports/ReportPage.cs Nav at 56d2c67).
// r1 is this app; the other 14 are Razor pages on the Insights site, reached through VITE_INSIGHTS_URL when it is set.

export interface NavItem {
  id: string;
  /** Path segment on the Insights site: /Operations/<action>. */
  action: string;
  label: string;
  /** SVG path data (24×24, stroked). */
  icon: string;
}

export const THIS_REPORT = 'r1';

export const NAV: NavItem[] = [
  { id: 'r1', action: 'TicketServiceStatus', label: 'Ticket & Service Status', icon: 'M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1zM13 5v2M13 11v2M13 17v2' },
  { id: 'r2', action: 'OpsUserWorkload', label: 'OPS User Workload', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { id: 'r3', action: 'ServiceWise', label: 'Service wise Report', icon: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { id: 'r4', action: 'VendorPayment', label: 'Vendor Payment details', icon: 'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18' },
  { id: 'r5', action: 'Cancellation', label: 'Cancellation Report', icon: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM15 9l-6 6M9 9l6 6' },
  { id: 'r6', action: 'Advance', label: 'Advance Report', icon: 'M2 7h20v10H2zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 12h.01M18 12h.01' },
  { id: 'r7', action: 'WeeklySalesTrend', label: 'Weekly Sales trend', icon: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
  { id: 'r8', action: 'DailyEmpSales', label: 'Daily EMP Sales', icon: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 18v-3M12 18v-5M16 18v-7' },
  { id: 'r9', action: 'SalesVsTarget', label: 'Sales vs Target', icon: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
  { id: 'r10', action: 'DutySlip', label: 'Duty Slip Report', icon: 'M5 17H3v-5l2-5h12l3 4 2 1v5h-2M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0M9 17h6M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0M8 7l-1 5h12M12 7v5' },
  { id: 'r11', action: 'Tcs', label: 'TCS Report', icon: 'M4 3h16v18l-3-2-2 2-3-2-3 2-3-2-2 2zM12 8v6M9 11h6' },
  { id: 'r12', action: 'Gst', label: 'GST Report', icon: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M9.5 17.5l5-5M10 13h.01M14 17h.01' },
  { id: 'r13', action: 'Tds', label: 'TDS Report', icon: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M9 15h6' },
  { id: 'r14', action: 'CashSheetAudit', label: 'Cash Sheet Audit Report', icon: 'M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12a2 2 0 0 0 2 2h14v-4M18 12a2 2 0 0 0 0 4h4v-4z' },
  { id: 'r15', action: 'BalancePending', label: 'Balance Pending Report', icon: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2' },
];

/** Link for a report on the Insights site ("?pick=1" collapses its rail, as the Razor menu did), or null when not set. */
export function insightsHref(item: NavItem, insightsUrl: string | null): string | null {
  return insightsUrl ? `${insightsUrl}Operations/${item.action}?pick=1` : null;
}
