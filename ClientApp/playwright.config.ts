import { defineConfig } from '@playwright/test';

// INS-01 end-to-end and visual checks (TSD §13). They run against a signed-in local or UAT site:
//   INS01_BASE_URL   site root, default http://localhost:5080
//   INS01_STORAGE    a saved signed-in session (npx playwright codegen --save-storage=e2e/.auth.json <site>), git-ignored
//   INS01_PAGE       "razor" or "react": which page the site serves (FeatureFlags:INS01_React). Run "razor" once with
//                    --update-snapshots to record the baseline, then "react" to compare against it.
// Uses the installed Microsoft Edge, so no browser download is needed.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  snapshotPathTemplate: '{testDir}/__baseline__/{arg}{ext}',
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  use: {
    baseURL: env.INS01_BASE_URL ?? 'http://localhost:5080',
    storageState: env.INS01_STORAGE ?? 'e2e/.auth.json',
    channel: 'msedge',
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
  },
});
