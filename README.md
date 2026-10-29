# SouthernTravels.Insights

Insights reports for Southern Travels.

| Folder | What |
|---|---|
| [`ClientApp/`](ClientApp/README.md) | INS-01 Ticket & Service Status: a standalone React app (Vite + TypeScript) that signs in with an OTP and calls STPLCostSheetAPI directly |

The earlier ASP.NET Core MVC site (all 15 reports as Razor pages, OTP login, side menu) was removed from this branch.
It is still on `master` and at commit `56d2c67`, which is the design baseline for INS-01.

```bash
cd ClientApp
npm ci
npm run dev
```
