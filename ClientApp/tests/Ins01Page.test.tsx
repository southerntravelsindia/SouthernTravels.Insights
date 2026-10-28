import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { correlationId } from '../src/lib/api';
import { Ins01Page } from '../src/reports/ins01/Ins01Page';
import { kpi, service, ticket, ticketPage } from './fixtures';

type Handler = (url: string, init: RequestInit) => Response;
let handler: Handler;
const calls: { url: string; init: RequestInit }[] = [];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  calls.length = 0;
  document.body.innerHTML = '<meta name="ins01-xsrf" content="xsrf-test"><div id="ins01-root" data-user="Test Ops" data-api="/api/ins01/" data-login="/Account/Login"></div>';
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return handler(url, init);
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ok: Handler = (url) => {
  if (url.startsWith('/api/ins01/kpi')) return json(kpi);
  if (url.startsWith('/api/ins01/tickets')) return json(ticketPage([ticket(1), ticket(2, { balancePending: 0, paidAmount: 100000, percentPaid: 100 })]));
  if (url.startsWith('/api/ins01/ticket-services')) return json({ services: [service(1, 0), service(1, 1)] });
  return json({ message: 'not found' }, 404);
};

const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><Ins01Page /></MemoryRouter>);

describe('Ins01Page', () => {
  it('renders the KPI cards, rows, legend and pager from the BFF', async () => {
    handler = ok;
    renderAt('/Operations/TicketServiceStatus');
    expect(await screen.findByText('GRP1001')).toBeTruthy();
    expect(screen.getByText('4.5 days')).toBeTruthy();
    expect(screen.getByText('2 tickets')).toBeTruthy();
    expect(screen.getByText('Showing 1–2 of 2')).toBeTruthy();
    expect(screen.getByText(/Files assigned to you \(Test Ops\)/)).toBeTruthy();
    expect(screen.getByText('Bal. Pending · 60%')).toBeTruthy();
    expect(screen.getByText('Fully Paid · 100%')).toBeTruthy();
    expect(document.querySelector('tr.row.mine')).not.toBeNull();
  });

  it('sends only the URL state, with the correlation id, never a user', async () => {
    handler = ok;
    renderAt('/Operations/TicketServiceStatus?tab=ticket&page=2&all=1');
    await screen.findByText('GRP1001');
    const list = calls.find((c) => c.url.startsWith('/api/ins01/tickets'))!;
    expect(list.url).toBe('/api/ins01/tickets?all=1&page=2');
    const h = list.init.headers as Record<string, string>;
    expect(h['X-Correlation-ID']).toBe(correlationId);
    expect(h['X-Requested-With']).toBe('XMLHttpRequest');
    expect(JSON.stringify(calls)).not.toMatch(/user/i);
  });

  it('loads services on first expand with the antiforgery header', async () => {
    handler = ok;
    renderAt('/Operations/TicketServiceStatus');
    await screen.findByText('GRP1001');
    const toggle = screen.getAllByRole('button', { name: 'Show services' })[0]!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await act(async () => fireEvent.click(toggle));
    expect(await screen.findByText('Test Hotel 1')).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Pending')).toBeTruthy(); // unconfirmed service
    const post = calls.find((c) => c.url.endsWith('ticket-services'))!;
    expect(post.init.method).toBe('POST');
    expect((post.init.headers as Record<string, string>)['X-XSRF-TOKEN']).toBe('xsrf-test');
    expect(JSON.parse(post.init.body as string)).toEqual({ ticketRowKeys: [1], all: false });
  });

  it('Expand All fetches every row of the page in one call', async () => {
    handler = ok;
    renderAt('/Operations/TicketServiceStatus');
    await screen.findByText('GRP1001');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Expand All' })));
    const posts = calls.filter((c) => c.url.endsWith('ticket-services'));
    expect(posts).toHaveLength(1);
    expect(JSON.parse(posts[0]!.init.body as string).ticketRowKeys).toEqual([1, 2]);
  });

  it('shows the error panel with the trace id when the list fails, and the list when KPIs fail', async () => {
    handler = (url) => (url.includes('tickets') ? json({ message: 'boom', traceId: 'trace-123' }, 500) : json({}, 500));
    renderAt('/Operations/TicketServiceStatus');
    expect(await screen.findByText('Reference: trace-123')).toBeTruthy();
    expect(screen.getByText('The report could not be loaded.')).toBeTruthy();
    expect(await screen.findByText(/Figures unavailable/)).toBeTruthy();
  });

  it('sends the user to login on 401', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, pathname: '/Operations/TicketServiceStatus', search: '?tab=vendor', assign });
    handler = () => json({ message: 'Session expired', traceId: 't' }, 401);
    renderAt('/Operations/TicketServiceStatus?tab=vendor');
    await waitFor(() => expect(assign).toHaveBeenCalled());
    expect(assign.mock.calls[0]![0]).toBe('/Account/Login?returnUrl=%2FOperations%2FTicketServiceStatus%3Ftab%3Dvendor');
  });
});
