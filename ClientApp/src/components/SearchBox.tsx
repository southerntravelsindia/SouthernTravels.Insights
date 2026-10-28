// Toolbar search (AC23): updates the URL after Enter or a 400 ms pause (TSD §2.1). At most 100 characters (H6).
import { useEffect, useRef, useState } from 'react';

const PAUSE_MS = 400;

export function SearchBox({ value, placeholder, onCommit, maxLength = 100 }: {
  value: string;
  placeholder: string;
  onCommit: (text: string) => void;
  maxLength?: number;
}) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The URL changed from elsewhere (Back, Clear, a link): show it.
  useEffect(() => setText(value), [value]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const commit = (t: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (t.trim() !== value) onCommit(t.trim());
  };

  return (
    <label className="search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        placeholder={placeholder}
        aria-label="Search"
        value={text}
        maxLength={maxLength}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => commit(t), PAUSE_MS);
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(text); } }}
      />
    </label>
  );
}
