# Database rules — Southern Travels

Every app shares SQL Server databases, and almost all logic lives in stored procedures. A proc change can break an app you never opened.

- **Before changing any proc, table or view, follow the `db-change` procedure.** Read `.claude/skills/db-change/SKILL.md` and carry it out, or ask the user to run `/db-change`. It finds every app that calls the object (from `docs-claude`), its `_v1` / `_New` / `_old` variants, and plans the script, rollback and deploy order.
- **Never change schema or data on a shared server from this session.** Produce `.sql` scripts for a human to run: UAT first, then production. No `sqlcmd` / `Invoke-Sqlcmd` / SSMS automation against non-local servers.
- **Prefer additive changes:** new optional parameters with defaults, new columns as NULL-able, new procs alongside old ones. Remove the old ones only after every caller is migrated.
- **Map every field to a verified source** (table/view/proc + column). If a value is missing, flag it; don't assume zero or blank.
- **Use the existing data-access pattern** of the app (Dapper + proc in the .NET 8 apps; `DataLib` / `ClsAdo` / LINQ to SQL in Web Forms) and parameters only.
- **State-changing procs:** explicit transaction, `SET XACT_ABORT ON`, `TRY/CATCH` with rollback, and an idempotency key or existence check for anything a user can submit twice.
- **Hard-coded database names** (`STPL_CostSheet..X`, `southerntravelsweb_ND.dbo.Y`) break on UAT copies. Don't add new ones; note existing ones in the change plan.
- **Number generators** (`NewKeyTable_Online`, `FileNumberMaster`) must be read and updated atomically (`UPDATE … OUTPUT` or `sp_getapplock`).
- Name new procs `usp_<Area>_<Verb><Noun>`; never `sp_` (SQL Server searches `master` first).
