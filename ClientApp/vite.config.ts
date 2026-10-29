import crypto from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import tls from 'node:tls';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Standalone INS-01 app: a static site that calls STPLCostSheetAPI directly (no .NET host).
// Settings come from .env files (git-ignored; see .env.example):
//   VITE_API_BASE_URL      STPLCostSheetAPI root the browser calls, ending in "/" (routes are api/...; src/app/config.ts)
//   VITE_BASE_PATH         path the site is served under, default "/"
//   STPL_API_PROXY_TARGET  dev server only: where /stpl-api/ is forwarded, so local development needs no CORS
//   STPL_API_CA_FILE       dev server only: certificate file to trust for an API with a self-signed certificate
/**
 * Dev proxy for /stpl-api/ → STPL_API_PROXY_TARGET. Without a usable target the dev server would answer /stpl-api/
 * itself (index.html or 404), which looks like an API problem; say so at start-up instead. The value is never printed.
 */
function apiProxy(env: Record<string, string>, command: string) {
  const target = (env.STPL_API_PROXY_TARGET ?? '').trim();
  const wantsProxy = (env.VITE_API_BASE_URL ?? '').trim().startsWith('/stpl-api/');
  const usable = /^https?:\/\/[^/\s]+/i.test(target) && !/\/api\/?$/i.test(target);
  if (command === 'serve' && wantsProxy && !usable) {
    console.warn(
      !target
        ? '\n[ins01] STPL_API_PROXY_TARGET is not set: /stpl-api/ calls will not reach STPLCostSheetAPI.\n'
        : /\/api\/?$/i.test(target)
          ? '\n[ins01] STPL_API_PROXY_TARGET ends in /api: give the API root (without /api), the routes add it.\n'
          : '\n[ins01] STPL_API_PROXY_TARGET must start with http:// or https://; /stpl-api/ calls will not reach the API.\n',
    );
  }
  return usable
    ? { '/stpl-api': { target, changeOrigin: true, secure: true, agent: apiAgent(env), rewrite: (p: string) => p.replace(/^\/stpl-api/, '') } }
    : undefined;
}

/**
 * STPL_API_CA_FILE (dev only): a certificate file (.pem, or a .cer in Base-64 or DER) the dev proxy trusts on top of the
 * normal roots, for an API with a self-signed certificate. Certificate checking stays on; nothing is ever skipped.
 */
function apiAgent(env: Record<string, string>): https.Agent | undefined {
  const file = (env.STPL_API_CA_FILE ?? '').trim();
  if (!file || file === '__SET_ON_SERVER__') return undefined;
  if (!fs.existsSync(file)) {
    const dir = path.dirname(path.resolve(file));
    const others = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => /\.(cer|crt|pem|der)$/i.test(n)).length : 0;
    console.warn(`\n[ins01] STPL_API_CA_FILE does not point to a file; the API certificate will not be trusted.${others ? ' Its folder has other certificate files: check the extension (.cer / .crt / .pem).' : ''}\n`);
    return undefined;
  }
  const raw = fs.readFileSync(file);
  const text = raw.toString('utf8');
  const pem = text.includes('-----BEGIN CERTIFICATE-----')
    ? text
    : `-----BEGIN CERTIFICATE-----\n${raw.toString('base64').replace(/.{64}/g, '$&\n')}\n-----END CERTIFICATE-----\n`;
  try {
    new crypto.X509Certificate(pem);
  } catch {
    console.warn('\n[ins01] STPL_API_CA_FILE is not a certificate (.pem, or a .cer/.crt in Base-64 or DER); it is ignored.\n');
    return undefined;
  }
  return new https.Agent({ ca: [...tls.rootCertificates, pem], keepAlive: true });
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || '/',
    // site.css is imported unchanged and has one invalid rule (site.css:709 "@@media", Balance Pending report) that
    // browsers skip; let the minifier skip it the same way rather than editing a stylesheet the other reports use.
    css: { lightningcss: { errorRecovery: true } },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2022',
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: apiProxy(env, command),
    },
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.{ts,tsx}'],
      css: false,
      env: { VITE_API_BASE_URL: 'https://api.test/' },
    },
  };
});
