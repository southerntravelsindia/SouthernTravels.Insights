import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../src/app/AppShell';
import { loadConfig } from '../src/app/config';
import { NAV, insightsHref } from '../src/app/nav';
import { getSession, setSession } from '../src/lib/auth';
import { user } from './fixtures';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

const shell = () => render(<AppShell user={user}><p>report</p></AppShell>);

describe('side menu', () => {
  it('lists the 15 reports in the original order, this report current, the rest disabled without VITE_INSIGHTS_URL', () => {
    shell();
    const nav = screen.getByRole('navigation', { name: 'Reports' });
    const items = nav.querySelectorAll('.nav');
    expect([...items].map((i) => i.textContent)).toEqual(NAV.map((n) => n.label));
    const current = within(nav).getByRole('link', { name: 'Ticket & Service Status' });
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(current.classList.contains('active')).toBe(true);
    expect(within(nav).getAllByRole('link')).toHaveLength(1);
    expect(nav.querySelectorAll('[aria-disabled="true"]')).toHaveLength(14);
  });

  it('links the other reports to the Insights site when it is configured', () => {
    expect(insightsHref(NAV[1]!, 'https://insights.example/')).toBe('https://insights.example/Operations/OpsUserWorkload?pick=1');
    expect(insightsHref(NAV[1]!, null)).toBeNull();
    expect(loadConfig({ VITE_API_BASE_URL: '/stpl-api/', VITE_INSIGHTS_URL: 'https://insights.example' }).insightsUrl).toBe('https://insights.example/');
    expect(loadConfig({ VITE_API_BASE_URL: '/stpl-api/' }).insightsUrl).toBeNull();
    expect(() => loadConfig({ VITE_API_BASE_URL: '/stpl-api/', VITE_INSIGHTS_URL: 'javascript:alert(1)' })).toThrow(/http/);
  });

  it('the menu toggles drive #navtoggle for site.css, with aria-expanded; Escape and the scrim close it', () => {
    shell();
    const box = document.getElementById('navtoggle') as HTMLInputElement;
    const hamburger = screen.getByRole('button', { name: 'Open menu' });
    expect(box.checked).toBe(false);
    fireEvent.click(hamburger);
    expect(box.checked).toBe(true);
    expect(hamburger.getAttribute('aria-expanded')).toBe('true');
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(box.checked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse or expand menu' }));
    expect(box.checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(box.checked).toBe(false);
  });

  it('shows the signed-in user in the menu foot and logs out from there', () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    setSession(user);
    shell();
    const foot = document.querySelector('.nav-user') as HTMLElement;
    expect(within(foot).getByText('Test Ops')).toBeTruthy();
    expect(within(foot).getByText('User · DEL001')).toBeTruthy();
    expect(foot.querySelector('.avatar')?.textContent).toBe('TO');
    fireEvent.click(within(foot).getByRole('button', { name: 'Log out' }));
    expect(getSession()).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login');
  });
});
