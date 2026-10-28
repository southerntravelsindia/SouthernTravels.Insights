// KPI cards (Views/Shared/_KpisTabsToolbar.cshtml): one auto-fit grid; scrolls away above the pinned bar (D7).

export interface KpiItem {
  label: string;
  value: string;
  /** A design token, e.g. "var(--info-ink)". */
  color: string;
  /** 16px count instead of the 12px value. */
  big?: boolean;
  tip?: string;
}

export function KpiRow({ items, minWidth = 120, loading = false }: { items: KpiItem[]; minWidth?: number; loading?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div className="kpis" style={{ gridTemplateColumns: `repeat(auto-fit,minmax(${minWidth}px,1fr))` }} aria-busy={loading || undefined}>
      {items.map((k) => (
        <div className="kpi" title={k.tip ?? ''} key={k.label}>
          <div className="k-l">{k.label}</div>
          <div className={k.big ? 'k-v big' : 'k-v'} style={{ color: k.color }}>
            {loading ? <span className="ins01-shimmer">&nbsp;</span> : k.value}
          </div>
        </div>
      ))}
    </div>
  );
}
