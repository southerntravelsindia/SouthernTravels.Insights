import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Standalone INS-01 app: a static site that calls STPLCostSheetAPI directly (no .NET host).
// Settings come from .env files (git-ignored; see .env.example):
//   VITE_API_BASE_URL      STPLCostSheetAPI base the browser calls, ending in "/" (read at build time, src/app/config.ts)
//   VITE_BASE_PATH         path the site is served under, default "/"
//   STPL_API_PROXY_TARGET  dev server only: where /stpl-api/ is forwarded, so local development needs no CORS
export default defineConfig(({ mode }) => {
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
      proxy: env.STPL_API_PROXY_TARGET
        ? { '/stpl-api': { target: env.STPL_API_PROXY_TARGET, changeOrigin: true, rewrite: (p) => p.replace(/^\/stpl-api/, '') } }
        : undefined,
    },
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.{ts,tsx}'],
      css: false,
      env: { VITE_API_BASE_URL: 'https://api.test/' },
    },
  };
});
