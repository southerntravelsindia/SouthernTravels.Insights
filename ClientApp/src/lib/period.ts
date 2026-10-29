// Period control (AC24): Today, This Week (Monday–Sunday), This Month, Custom, on Booking Date, in IST whatever the
// machine's time zone (H22). Dates are "yyyy-MM-dd" strings; Date objects are only used for calendar arithmetic in UTC.

export type PeriodKey = 'today' | 'week' | 'month' | 'custom';

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

/** AC3: the page opens on This Month. */
export const DEFAULT_PERIOD: PeriodKey = 'month';

const ist = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Today's date in India, "yyyy-MM-dd". */
export const istToday = (now: Date = new Date()): string => ist.format(now);

const toUtc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => toIso(new Date(toUtc(iso).getTime() + n * 86_400_000));

export interface DateSpan {
  from: string;
  to: string;
}

/**
 * The Booking Date range a period stands for, both ends inclusive. Custom uses the user's two dates and is null until
 * both are set.
 */
export function resolvePeriod(key: PeriodKey, custom: Partial<DateSpan> = {}, now: Date = new Date()): DateSpan | null {
  const today = istToday(now);
  switch (key) {
    case 'today':
      return { from: today, to: today };
    case 'week': {
      const dow = (toUtc(today).getUTCDay() + 6) % 7; // Monday = 0
      const from = addDays(today, -dow);
      return { from, to: addDays(from, 6) };
    }
    case 'month': {
      const [y, m] = today.split('-').map(Number) as [number, number];
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const mm = String(m).padStart(2, '0');
      return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, '0')}` };
    }
    case 'custom':
      return custom.from && custom.to ? { from: custom.from, to: custom.to } : null;
  }
}

/** Days in an inclusive range (for the 366-day limit). */
export const spanDays = (from: string, to: string): number => Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000) + 1;

export const isIsoDate = (v: string | null | undefined): v is string =>
  !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(toUtc(v).getTime()) && toIso(toUtc(v)) === v;
