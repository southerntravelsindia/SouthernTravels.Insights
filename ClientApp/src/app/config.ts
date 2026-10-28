// The app's only settings, read once from the build environment (.env files, see .env.example) and checked here,
// so a missing value stops the app with a clear message instead of failing on the first call.

export interface AppConfig {
  /** STPLCostSheetAPI root, ending in "/": the address every route ("api/...") follows. Absolute, or a same-origin path such as /stpl-api/ behind a proxy. */
  apiBaseUrl: string;
}

export class ConfigError extends Error {}

export function loadConfig(env: Record<string, string | undefined> = import.meta.env): AppConfig {
  const api = (env.VITE_API_BASE_URL ?? '').trim();
  if (!api || api === '__SET_ON_SERVER__') throw new ConfigError('VITE_API_BASE_URL is not set for this build.');
  if (!api.endsWith('/')) throw new ConfigError('VITE_API_BASE_URL must end with "/".');
  if (!/^(https?:\/\/[^/]+\/|\/)/.test(api)) throw new ConfigError('VITE_API_BASE_URL must be an http(s) URL or a path starting with "/".');
  return { apiBaseUrl: api };
}

let cached: AppConfig | null = null;

export function config(): AppConfig {
  return (cached ??= loadConfig());
}
