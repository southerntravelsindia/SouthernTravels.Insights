import { describe, expect, it } from 'vitest';
import * as f from '../src/lib/format';

describe('format', () => {
  it('formats rupees with Indian grouping, rounding half up', () => {
    expect(f.inr(0)).toBe('₹0');
    expect(f.inr(999)).toBe('₹999');
    expect(f.inr(1000)).toBe('₹1,000');
    expect(f.inr(148500)).toBe('₹1,48,500');
    expect(f.inr(12345678)).toBe('₹1,23,45,678');
    expect(f.inr(99.5)).toBe('₹100');
    expect(f.inr(-2500)).toBe('₹-2,500');
  });

  it('formats dates without time-zone shifts', () => {
    expect(f.date('2026-10-05')).toBe('05 Oct 2026');
    expect(f.date('2026-12-31T00:00:00')).toBe('31 Dec 2026');
    expect(f.short('2026-10-05')).toBe('05/10/26');
    expect(f.date(null)).toBe('');
    expect(f.short(undefined)).toBe('');
  });

  it('shows a dash for a percentage of a zero total', () => {
    expect(f.pctOf(60000, 100000)).toBe('60%');
    expect(f.pctOf(1, 3)).toBe('33%');
    expect(f.pctOf(1, 0)).toBe(f.DASH);
    expect(f.pct(40, 100000)).toBe('40%');
    expect(f.pct(0, 0)).toBe(f.DASH);
    expect(f.profitPct(12.5)).toBe('12.5%');
    expect(f.profitPct(null)).toBe(f.DASH);
  });

  it.each([
    [-1, 'Departed', 'past'],
    [0, 'Departs today', 'soon'],
    [1, '1 day left', 'soon'],
    [7, '7 days left', 'soon'],
    [8, '8 days left', 'later'],
  ] as const)('Days Left %i → "%s" (%s)', (days, text, tone) => {
    expect(f.daysLeftText(days)).toBe(text);
    expect(f.daysLeftTone(days)).toBe(tone);
  });

  it('prints API lists and TAT', () => {
    expect(f.list('DEL001,HYD001', ' / ')).toBe('DEL001 / HYD001');
    expect(f.list('Agra, Delhi,,')).toBe('Agra, Delhi');
    expect(f.tatDays(4.25)).toBe('4.3 days');
    expect(f.tatDays(null)).toBe('-');
  });

  it('maps statuses and service types to the Razor tones', () => {
    expect(f.tone('Confirmed')).toBe('tone-ok');
    expect(f.tone('Cancelled')).toBe('tone-danger');
    expect(f.tone('In Progress')).toBe('tone-info');
    expect(f.tone('Completed')).toBe('tone-done');
    expect(f.tone('New')).toBe('tone-neutral');
    expect(f.typeTone('En-Route Meals')).toBe('ty-mea');
    expect(f.typeTone('Other')).toBe('ty-oth');
  });

  it('prints the pager label', () => {
    expect(f.showing(11, 20, 45)).toBe('Showing 11–20 of 45');
    expect(f.showing(0, 0, 0)).toBe('No results');
  });
});
