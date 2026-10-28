# INS-01 Ticket & Service Status — standalone React app

A static single-page app (React 19, TypeScript, Vite 8) that signs the user in with an OTP and calls
**STPLCostSheetAPI directly**. The repo no longer contains the .NET Insights site: its stylesheets and logo are kept
here unchanged (`src/styles/insights/tokens.css`, `site.css`, `login.css`, `src/assets/logo-southern.png`), copied from
the Razor site at commit `56d2c67`. That commit is also the design baseline the code comments refer to (`Views/...`,
`Infrastructure/...`). The page-scroll pattern is described in `docs/SCROLL_BEHAVIOUR.md`.

> Design change from TSD INS-01 v0.7.5 §2.2 (React behind the ASP.NET Core BFF), requested 28 Oct 2026 with the tech
> lead's approval stated by the developer. The TSD, the contract's "Callers" section and the security review need
> updating to match (see "Before production" below).

## Run

```bash
npm ci
cp .env.example .env.local      # then set the values (never commit .env files)
npm run dev                     # http://localhost:5173, /stpl-api/ forwarded to STPL_API_PROXY_TARGET
npm test                        # Vitest + React Testing Library
npm run build                   # → dist/
npm run preview                 # serves dist/ on http://localhost:4173
```

On Git Bash, a value such as `/stpl-api/` passed on the command line is turned into a Windows path; put it in
`.env.local` or prefix the command with `MSYS_NO_PATHCONV=1`.

## Settings (`.env.example`)

| Key | Used | Meaning |
|---|---|---|
| `VITE_API_BASE_URL` | build | STPLCostSheetAPI base the browser calls, ending in `/`. Absolute (`https://…/`) or a same-origin path (`/stpl-api/`) behind a reverse proxy. Checked at start-up (`src/app/config.ts`) |
| `VITE_BASE_PATH` | build | Path the site is served under; `/` by default |
| `STPL_API_PROXY_TARGET` | dev server | Where `npm run dev` forwards `/stpl-api/` |

## How it talks to the API

- `src/lib/api.ts` is the only client. INS-01 routes (`api/TicketServiceStatus/*`) follow
  `docs-claude/planned/contracts/INS-01.md` v0.1: POST, JSON, the user JWT as `securityKey` and the login name as
  `UserName` in the body, `MineOnly`, paging and row keys from the URL state. Replies are mapped in
  `src/reports/ins01/data.ts`. 15 s timeout; 401 → token forgotten, login page.
- Login uses `Account/SendOTP` and `Account/ValidateUserOTP` with the bodies the Insights login sends today
  (`Services/AccountService.cs` at `56d2c67`); **there is no contract file for them yet**.
- The token is kept in `sessionStorage` (this tab only, cleared on logout or when the tab closes). It is readable by
  any script on the page, so the site must load no third-party scripts and must send a strict CSP.

## Hosting

Any static host (IIS site or virtual directory, nginx). Needed:

1. **SPA fallback:** unknown paths return `index.html` (IIS URL Rewrite / nginx `try_files`).
2. **Headers** on every response:
   `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' <API origin>; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
   `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, HSTS on HTTPS. `index.html` with `Cache-Control: no-cache`; `assets/*` can be cached long (hashed names).
3. **Reaching the API**, one of:
   - **CORS on STPLCostSheetAPI** (change in that repo): allow this site's origin only, methods `POST`, headers
     `Content-Type, X-Correlation-ID`, no credentials; or
   - **Same-origin reverse proxy** (`/stpl-api/` → API on the same host name): no CORS change, set
     `VITE_API_BASE_URL=/stpl-api/`.

## Before production (gates)

- API: **rate limits on `Account/SendOTP` and `Account/ValidateUserOTP`** (the Insights site limited them to 5/min per
  IP; a browser app cannot) and on the INS-01 routes (TSD H7).
- API: **"Show all" (`MineOnly=false`) is not permission-checked yet** (contract v0.1, Access Management Phase 6). Any
  user with a token can read every branch's tickets and vendor margins. Not for production users until enforced.
- API: CORS or reverse proxy (above). HTTPS only.
- Docs: TSD §2.2/§3/§6/H9/H20 and the contract's Callers and Auth sections updated for a browser caller; a contract for
  the two login routes.
