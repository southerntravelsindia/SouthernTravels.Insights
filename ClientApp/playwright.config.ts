import { defineConfig } from '@playwright/test';

// INS-01 visual and smoke checks (TSD §13) on the installed Microsoft Edge (no browser download).
//   INS01_PAGE      "razor": the Insights Razor page (baseline) or "react": this standalone app. Record the baseline once
//                   with INS01_PAGE=razor and --update-snapshots, then run INS01_PAGE=react to compare.
//   INS01_BASE_URL  site root of the page under test (Razor: the Insights site; react: this app, e.g. npm run preview)
//   Razor needs a signed-in cookie: e2e/.auth.json (npx playwright codegen --save-storage=e2e/.auth.json <site>).
//   React needs a session: e2e/.session.json, the value of sessionStorage "ins01.session" after signing in on the
//   React app (DevTools → Application). Both files are git-ignored and hold a live token: delete them after the run.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const razor = env.INS01_PAGE === 'razor';

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  snapshotPathTemplate: '{testDir}/__baseline__/{arg}{ext}',
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  use: {
    baseURL: env.INS01_BASE_URL ?? (razor ? 'http://localhost:5080' : 'http://localhost:4173'),
    storageState: razor ? 'e2e/.auth.json' : undefined,
    channel: 'msedge',
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
  },
});
