// Phase 5 (TSD §10): period boundaries, URL round trip, request bodies, limits, filter lists, controls.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MultiSelect } from '../src/components/MultiSelect';
import { SearchBox } from '../src/components/SearchBox';
import { setSession } from '../src/lib/auth';
import { istToday, resolvePeriod } from '../src/lib/period';
import { change, clearFilters, readState, toQuery, type Ins01State } from '../src/lib/urlState';
import { builtInLists, filterBody, listsFrom, loadFilterLists, serviceFilterBody, validate } from '../src/reports/ins01/filters';
import { Ins01Page } from '../src/reports/ins01/Ins01Page';
import { envelope, kpi, paging, ticket, user } from './fixtures';

const at = (iso: string) => new Date(iso);
const st = (q: string): Ins01State => readState(new URLSearchParams(q));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('period (IST, AC24)', () => {
  it('uses the Indian date whatever the machine clock zone', () => {
    expect(istToday(at('2026-10-31T18:29:59Z'))).toBe('2026-10-31'); // 23:59:59 IST
    expect(istToday(at('2026-10-31T18:30:00Z'))).toBe('2026-11-01'); // 00:00 IST next day
  });

  it('This Week is Monday to Sunday', () => {
    // Monday 2 Nov 2026 00:00 IST
    expect(resolvePeriod('week', {}, at('2026-11-01T18:30:00Z'))).toEqual({ from: '2026-11-02', to: '2026-11-08' });
    // Sunday 8 Nov 2026 23:59 IST: still the same week
    expect(resolvePeriod('week', {}, at('2026-11-08T18:29:00Z'))).toEqual({ from: '2026-11-02', to: '2026-11-08' });
  });

  it('This Month covers the whole month, Today one day, Custom only with both dates', () => {
    expect(resolvePeriod('month', {}, at('2027-02-10T06:00:00Z'))).toEqual({ from: '2027-02-01', to: '2027-02-28' });
    expect(resolvePeriod('month', {}, at('2028-02-10T06:00:00Z'))).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(resolvePeriod('today', {}, at('2026-12-31T20:00:00Z'))).toEqual({ from: '2027-01-01', to: '2027-01-01' });
    expect(resolvePeriod('custom', { from: '2026-01-01' })).toBeNull();
    expect(resolvePeriod('custom', { from: '2026-01-01', to: '2026-01-31' })).toEqual({ from: '2026-01-01', to: '2026-01-31' });
  });
});

describe('URL state round trip (D3)', () => {
  it('every control survives URL → state → URL', () => {
    const url = '?tab=vendor&page=3&all=1&q=MBK-1&period=custom&pf=2026-10-01&pt=2026-10-15&ts=6&os=1%2C9&be=anita.rao&st=ACCOMMODATION%2CGUIDE&vn=101&bdf=2026-09-01&bdt=2026-09-30&cf=2026-10-02';
    const s = st(url);
    expect(s).toMatchObject({ tab: 'vendor', page: 3, all: true, q: 'MBK-1', period: 'custom', custom: { from: '2026-10-01', to: '2026-10-15' } });
    expect(s.filters.os).toEqual(['1', '9']);
    expect(s.ranges.c).toEqual({ from: '2026-10-02', to: null });
    expect(st(toQuery(s))).toEqual(s);
  });

  it('drops malformed values and resets the page on any change but paging', () => {
    const s = st('?period=yearly&pf=2026-13-40&bdf=nope&page=4');
    expect(s.period).toBe('month');
    expect(s.custom.from).toBeNull();
    expect(s.ranges.bd.from).toBeNull();
    expect(change(s, { q: 'x' }).page).toBe(1);
    expect(clearFilters(st('?ts=6&q=keep&bdf=2026-01-01&page=2'))).toMatchObject({ q: 'keep', page: 1, filters: { ts: [] }, ranges: { bd: { from: null } } });
  });
});

