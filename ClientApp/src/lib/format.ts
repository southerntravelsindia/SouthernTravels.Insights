// Display rules for INS-01 (TSD §2: one owner per value). Components print what these return; they never format.
// Ported from the Razor page (Infrastructure/Fmt.cs, Infrastructure/Ui.cs, Reports/TicketServiceStatusReport.cs).
// Dates arrive as "yyyy-MM-dd" strings and are only re-arranged, never turned into Date objects, so the browser's
// time zone can't shift them (H22).

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Shown when a figure can't be computed (e.g. a percentage of a zero total). */
export const DASH = '–';

/** JavaScript Math.round semantics (half rounds up), as Fmt.Round. */
export const round = (v: number): number => Math.floor(v + 0.5);

function parts(iso: string): [string, string, string] {
  const [y = '', m = '', d = ''] = iso.slice(0, 10).split('-');
  return [y, m, d];
}

/** "05 Oct 2026"; empty when there is no date. */
export function date(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = parts(iso);
  return `${d} ${MON[Number(m) - 1] ?? ''} ${y}`;
}

/** Drill-down date (D9): "05/10/26"; empty when there is no date. */
export function short(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = parts(iso);
  return `${d}/${m}/${y.slice(2)}`;
}

/** ₹ with Indian digit grouping, e.g. ₹1,48,500 (rounded to whole rupees). */
export function inr(n: number): string {
  const v = round(n);
  let s = String(Math.abs(v));
  if (s.length > 3) {
    const last3 = s.slice(-3);
    let rest = s.slice(0, -3);
    const groups: string[] = [];
    while (rest.length > 2) {
      groups.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest.length > 0) groups.unshift(rest);
    s = `${groups.join(',')},${last3}`;
  }
  return `₹${v < 0 ? '-' : ''}${s}`;
}

/** One decimal place, e.g. "12.5". */
export const fixed1 = (v: number): string => v.toFixed(1);

/** Whole percentage of a total, half up ("54%"); a dash when the total is zero. */
export function pctOf(part: number, whole: number): string {
  return whole === 0 ? DASH : `${round((part / whole) * 100)}%`;
}

/** A whole percentage the API already computed ("40%"); a dash when the total behind it is zero. */
export function pct(value: number, whole: number): string {
  return whole === 0 ? DASH : `${value}%`;
}

/** Profit on sell, one decimal ("12.5%"); a dash when the API returns none (sell is zero). */
export const profitPct = (v: number | null | undefined): string => (v == null ? DASH : `${fixed1(v)}%`);

/** New → Completed TAT KPI value: "4.3 days", or "-" when there is nothing to average (as the Razor page). */
export const tatDays = (v: number | null | undefined): string => (v == null ? '-' : `${fixed1(v)} days`);

/** Days Left chip text from the API's whole days (tour start − today, IST). */
export function daysLeftText(days: number | null | undefined): string {
  if (days == null) return DASH;
  if (days < 0) return 'Departed';
  if (days === 0) return 'Departs today';
  return days === 1 ? '1 day left' : `${days} days left`;
}

/** Days Left chip tone: "soon" (0–7 days), "past" or "later". */
export function daysLeftTone(days: number | null | undefined): 'soon' | 'past' | 'later' {
  if (days == null) return 'later';
  if (days < 0) return 'past';
  return days <= 7 ? 'soon' : 'later';
}

/** A comma-separated API list printed with another separator ("Agra, Delhi" / "DEL001 / HYD001"). */
export function list(csv: string | null | undefined, separator = ', '): string {
  return splitList(csv).join(separator);
}

/** A comma-separated API list as items (trimmed, blanks dropped). */
export function splitList(csv: string | null | undefined): string[] {
  return (csv ?? '').split(',').map((x) => x.trim()).filter((x) => x.length > 0);
}

/** File number pieces, so the cell can wrap at its slashes (D9). */
export const fileNoParts = (file: string): string[] => file.split('/');

/** Status badge tone class (ticket / service / OPS statuses), as Ui.Tone. */
export function tone(status: string): string {
  switch (status) {
    case 'Confirmed': case 'Approved': case 'Paid': case 'Refund': case 'Active': case 'Generated': return 'tone-ok';
    case 'Cancel': return 'tone-cancel';
    case 'Pending': case 'Not generated': return 'tone-warn';
    case 'Cancelled': case 'Rejected': return 'tone-danger';
    case 'In Progress': case 'Requested': case 'Reissue': return 'tone-info';
    case 'Completed': return 'tone-done';
    default: return 'tone-neutral';
  }
}

/** Service type pill class, as Ui.TypeTone. */
export function typeTone(type: string): string {
  switch (type) {
    case 'Accommodation': return 'ty-acc';
    case 'Transport': return 'ty-tra';
    case 'Guide': return 'ty-gui';
    case 'En-Route Meals': return 'ty-mea';
    default: return 'ty-oth';
  }
}

/**
 * OPS Status third line (AC12, TSD §2.1): "60% · 2 pending" from the API's CompletionPct and PendingServices; empty when
 * the API sends no percentage (no non-cancelled service). Provisional until BA Q6 (rounding, cancelled, placement).
 */
export function completionText(pct: number | null | undefined, pending: number): string {
  return pct == null ? '' : `${pct}% · ${pending} pending`;
}

/** "Showing 1–10 of 45", with an optional noun, or "No results". */
export function showing(from: number, to: number, total: number, unit = ''): string {
  return total > 0 ? `Showing ${from}–${to} of ${total}${unit ? ` ${unit}` : ''}` : 'No results';
}
