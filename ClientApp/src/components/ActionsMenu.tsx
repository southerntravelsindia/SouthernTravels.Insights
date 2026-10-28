// Row actions menu (hover / keyboard focus, as the Razor page). Downloads arrive in Phase 7; disabled items say why.

export interface ActionItem {
  label: string;
  disabled?: boolean;
  title?: string;
}

export function ActionsMenu({ items }: { items: ActionItem[] }) {
  return (
    <div className="act-wrap">
      <button type="button" className="act-btn" aria-label="Actions" aria-haspopup="menu">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="act-menu" role="menu">
        {items.map((it) => (
          <button key={it.label} type="button" role="menuitem" className={it.disabled ? 'off' : ''} title={it.title} aria-disabled={it.disabled || undefined}>
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
