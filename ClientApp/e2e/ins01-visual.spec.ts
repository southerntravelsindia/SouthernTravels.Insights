import { expect, test } from '@playwright/test';

// D8 widths (TSD §2.1). Each width: no page-level horizontal scroll, no CSP violation, and a full-page screenshot that
// must match the Razor baseline recorded with INS01_PAGE=razor (only the §2.1 deltas may differ, from Phase 4 on).
const WIDTHS = [360, 430, 768, 820, 1024, 1149, 1150, 1280, 1366, 1920, 2560];
const VIEWS = [
  { name: 'ticket', query: '?tab=ticket&all=1' },
  { name: 'vendor', query: '?tab=vendor&all=1' },
];

for (const view of VIEWS) {
  for (const width of WIDTHS) {
    test(`INS-01 ${view.name} at ${width}px`, async ({ page }) => {
      const csp: string[] = [];
      page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) csp.push(m.text()); });
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/Operations/TicketServiceStatus${view.query}`);
      await expect(page).not.toHaveURL(/Account\/Login/);
      await expect(page.locator('.results table').first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'page-level horizontal scroll').toBeLessThanOrEqual(0);
      expect(csp).toEqual([]);

      // main is the scroll container (SCROLL_BEHAVIOUR.md), so capture it at its full height.
      const main = page.locator('main#main');
      const full = await main.evaluate((el) => el.scrollHeight);
      await page.setViewportSize({ width, height: Math.min(full + 48, 12000) });
      await expect(page).toHaveScreenshot(`${view.name}-${width}.png`, { fullPage: true });
    });
  }
}

test('401 from the BFF sends the user to login', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: undefined });
  const page = await ctx.newPage();
  const res = await page.request.get('/api/ins01/kpi');
  expect(res.status()).toBe(401);
  await page.goto('/Operations/TicketServiceStatus');
  await expect(page).toHaveURL(/Account\/Login\?returnUrl=/);
  await ctx.close();
});
