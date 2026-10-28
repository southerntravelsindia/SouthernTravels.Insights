import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The ASP.NET Core BFF from `dotnet run` (Properties/launchSettings.json).
const bff = 'http://localhost:5080';

export default defineConfig({
  plugins: [react()],
  // Relative URLs, so the bundle also works when the site runs under an IIS virtual directory.
  base: './',
  build: {
    outDir: '../wwwroot/app',
    emptyOutDir: true,
    target: 'es2022',
    rolldownOptions: {
      // Fixed entry names (ins01.js / ins01.css): the Razor shell links them with asp-append-version for cache busting.
      input: { ins01: 'src/main.tsx' },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    // tokens.css is imported as is from the site (D1); nothing else outside ClientApp is served.
    fs: { allow: ['.', '../wwwroot/css'] },
    // Standalone dev page (index.html): data calls and the site's own CSS go to the BFF. Sign in on the BFF first;
    // the session cookie is shared because both run on localhost.
    proxy: {
      '/api/ins01': bff,
      '/css': bff,
      '/img': bff,
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    css: false,
  },
});
