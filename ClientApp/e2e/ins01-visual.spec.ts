import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// D8 widths (TSD §2.1). Each width: no page-level horizontal scroll, no CSP violation, and a screenshot of the report
// area (<main>) that must match the Razor baseline. The page frame differs on purpose (the standalone app has no side
// menu), so only <main> is compared.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const razor = env.INS01_PAGE === 'razor';
const PATH = razor ? '/Operations/TicketServiceStatus' : '/ticket-service-status';
const WIDTHS = [360, 430, 768, 820, 1024, 1149, 1150, 1280, 1366, 1920, 2560];
const VIEWS = [
  { name: 'ticket', query: '?tab=ticket&all=1' },
  { name: 'vendor', query: '?tab=vendor&all=1' },
];

test.beforeEach(async ({ page }) => {
  if (razor) return;
  const session = readFileSync('e2e/.session.json', 'utf8');
  await page.addInitScript((s) => sessionStorage.setItem('ins01.session', s), session);
});

for (const view of VIEWS) {
  for (const width of WIDTHS) {
    test(`INS-01 ${view.name} at ${width}px`, async ({ page }) => {
      const csp: string[] = [];
      page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) csp.push(m.text()); });
      await page.setViewportSize({ width, height: 900 });
      await page.goto(PATH + view.query);
      await expect(page).not.toHaveURL(/login/i);
      await expect(page.locator('main table').first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'page-level horizontal scroll').toBeLessThanOrEqual(0);
      expect(csp).toEqual([]);

      const main = page.locator('main#main');
      const full = await main.evaluate((el) => el.scrollHeight);
      await page.setViewportSize({ width, height: Math.min(full + 48, 12000) });
      await expect(main).toHaveScreenshot(`${view.name}-${width}.png`);
    });
  }
}

test('without a session the report opens the login page', async ({ browser }) => {
  test.skip(razor, 'React app only');
  const page = await (await browser.newContext()).newPage();
  await page.goto(PATH);
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  await expect(page.getByRole('button', { name: 'Send OTP' })).toBeVisible();
});
