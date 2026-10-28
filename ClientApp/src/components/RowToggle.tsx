// Drill-down chevron: a real button with aria-expanded (D10), styled like the Razor page's checkbox label (.rx-l).

export function RowToggle({ open, onToggle, label = 'Show services' }: { open: boolean; onToggle: () => void; label?: string }) {
  return (
    <button type="button" className="rx-l" aria-expanded={open} aria-label={label} onClick={onToggle}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </button>
  );
}
