---
paths:
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.cjs"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/package.json"
  - "**/tsconfig*.json"
  - "**/.env.example"
---
# Node.js rules (Insights)

## Before you change anything
- **Read `package.json` first:** the Node version (`engines`, `.nvmrc`), the module system (`"type": "module"` → ESM, otherwise CommonJS), the framework, and the `scripts`. Follow what's there. Don't mix `require` and `import` in one module system, and don't switch it.
- **TypeScript, if the repo uses it:** keep `strict`. Don't silence errors with `any`, `as unknown as`, `// @ts-ignore` or `!`.
- **Dependencies:** no new packages, upgrades or major bumps without approval. Install from the lockfile (`npm ci`). `package-lock.json` changes only together with a `package.json` change. Never `npm audit fix --force`. When a package is approved, name its licence and last release in the PR.

## Conventions to follow
- **Config.** Read `process.env` in **one** config module that validates the required keys at startup and fails fast. `.env` files are per machine and per server: git-ignored, and never read, printed or edited from a Claude session. Add a new key to `.env.example` with a placeholder (`__SET_ON_SERVER__`) and name it in the PR.
- **Data.** Insights gets its data from **STPLCostSheetAPI**, built only from the contract file (`<docs>/planned/contracts/<ID>.md`), through one API client module. No direct database connection. If the contract is missing or wrong, stop and raise it against the API work (see `workflow.md`). If a database is ever approved: `mssql` with stored procedures and `request.input()` parameters, and one pool created at startup.
- **API client.** Base URL from config. A timeout and error handling on every call. Never forward the user's session or token to any other host. Don't log response bodies (they carry customer data).
- **Async.** `async`/`await` end to end. No floating promises, and no unhandled rejections. No sync `fs`, `crypto` or `child_process` calls in request paths.
- **Auth (server side).** Every route that returns data checks the session or token in middleware on the server. Identity, branch and role come from the server-side session, never from the query string, body or headers the browser sets. Cookies are `httpOnly`, `secure`, `sameSite`. State-changing requests need CSRF protection.
- **Output.** Escape everything. No `innerHTML`, `dangerouslySetInnerHTML`, `v-html` or `document.write` with data. No `eval`, `new Function` or string `setTimeout`. Never build a shell command from input: use `execFile` with an argument array, or don't shell out.
- **HTTP hardening.** Security headers (`helmet` or the framework's equivalent), a CORS allow-list (never `*` with credentials), request body size limits, rate limits on login and exports. Redirect targets must be local or allow-listed.
- **Errors.** One central error handler. No stack traces or `err.message` in responses outside development; log them with a request id and return a generic message.
- **Logging.** Use the repo's structured logger. Never log passwords, OTPs, tokens, cookies, full request bodies or customer data (names, mobiles, e-mails, PAN, Aadhaar).
- **Files.** A path built from input needs an allow-list and a `path.resolve` containment check. Exports and generated files stay out of the public static folder and are served through an authorised route.

## Reports (Insights)
- Paging, filters, date-range limits and row caps happen in the **API**, as the contract states. The browser never filters for security, and never loads "all rows" to page them locally.
- Exports use the same filters as the screen, with the contract's row cap or streaming.
- Totals come from the API with the rows they total. Don't recompute money in JavaScript floats: format what the API returns (INR, 2 decimals), or use integer paise or a decimal library if a calculation is unavoidable.
- Sample or mock data is for local development only, behind an explicit flag, and never the default in a build. Say in the PR which screens still show sample data.

## Build, test and run
- Use the `package.json` scripts: `npm ci`, then `npm run build`, `npm test`, `npm run lint`. Report the command and the result lines.
- If there is no test runner, propose one (the framework's recommended runner, or `node:test`) and ask before adding it.
- Don't run `npm publish`, deploy scripts, or any script that migrates, seeds or writes to a shared environment.
- Never commit `node_modules/`, build output (`dist/`, `build/`, `.next/`), `coverage/` or `.env*` files other than `.env.example`. If `.gitignore` is missing them, add them.
