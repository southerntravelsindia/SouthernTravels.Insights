// The app's only settings, read once from the build environment (.env files, see .env.example) and checked here,
// so a missing value stops the app with a clear message instead of failing on the first call.

export interface AppConfig {
  /** STPLCostSheetAPI root, ending in "/": the address every route ("api/...") follows. Absolute, or a same-origin path such as /stpl-api/ behind a proxy. */
  apiBaseUrl: string;
  /** Optional root of the Insights site that hosts the other 14 reports, ending in "/"; null hides those links. */
  insightsUrl: string | null;
}

export class ConfigError extends Error {}

export function loadConfig(env: Record<string, string | undefined> = import.meta.env): AppConfig {
  const api = (env.VITE_API_BASE_URL ?? '').trim();
  if (!api || api === '__SET_ON_SERVER__') throw new ConfigError('VITE_API_BASE_URL is not set for this build.');
  if (!api.endsWith('/')) throw new ConfigError('VITE_API_BASE_URL must end with "/".');
  if (!/^(https?:\/\/[^/]+\/|\/)/.test(api)) throw new ConfigError('VITE_API_BASE_URL must be an http(s) URL or a path starting with "/".');

  // Optional: without it the side menu shows the other reports disabled instead of linking to a wrong address.
  let insights: string | null = (env.VITE_INSIGHTS_URL ?? '').trim() || null;
  if (insights === '__SET_ON_SERVER__') insights = null;
  if (insights && !/^https?:\/\/[^/\s]+(\/[^\s]*)?$/.test(insights)) throw new ConfigError('VITE_INSIGHTS_URL must be an http(s) URL.');
  if (insights && !insights.endsWith('/')) insights += '/';
  return { apiBaseUrl: api, insightsUrl: insights };
}

let cached: AppConfig | null = null;

export function config(): AppConfig {
  return (cached ??= loadConfig());
}
