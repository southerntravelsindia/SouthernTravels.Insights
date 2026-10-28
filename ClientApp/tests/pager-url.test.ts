import { describe, expect, it } from 'vitest';
import { pageButtons } from '../src/lib/pager';
import { pageHref, readState, showAllHref, tabHref } from '../src/lib/urlState';

const labels = (page: number, pages: number) => pageButtons(page, pages).map((b) => b.label).join(' ');

describe('pageButtons', () => {
  it('lists every page up to seven', () => {
    expect(labels(1, 1)).toBe('‹ 1 ›');
    expect(labels(3, 7)).toBe('‹ 1 2 3 4 5 6 7 ›');
  });

  it('uses ellipses beyond seven pages, as the Razor pager', () => {
    expect(labels(2, 12)).toBe('‹ 1 2 3 4 5 … 12 ›');
    expect(labels(6, 12)).toBe('‹ 1 … 5 6 7 … 12 ›');
    expect(labels(11, 12)).toBe('‹ 1 … 8 9 10 11 12 ›');
  });

  it('disables the arrows at the ends and marks the active page', () => {
    const b = pageButtons(1, 3);
    expect(b[0]?.page).toBeNull();
    expect(b.at(-1)?.page).toBe(2);
    expect(b.find((x) => x.active)?.label).toBe('1');
  });
});

describe('URL state', () => {
  const q = (s: string) => readState(new URLSearchParams(s));

  it('defaults an unknown tab to Ticket-Wise and a bad page to 1', () => {
    expect(q('')).toMatchObject({ tab: 'ticket', page: 1, all: false, period: 'month', q: '' });
    expect(q('tab=nope&page=abc')).toMatchObject({ tab: 'ticket', page: 1, all: false });
    expect(q('tab=vendor&page=0&all=1')).toMatchObject({ tab: 'vendor', page: 1, all: true });
    expect(q('page=3')).toMatchObject({ page: 3 });
  });

  it('builds the same links as the Razor page', () => {
    const s = q('tab=ticket&page=2&all=1');
    expect(tabHref('vendor', s)).toBe('?tab=vendor&all=1');
    expect(pageHref(3, s)).toBe('?tab=ticket&page=3&all=1');
    expect(showAllHref(s)).toBe('?tab=ticket');
    expect(showAllHref(q('tab=vendor'))).toBe('?tab=vendor&all=1');
  });
});
