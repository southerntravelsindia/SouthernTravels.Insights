import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { correlationId } from '../src/lib/api';
import { setSession } from '../src/lib/auth';
import { Ins01Page } from '../src/reports/ins01/Ins01Page';
import { envelope, kpi, paging, service, ticket, user, vendor } from './fixtures';

type Handler = (route: string, body: Record<string, unknown>) => Response;
let handler: Handler;
const calls: { url: string; body: Record<string, unknown>; init: RequestInit }[] = [];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  calls.length = 0;
  sessionStorage.clear();
  setSession(user);
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    calls.push({ url, body, init });
    return handler(url.replace('https://api.test/api/TicketServiceStatus/', ''), body);
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ok: Handler = (route, body) => {
  if (route === 'GetTicketWiseKpi') return json(envelope(kpi));
  if (route === 'GetTicketWiseList') return json(envelope({ Rows: [ticket(1), ticket(2, { BalancePending: 0, PaidAmount: 100000, PercentPaid: 100 })], Paging: paging(2) }));
  if (route === 'GetVendorWiseList') return json(envelope({ Rows: [vendor(101)], Paging: paging(1) }));
  if (route === 'GetTicketWiseServices') return json(envelope({ Services: (body.TicketRowKeys as number[]).flatMap((k) => [service(k, 0), service(k, 1)]) }));
  return json({ message: 'not found' }, 404);
};

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="*" element={<Ins01Page userName="Test Ops" />} /></Routes>
    </MemoryRouter>,
  );

describe('Ins01Page (STPLCostSheetAPI direct)', () => {
  it('renders KPI cards, rows, legend and pager from the API replies', async () => {
    handler = ok;
    renderAt('/ticket-service-status');
    expect(await screen.findByText('GRP1001')).toBeTruthy();
    expect(screen.getByText('4.5 days')).toBeTruthy();
    expect(screen.getByText('2 tickets')).toBeTruthy();
    expect(screen.getByText('Showing 1–2 of 2')).toBeTruthy();
    expect(screen.getByText(/Files assigned to you \(Test Ops\)/)).toBeTruthy();
    expect(screen.getByText('Bal. Pending · 60%')).toBeTruthy();
    expect(screen.getByText('Fully Paid · 100%')).toBeTruthy();
    expect(screen.getAllByText('Booked: 02 Sep 2026')).toHaveLength(2); // date with a time part
    expect(document.querySelector('tr.row.mine')).not.toBeNull();
  });

  it('reads the camelCase replies the API actually sends (ASP.NET Core default), not only the contract PascalCase', async () => {
    // System.Text.Json camelCase: lower-case the leading capitals, keeping the last one before a lower-case letter.
    const camelName = (k: string) => k.replace(/^[A-Z]+(?=[A-Z][a-z]|$)|^[A-Z]/, (m) => m.toLowerCase());
    const camel = (v: unknown): unknown =>
      Array.isArray(v) ? v.map(camel)
        : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [camelName(k), camel(x)]))
          : v;
    expect(camelName('MBKNo')).toBe('mbkNo');
    expect(camelName('TicketRowKey')).toBe('ticketRowKey');
    handler = (route, body) => {
      const r = ok(route, body);
      return route.startsWith('GetTicketWise') ? json(camel(JSON.parse(JSON.stringify(envelope(
        route === 'GetTicketWiseKpi' ? kpi : { Rows: [ticket(1)], Paging: paging(1) }))))) : r;
    };
    renderAt('/ticket-service-status');
    expect(await screen.findByText('GRP1001')).toBeTruthy();
    expect(screen.getByText('MBK-TEST-1')).toBeTruthy();
    expect(screen.getByText('4.5 days')).toBeTruthy();
    expect(screen.getByText('Showing 1–1 of 1')).toBeTruthy();
  });

  it('sends the contract body: token and user name from the session, scope and page from the URL', async () => {
    handler = ok;
    renderAt('/ticket-service-status?tab=ticket&page=2&all=1');
    await screen.findByText('GRP1001');
    const list = calls.find((c) => c.url.endsWith('GetTicketWiseList'))!;
    expect(list.url).toBe('https://api.test/api/TicketServiceStatus/GetTicketWiseList');
    expect(list.body).toMatchObject({ MineOnly: false, PageNumber: 2, PageSize: 10, securityKey: 'test-jwt', UserName: 'test.ops' });
    expect(Object.keys(list.body).sort()).toEqual(['MineOnly', 'PageNumber', 'PageSize', 'PeriodFrom', 'PeriodTo', 'UserName', 'securityKey']);
    expect(list.init.method).toBe('POST');
    expect(list.init.credentials).toBe('omit');
    expect((list.init.headers as Record<string, string>)['X-Correlation-ID']).toBe(correlationId);
    expect(calls.find((c) => c.url.endsWith('GetTicketWiseKpi'))!.body).toMatchObject({ MineOnly: false });
  });

  it('loads services on first expand, Expand All in one call', async () => {
    handler = ok;
    renderAt('/ticket-service-status');
    await screen.findByText('GRP1001');
    const toggle = screen.getAllByRole('button', { name: 'Show services' })[0]!;
    await act(async () => fireEvent.click(toggle));
    expect(await screen.findByText('Test Hotel 1')).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(calls.find((c) => c.url.endsWith('GetTicketWiseServices'))!.body).toMatchObject({ TicketRowKeys: [1], MineOnly: true });

    calls.length = 0;
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Expand All' })));
    const posts = calls.filter((c) => c.url.endsWith('GetTicketWiseServices'));
    expect(posts).toHaveLength(1);
    expect(posts[0]!.body.TicketRowKeys).toEqual([2]); // row 1 is cached already
  });

  it('switching tabs never draws the previous tab\'s rows in the new table', async () => {
    handler = ok;
    renderAt('/ticket-service-status');
    await screen.findByText('GRP1001');
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'Vendor-Wise View' })));
    expect(document.body.textContent).not.toContain('NaN');
    expect(await screen.findByText('Test Vendor 101')).toBeTruthy();
    expect(document.body.textContent).not.toContain('NaN');
    expect(screen.queryByText('GRP1001')).toBeNull();
  });

  it('shows the error panel with the API trace id, and the list when only KPIs fail', async () => {
    handler = (route) => (route === 'GetTicketWiseList' ? json({ message: 'Database error occurred', traceId: 'trace-123' }, 500) : json({ message: 'x', traceId: 't' }, 500));
    renderAt('/ticket-service-status');
    expect(await screen.findByText('Reference: trace-123')).toBeTruthy();
    expect(screen.getByText('The report could not be loaded.')).toBeTruthy();
    expect(await screen.findByText(/Figures unavailable/)).toBeTruthy();
  });

  it('on 401 forgets the token and opens login with the way back', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, pathname: '/ticket-service-status', search: '?tab=vendor', assign });
    handler = () => json({ message: 'Invalid token', traceId: 't' }, 401);
    renderAt('/ticket-service-status?tab=vendor');
    await waitFor(() => expect(assign).toHaveBeenCalled());
    expect(assign.mock.calls[0]![0]).toBe('/login?returnTo=%2Fticket-service-status%3Ftab%3Dvendor&expired=1');
    expect(sessionStorage.length).toBe(0);
  });
});
