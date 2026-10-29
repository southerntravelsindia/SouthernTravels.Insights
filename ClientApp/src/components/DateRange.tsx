// Date range filter (AC22): native From / To date inputs in the filter grid cell, both ends inclusive.

export interface DateRangeValue {
  from: string | null;
  to: string | null;
}

export function DateRange({ label, value, onChange }: { label: string; value: DateRangeValue; onChange: (v: DateRangeValue) => void }) {
  return (
    <div className="flt ins01-dr" role="group" aria-label={label}>
      <span>{label}</span>
      <div className="ins01-dr-row">
        <input type="date" aria-label={`${label} from`} value={value.from ?? ''} max={value.to ?? undefined}
          onChange={(e) => onChange({ ...value, from: e.target.value || null })} />
        <span className="ins01-dr-to">to</span>
        <input type="date" aria-label={`${label} to`} value={value.to ?? ''} min={value.from ?? undefined}
          onChange={(e) => onChange({ ...value, to: e.target.value || null })} />
      </div>
    </div>
  );
}
