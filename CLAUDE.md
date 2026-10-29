# Insights-Panel: Claude Code instructions

Southern Travels kit 2.1.8 · stack: node · shared context: docs-claude at `../../docs-claude`

## This app
@../../docs-claude/apps/Insights-Panel/README.md

> If the line above appears as a literal `@…` path instead of the README's content, the external import was not loaded. This happens when the one-time approval wasn't given, or in clients that don't support external imports. In that case, **read that README with the Read tool before doing anything else.**

Read on demand (not imported, to save context):
- `../../docs-claude/apps/Insights-Panel/code-map.md`: layout, startup, request path, modules, findings
- `../../docs-claude/apps/Insights-Panel/data-access.md`: every proc this app calls, with call sites
- `../../docs-claude/apps/Insights-Panel/config.md`: config keys (no values)
- `../../docs-claude/databases/README.md` and `../../docs-claude/databases/<db>/procedures/<domain>.md`: who else calls a proc
- `../../docs-claude/platform/overview.md`: integration map, environments, deploy order

## Branch convention
<type>/claude-<ticket>-<short-name>  (type: feat, fix, chore, docs; e.g. feat/claude-ins-02-ops-workload). Branches created from a Claude session carry the claude- marker; the guard hook enforces it. Never commit to the default branch; the guard hook blocks it.

## Database scripts
Change and rollback scripts from `/db-change` go in `Database/Changes/`. Humans run them, UAT first.

## Build, run, test
<!-- Fill in the verified commands for this repo. -->

## Rules
`.claude/rules/` loads automatically: security, database, evidence, workflow, and the stack rule. The security checklist is `.claude/kit/SECURITY-CHECKLIST.md`; FSD, TSD, contract and test-plan templates are in `.claude/kit/templates/`.

## Commands
Plan in plan mode (see `workflow.md`) · `/db-change` · `/generate-tests` · `/review` · `/prepare-pr`
