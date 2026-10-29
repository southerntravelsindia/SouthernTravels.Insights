---
name: db-change
description: Plan a stored procedure, table, view or function change safely. Finds every app that uses the object, its variants, and result-contract readers, then writes a change script, a rollback script and the deploy order. Use before touching any database object.
disable-model-invocation: true
argument-hint: "<object name> <what needs to change>"
---
Database change request: $ARGUMENTS

The Southern Travels databases are shared by 7 apps. Don't change any object until this analysis is done and approved.

## 1. Impact

1. Run the lookup:
   `powershell -NoProfile -ExecutionPolicy Bypass -File "${CLAUDE_SKILL_DIR}/find-db-object.ps1" -Name <object>`
   It shows which DB the object is in, which apps call it (from docs-claude), the tables it writes and reads, its variants (`_v1`, `_New` …) and every reference in every cloned repo.
   For each **table** the object writes, also run the lookup on the table. It lists the table's indexes and **triggers**. Triggers' writes don't appear in the proc's own row, and most core-DB triggers assume single-row statements. A change from single-row to multi-row inserts silently breaks them.
2. Use the Agent tool with `subagent_type: db-impact-analyst`. Pass it the **full lookup output** and the intended change. Ask it to confirm the live callers, the result-contract readers per caller, and a compatibility strategy.
3. Present the impact summary and **stop for approval**:
   - callers by app,
   - which variant each caller uses,
   - the columns and parameters each caller reads,
   - cross-DB references,
   - risks,
   - the recommended strategy.

## 2. Scripts (after approval)

Write the scripts into the SQL folder named by `sqlDir` in `.claude/kit/kit.json`. The default is `Database/Changes/`; create it if missing. Use the templates next to this skill:

- `YYYYMMDD_<ticket>_<object>.sql` from [change-template.sql](change-template.sql)
- `YYYYMMDD_<ticket>_<object>_rollback.sql` from [rollback-template.sql](rollback-template.sql)

Rules:
- Get the current definition from docs-claude or the repo. If you only have the docs summary, say so and ask a human to script the live definition first: `sp_helptext` on UAT, run by them.
- **Prefer additive changes.** New parameters go at the end with defaults; existing result columns keep their order and names; new behaviour goes behind a parameter or a new proc.
- State-changing procs get `SET XACT_ABORT ON`, `BEGIN TRY / BEGIN TRAN … COMMIT / CATCH ROLLBACK; THROW`, and an existence or idempotency check.
- Never use the `sp_` prefix for new procs. Never add new hard-coded database names.
- The rollback script must restore the exact previous definition.

## 3. Hand-off

Give the human:
- **Run order:** UAT first, smoke-test the listed callers, then production, in the deploy order DB → CostSheet API → CostSheet UI → Branch / Admin / Website / Agent / EMS.
- **Smoke test:** which screens or endpoints in which apps to check.
- **Docs:** a note that docs-claude must be updated. Re-export the schema, then run `_tools/scan_repos.py` and `_tools/generate_db_docs.py`.

Never run scripts against a shared server from this session. The guard hook will block it.
