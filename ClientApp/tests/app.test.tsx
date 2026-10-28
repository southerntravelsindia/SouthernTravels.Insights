import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../src/auth/LoginPage';
import { loadConfig } from '../src/app/config';
import { getSession, safeReturnTo } from '../src/lib/auth';
import { fetchTicketServices, mapTicket } from '../src/reports/ins01/data';
import { envelope, ticket, user } from './fixtures';
import { setSession } from '../src/lib/auth';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('config', () => {
  it('needs an API base ending in "/"', () => {
    expect(loadConfig({ VITE_API_BASE_URL: 'https://api.example/' }).apiBaseUrl).toBe('https://api.example/');
    expect(loadConfig({ VITE_API_BASE_URL: '/stpl-api/' }).apiBaseUrl).toBe('/stpl-api/');
    expect(() => loadConfig({})).toThrow(/not set/);
    expect(() => loadConfig({ VITE_API_BASE_URL: '__SET_ON_SERVER__' })).toThrow(/not set/);
    expect(() => loadConfig({ VITE_API_BASE_URL: 'https://api.example' })).toThrow(/end with/);
    expect(() => loadConfig({ VITE_API_BASE_URL: 'javascript:alert(1)/' })).toThrow();
  });
});

describe('auth', () => {
  it('only returns to paths inside the app', () => {
    expect(safeReturnTo('/ticket-service-status?tab=vendor')).toBe('/ticket-service-status?tab=vendor');
    expect(safeReturnTo('https://evil.example/')).toBe('/');
    expect(safeReturnTo('//evil.example/')).toBe('/');
    expect(safeReturnTo('/\\evil.example')).toBe('/');
    expect(safeReturnTo(null)).toBe('/');
  });
});

describe('data', () => {
  it('maps the contract TicketRow unchanged', () => {
    const t = mapTicket(ticket(7, { DaysLeft: -1, CompletionPct: null }));
    expect(t).toMatchObject({ ticketRowKey: 7, mbkNo: 'MBK-TEST-7', daysLeft: -1, completionPct: null, totalAmount: 100000, isMine: false });
  });

  it('splits a drill-down batch above 100 keys into contract-sized calls', async () => {
    setSession(user);
    const sizes: number[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      const keys = JSON.parse(init.body as string).TicketRowKeys as number[];
      sizes.push(keys.length);
      return json(envelope({ Services: keys.map((k) => ({ ServiceRowId: k, TicketRowKey: k })) }));
    }));
    const keys = Array.from({ length: 230 }, (_, i) => i + 1);
    const byKey = await fetchTicketServices(keys, false, new AbortController().signal);
    expect(sizes).toEqual([100, 100, 30]);
    expect(byKey.size).toBe(230);
  });
});

describe('LoginPage', () => {
  it('sends the OTP, verifies it and keeps the token in sessionStorage only', async () => {
    const replace = vi.fn();
    vi.stubGlobal('location', { ...window.location, replace });
    const bodies: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      bodies.push(JSON.parse(init.body as string));
      return url.endsWith('Account/SendOTP')
        ? json({ success: true, message: 'OTP sent.' })
        : json({ Success: true, objOTPLogin: { UserName: 'test.ops', Name: 'Test Ops', OpsBranch: 'DEL001', IsAdmin: false, accessToken: 'jwt-1' } });
    }));

    render(<MemoryRouter initialEntries={['/login?returnTo=%2Fticket-service-status%3Ftab%3Dvendor']}><LoginPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: 'test@example.com' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send OTP' })));
    expect(await screen.findByText('OTP sent.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/^OTP/), { target: { value: '123456' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Verify/ })));

    expect(bodies).toEqual([{ EmailId: 'test@example.com' }, { EmailId: 'test@example.com', OTPCode: '123456' }]);
    expect(getSession()).toMatchObject({ token: 'jwt-1', userName: 'test.ops', name: 'Test Ops' });
    expect(localStorage.length).toBe(0);
    expect(replace).toHaveBeenCalledWith('/ticket-service-status?tab=vendor');
  });

  it('rejects an OTP that is not 6 digits without calling the API', async () => {
    const fetchMock = vi.fn(async () => json({ success: true }));
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter initialEntries={['/login']}><LoginPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: 'test@example.com' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send OTP' })));
    fireEvent.change(screen.getByLabelText(/^OTP/), { target: { value: '12ab' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Verify/ })));
    expect(screen.getByText('Please enter the 6-digit OTP sent to your email.')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
