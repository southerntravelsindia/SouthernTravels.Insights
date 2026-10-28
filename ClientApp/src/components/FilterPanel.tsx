// Filter panel (Views/Shared/_KpisTabsToolbar.cshtml filter grid at 56d2c67): ten multi-selects and four date ranges.
// Desktop: under the toolbar, every change applies at once. Below 1150px site.css turns it into a full-screen sheet;
// there the page keeps the changes as a draft until Done (TSD §2.1).
import type { ReactNode } from 'react';
import { DateRange, type DateRangeValue } from './DateRange';
import { MultiSelect, type MultiOption } from './MultiSelect';

export interface PanelFilter {
  key: string;
  label: string;
  options: MultiOption[];
  selected: string[];
}

export interface PanelRange {
  key: string;
  label: string;
  value: DateRangeValue;
}

export interface FilterPanelProps {
  id: string;
  filters: PanelFilter[];
  ranges: PanelRange[];
  onFilter: (key: string, values: string[]) => void;
  onRange: (key: string, value: DateRangeValue) => void;
  onClear: () => void;
  /** Sheet: apply the draft and close. */
  onDone: () => void;
  /** Sheet: close without applying. */
  onClose: () => void;
  notice?: ReactNode;
}

export function FilterPanel(p: FilterPanelProps) {
  return (
    <div className="filters open" id={p.id} role="region" aria-label="Filters">
      <div className="sheet-head">
        <b>Filters</b>
        <button type="button" className="sheet-x" aria-label="Close filters" onClick={p.onClose}>✕</button>
      </div>
      <div className="filters-head">
        {p.notice}
        <button type="button" className="btn-clear" onClick={p.onClear}>Clear filters</button>
      </div>
      <div className="grid">
        {p.filters.map((f) => (
          <MultiSelect key={f.key} label={f.label} options={f.options} selected={f.selected} onChange={(v) => p.onFilter(f.key, v)} />
        ))}
        {p.ranges.map((r) => (
          <DateRange key={r.key} label={r.label} value={r.value} onChange={(v) => p.onRange(r.key, v)} />
        ))}
      </div>
      <div className="sheet-foot">
        <button type="button" className="btn-clear" onClick={p.onClear}>Clear filters</button>
        <button type="button" className="sheet-done" onClick={p.onDone}>Done</button>
      </div>
    </div>
  );
}
