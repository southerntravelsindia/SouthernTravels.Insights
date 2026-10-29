// Multi-select filter (AC21, D10): a button that looks like the Razor page's select and opens a checkbox list.
// Keyboard: Enter/Space opens, arrows move between options, Space ticks, Escape closes and returns focus to the button.
// Long lists get a type-to-narrow box. Ticking never moves focus, so focus stays put after a filter change.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export interface MultiOption {
  value: string;
  text: string;
}

export interface MultiSelectProps {
  label: string;
  options: MultiOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** Shown instead of the list when no options are known (e.g. the list failed to load and has no built-in copy). */
  unavailableText?: string;
  max?: number;
}

const NARROW_FROM = 10;

export function MultiSelect({ label, options, selected, onChange, unavailableText = 'List unavailable', max = 50 }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [narrow, setNarrow] = useState('');
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const chosen = new Set(selected);
  const unavailable = options.length === 0;

  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);

  const summary = unavailable
    ? unavailableText
    : selected.length === 0
      ? 'All'
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.text ?? '1 selected')
        : `${selected.length} selected`;

  const toggle = (value: string) =>
    onChange(chosen.has(value) ? selected.filter((v) => v !== value) : selected.length >= max ? selected : [...selected, value]);

  const shown = narrow ? options.filter((o) => o.text.toLowerCase().includes(narrow.toLowerCase())) : options;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
      button.current?.focus();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const boxes = Array.from(wrap.current?.querySelectorAll<HTMLInputElement>('input[type=checkbox]') ?? []);
    if (boxes.length === 0) return;
    e.preventDefault();
    if (!open) { setOpen(true); return; }
    const i = boxes.indexOf(document.activeElement as HTMLInputElement);
    const next = e.key === 'ArrowDown' ? Math.min(boxes.length - 1, i + 1) : Math.max(0, i - 1);
    boxes[i < 0 ? 0 : next]?.focus();
  };

  return (
    <div className="flt ins01-ms" ref={wrap} onKeyDown={onKeyDown}>
      <span id={`${listId}-l`}>{label}</span>
      <button
        type="button"
        ref={button}
        className="ins01-ms-btn"
        aria-labelledby={`${listId}-l`}
        aria-describedby={`${listId}-v`}
        aria-expanded={open}
        aria-controls={listId}
        disabled={unavailable}
        onClick={() => setOpen((o) => !o)}
      >
        <span id={`${listId}-v`} className={selected.length ? 'ins01-ms-val on' : 'ins01-ms-val'}>{summary}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="ins01-ms-pop" id={listId} role="group" aria-labelledby={`${listId}-l`}>
          {options.length > NARROW_FROM && (
            <input className="ins01-ms-find" placeholder="Type to narrow" aria-label={`Narrow ${label}`} value={narrow} onChange={(e) => setNarrow(e.target.value)} autoFocus />
          )}
          <div className="ins01-ms-list">
            {shown.map((o) => (
              <label key={o.value} className="ins01-ms-opt">
                <input type="checkbox" checked={chosen.has(o.value)} onChange={() => toggle(o.value)} disabled={!chosen.has(o.value) && selected.length >= max} />
                <span>{o.text}</span>
              </label>
            ))}
            {shown.length === 0 && <div className="ins01-ms-none">No match</div>}
          </div>
          {selected.length > 0 && (
            <button type="button" className="btn-clear ins01-ms-clear" onClick={() => onChange([])}>Clear {label}</button>
          )}
        </div>
      )}
    </div>
  );
}
