// Toolbar under the tabs (Views/Shared/_KpisTabsToolbar.cshtml at 56d2c67): search, Filters, result count, Export,
// Expand / Collapse All. Export is shown disabled until Phase 6 (Access Management, Q4).
import { SearchBox } from './SearchBox';

export interface ToolbarProps {
  hasTabs: boolean;
  searchPlaceholder: string;
  search: string;
  onSearch: (text: string) => void;
  resultLabel: string;
  filtersOpen: boolean;
  filtersId: string;
  activeFilters: number;
  onToggleFilters: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

const icon = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function Toolbar(p: ToolbarProps) {
  return (
    <div className={p.hasTabs ? 'toolbar has-tabs' : 'toolbar'}>
      <SearchBox value={p.search} placeholder={p.searchPlaceholder} onCommit={p.onSearch} />
      <button
        type="button"
        className={p.filtersOpen ? 'tb-btn on' : 'tb-btn'}
        aria-expanded={p.filtersOpen}
        aria-controls={p.filtersId}
        aria-label={p.activeFilters ? `Filters, ${p.activeFilters} set` : 'Filters'}
        onClick={p.onToggleFilters}
      >
        <svg {...icon} strokeLinejoin={undefined} aria-hidden="true">
          <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" />
        </svg>
        <span className="tb-lbl">Filters</span>
        {p.activeFilters > 0 && <span className="badge">{p.activeFilters}</span>}
      </button>
      <span className="count">{p.resultLabel}</span>
      <span className="spacer" />
      <button type="button" className="tb-btn primary" title="Export arrives in a later release" aria-label="Export" disabled>
        <svg {...icon} aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 20h16" /></svg>
        <span className="tb-lbl">Export</span>
      </button>
      <button type="button" className="tb-btn" title="Expand All" aria-label="Expand All" onClick={p.onExpandAll}>
        <svg {...icon} aria-hidden="true"><path d="m7 15 5 5 5-5M7 9l5-5 5 5" /></svg>
        <span className="tb-lbl">Expand All</span>
      </button>
      <button type="button" className="tb-btn" title="Collapse All" aria-label="Collapse All" onClick={p.onCollapseAll}>
        <svg {...icon} aria-hidden="true"><path d="m7 20 5-5 5 5M7 4l5 5 5-5" /></svg>
        <span className="tb-lbl">Collapse All</span>
      </button>
    </div>
  );
}
