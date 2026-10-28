---
name: review
description: Review the current branch before a PR. A diff scan plus independent code-review and security-review agents in parallel, merged into one verified list, a security checklist table and a gate verdict.
disable-model-invocation: true
argument-hint: "[base-branch]"
---
Review the changes on this branch. Base branch: $ARGUMENTS

If the base is empty or unclear, check `git branch -a` and use the repo's default branch (`master` or `Master`); say which one you used.

1. **Scope.** Run `git diff --stat <base>...HEAD`, `git log --oneline <base>..HEAD` and `git status --short`. Note uncommitted changes: the reviewers look at `<base>...HEAD`, so uncommitted work is only reviewed if you say so.
2. **Scan.** Run `powershell -NoProfile -ExecutionPolicy Bypass -File "${CLAUDE_SKILL_DIR}/scan-diff.ps1" -Base <base>` and keep the output. A hit means "look here", not "defect". The scan also counts uncommitted tracked files.
3. **Two independent reviews in parallel.** In one message, make two Agent calls:
   - `subagent_type: code-reviewer`, with the base branch, whether there are uncommitted changes, and the approved plan (the TSD) if one exists.
   - `subagent_type: security-reviewer`, with the base branch, whether there are uncommitted changes, and the scan output.

   Both read the diff themselves. Don't pass them your opinion of the change.
4. **Databases.** If any `.sql` file or proc name appears in the change, confirm `/db-change` was done: the change and rollback scripts exist in the `sqlDir` from `.claude/kit/kit.json`, and their headers list the callers.
5. **Contracts.** If a route, request or response that another repo calls changed, confirm the contract file was written or updated (see `.claude/rules/workflow.md`, *Contracts between repos*).
6. **Verify every finding** by opening its `path:line` and confirming the problem is really there, in the changed code or the code it calls. Drop what you can't confirm, and say how many you dropped and why. Merge duplicates found by both agents.
7. **Report:**
   - **Findings:** blockers, then major, minor and nit. Each with `path:line`, the problem, a failure scenario and the fix.
   - **Security checklist:** one table with checklist id, result (Fail / Pass / N/A / Not verified), `path:line`, severity, fix. Fails first.
   - **Not verified:** build, tests, UAT, other repos, server config.
   - **Gate:** any blocker, or any critical or high security Fail, blocks the PR. Say so explicitly.

Don't edit code in this skill, and never print secret values (key name or `path:line` only). Offer to fix the blockers as a separate step.