describe('request bodies (contract v0.1)', () => {
  const now = at('2026-10-28T06:00:00Z');

  it('sends lists as ids or codes, AND across filters, with the period on Booking Date', () => {
    const b = filterBody(st('?all=1&q=Rao&os=1,9&st=ACCOMMODATION&sc=12&be=anita.rao&ssf=2026-10-01'), now);
    expect(b).toEqual({
      MineOnly: false, SearchText: 'Rao', OpsStatusIds: [1, 9], ServiceTypes: ['ACCOMMODATION'], ServiceCityIds: [12],
      BookingExecutives: ['anita.rao'], ServiceStartFrom: '2026-10-01', PeriodFrom: '2026-10-01', PeriodTo: '2026-10-31',
    });
  });

  it('a Booking Date range replaces the Period (AC22)', () => {
    const b = filterBody(st('?bdf=2026-09-01&bdt=2026-09-30'), now);
    expect(b).toMatchObject({ BookingDateFrom: '2026-09-01', BookingDateTo: '2026-09-30' });
    expect(b).not.toHaveProperty('PeriodFrom');
  });

  it('the ticket drill-down gets the scope, search and service-level filters only', () => {
    const b = serviceFilterBody(st('?q=x&ts=6&os=1&ou=E1&ss=6&tsf=2026-10-01&cf=2026-10-02'));
    expect(b).toEqual({ MineOnly: true, ApplyFilters: true, SearchText: 'x', OpsUsers: ['E1'], ServiceStatusIds: [6], ConfirmationFrom: '2026-10-02' });
  });
});

describe('limits mirrored for messages (H6)', () => {
  it.each([
    ['?q=' + 'a'.repeat(101), /at most 100 characters/],
    ['?os=' + Array.from({ length: 51 }, (_, i) => i + 1).join(','), /at most 50/],
    ['?os=abc', /not valid/],
    ['?be=a,b%40c', /can't search on/],
    ['?bdf=2026-10-02&bdt=2026-10-01', /From date is after/],
    ['?tsf=2025-01-01&tst=2026-01-02', /at most 366 days/],
    ['?period=custom&pf=2026-10-01', /both Custom dates/],
  ])('%s', (q, message) => {
    expect(validate(st(q))).toMatch(message);
  });

  it('366 days is allowed, 367 is not', () => {
    expect(validate(st('?tsf=2025-01-01&tst=2026-01-01'))).toBeNull();
    expect(validate(st('?tsf=2025-01-01&tst=2026-01-02'))).not.toBeNull();
  });
});

describe('filter lists (AC26)', () => {
  it('maps the API lists, keeps status order, sorts the rest, falls back per list', () => {
    const l = listsFrom({
      OpsStatus: [{ StatusID: 9, StatusName: 'In Progress' }, { StatusID: 1, StatusName: 'New' }],
      ServiceCity: [{ CityID: 2, CityName: 'Jaipur' }, { CityID: 1, CityName: 'agra' }, { CityID: 1, CityName: 'Agra dup' }],
      BookingBranch: [{ BranchCode: 'DEL001', BranchName: 'Delhi' }],
      OpsUser: [],
    });
    expect(l.os.options.map((o) => o.text)).toEqual(['In Progress', 'New']);
    expect(l.sc.options).toEqual([{ value: '1', text: 'agra' }, { value: '2', text: 'Jaipur' }]);
    expect(l.bb.options).toEqual([{ value: 'DEL001', text: 'Delhi (DEL001)' }]);
    expect(l.ou).toEqual({ options: [], fromApi: false });
    expect(l.ss.fromApi).toBe(false); // built-in supplier statuses
    expect(l.st.options).toHaveLength(5);
  });

  it('falls back to the built-in lists after a 10 s timeout and still resolves', async () => {
    setSession(user);
    // AbortSignal.timeout runs on the platform clock (fake timers can't move it): capture the requested time and fire it.
    const timer = new AbortController();
    const asked: number[] = [];
    vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms: number) => { asked.push(ms); return timer.signal; });
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('timeout', 'TimeoutError')));
    })));
    const p = loadFilterLists();
    expect(asked).toEqual([10_000]);
    timer.abort();
    const r = await p;
    expect(r.fallback).toBe(true);
    expect(r.lists).toEqual(builtInLists());
    vi.restoreAllMocks();
  });

  it('loads once per session from api/Reports/GetOperationsReportFilters', async () => {
    setSession(user);
    const fetchMock = vi.fn(async () => json({ success: true, data: { TicketStatus: [{ StatusID: 6, StatusName: 'Confirmed' }] } }));
    vi.stubGlobal('fetch', fetchMock);
    const a = await loadFilterLists();
    const b = await loadFilterLists();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/api/Reports/GetOperationsReportFilters');
    expect(JSON.parse(init.body as string)).toEqual({ tenantID: 1, userId: 'test.ops', userName: 'test.ops', securityKey: 'test-jwt' });
    expect(a.lists.ts.options).toEqual([{ value: '6', text: 'Confirmed' }]);
    expect(b.lists).toEqual(a.lists);
  });
});

