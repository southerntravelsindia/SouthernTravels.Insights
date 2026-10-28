// Title row with the "i" description tooltip and the Period control (Views/Shared/_ReportHeader.cshtml at 56d2c67).
// Period (AC24): four options, applied on change; Custom shows two date fields beside it.
import { PERIODS, type PeriodKey } from '../lib/period';
import type { DateRangeValue } from './DateRange';

export interface ReportHeaderProps {
  title: string;
  description: string;
  period: PeriodKey;
  custom: DateRangeValue;
  onPeriod: (p: PeriodKey) => void;
  onCustom: (v: DateRangeValue) => void;
}

export function ReportHeader({ title, description, period, custom, onPeriod, onCustom }: ReportHeaderProps) {
  return (
    <div className="title-row">
      <h2>{title}</h2>
      <button type="button" className="info-btn" aria-label="About this report">i</button>
      <div className="desc-pop" role="tooltip">{description}</div>
      <div className="title-ctl">
        <span className="cap">Period</span>
        <select aria-label="Period" value={period} onChange={(e) => onPeriod(e.target.value as PeriodKey)}>
          {PERIODS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        {period === 'custom' && (
          <>
            <input type="date" aria-label="Period from" value={custom.from ?? ''} max={custom.to ?? undefined}
              onChange={(e) => onCustom({ ...custom, from: e.target.value || null })} />
            <span className="to">to</span>
            <input type="date" aria-label="Period to" value={custom.to ?? ''} min={custom.from ?? undefined}
              onChange={(e) => onCustom({ ...custom, to: e.target.value || null })} />
          </>
        )}
      </div>
    </div>
  );
}
