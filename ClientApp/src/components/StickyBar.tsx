// Page-scroll pattern (D7, SCROLL_BEHAVIOUR.md): the KPI cards scroll away; tabs, toolbar and filter panel stay pinned
// in this bar, and the table header sticks under it at --stick-h (64px in site.css, as on the Razor page).
import type { ReactNode } from 'react';

export const StickyBar = ({ children }: { children: ReactNode }) => <div className="sticky-bar">{children}</div>;