describe('controls', () => {
  it('multi-select works from the keyboard and keeps focus while ticking', () => {
    function Host() {
      const [v, setV] = useState<string[]>([]);
      return <MultiSelect label="OPS Status" options={[{ value: '1', text: 'New' }, { value: '9', text: 'In Progress' }]} selected={v} onChange={setV} />;
    }
    render(<Host />);
    const button = screen.getByRole('button', { name: /OPS Status/ });
    expect(button.textContent).toContain('All');
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    const boxes = screen.getAllByRole('checkbox');
    expect(document.activeElement).toBe(boxes[0]);
    fireEvent.click(boxes[0]!);
    expect(document.activeElement).toBe(boxes[0]);
    fireEvent.keyDown(boxes[0]!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(boxes[1]);
    fireEvent.click(boxes[1]!);
    expect(button.textContent).toContain('2 selected');
    fireEvent.keyDown(boxes[1]!, { key: 'Escape' });
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(document.activeElement).toBe(button);
  });

  it('a list with no options is shown as unavailable', () => {
    render(<MultiSelect label="OPS User" options={[]} selected={[]} onChange={() => undefined} />);
    const b = screen.getByRole('button', { name: /OPS User/ }) as HTMLButtonElement;
    expect(b.disabled).toBe(true);
    expect(b.textContent).toContain('List unavailable');
  });

  it('search commits after a 400 ms pause or on Enter', () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    render(<SearchBox value="" placeholder="Search" onCommit={onCommit} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'GRP' } });
    act(() => { vi.advanceTimersByTime(399); });
    expect(onCommit).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onCommit).toHaveBeenLastCalledWith('GRP');
    fireEvent.change(input, { target: { value: 'GRP1 ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenLastCalledWith('GRP1');
  });
});

describe('page with filters', () => {
  let where = '';
  function Where() { where = useLocation().search; return null; }
  const page = (url: string) =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes><Route path="*" element={<><Ins01Page userName="Test Ops" /><Where /></>} /></Routes>
      </MemoryRouter>,
    );

  beforeEach(() => {
    setSession(user);
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('GetOperationsReportFilters')) return json({ success: true, data: { OpsStatus: [{ StatusID: 1, StatusName: 'New' }, { StatusID: 9, StatusName: 'In Progress' }] } });
      if (url.endsWith('GetTicketWiseKpi')) return json(envelope(kpi));
      return json(envelope({ Rows: [ticket(1)], Paging: paging(1) }));
    }));
  });

  it('shows the Cancelled card and the completion line (Phase 4)', async () => {
    page('/ticket-service-status');
    expect(await screen.findByText('GRP1001')).toBeTruthy();
    expect(screen.getByText('Cancelled')).toBeTruthy();
    expect(screen.getByText('33% · 2 pending')).toBeTruthy();
  });

  it('desktop: a ticked filter goes straight into the URL, page back to 1', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }));
    page('/ticket-service-status?tab=ticket&page=3');
    await screen.findByText('GRP1001');
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    fireEvent.click(await screen.findByRole('button', { name: /OPS Status/ }));
    await act(async () => fireEvent.click(await screen.findByRole('checkbox', { name: 'In Progress' })));
    expect(where).toBe('?tab=ticket&os=9');
    expect(screen.getByRole('button', { name: 'Filters, 1 set' })).toBeTruthy();
  });

  it('tablet/phone sheet: changes wait for Done', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: true, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }));
    page('/ticket-service-status?tab=ticket');
    await screen.findByText('GRP1001');
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    fireEvent.click(await screen.findByRole('button', { name: /OPS Status/ }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'New' }));
    expect(where).toBe('?tab=ticket');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Done' })));
    expect(where).toBe('?tab=ticket&os=1');
  });

  it('a broken limit is explained instead of calling the API', async () => {
    page('/ticket-service-status?bdf=2026-10-02&bdt=2026-10-01');
    expect(await screen.findByText('Booking Date: the From date is after the To date.')).toBeTruthy();
  });

  it('opening the page without a query brings back the last view of this session (AC25)', async () => {
    sessionStorage.setItem('ins01.lastQuery', '?tab=vendor&all=1');
    page('/ticket-service-status');
    await act(async () => { await Promise.resolve(); });
    expect(where).toBe('?tab=vendor&all=1');
  });
});
