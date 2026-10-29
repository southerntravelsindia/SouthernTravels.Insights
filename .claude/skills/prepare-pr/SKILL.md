---
name: prepare-pr
description: Draft a PR description and release hand-off from verified work on the current branch. Does not commit, push or open the PR.
disable-model-invocation: true
argument-hint: "[ticket]"
---
Prepare the PR for: $ARGUMENTS

1. **Collect the facts yourself.** Run `git log --oneline <base>..HEAD`, `git diff --stat <base>...HEAD` and `git status --short`, and read the per-file diffs you need. Use the `/review` result, test runs and approvals already in this session; don't re-run the review. If there was no `/review` on the current commit, say so as a gap.
2. **Draft the description:**
   - **Title** in the repo's style, e.g. `feat(ops): INS-02 OPS user workload report`.
   - **Summary:** why, and what changed. Link the FSD, the TSD and any contract file.
   - **Changes** by layer: UI, controller, service, repository, SQL, config.
   - **Database:** scripts, rollback, the apps affected, and UAT-first instructions. "None" if there is nothing.
   - **Contracts:** API routes and DTOs, proc signatures, config keys (names only), other repos that need changes, and the deploy order (DB → API → UI → panels).
   - **Evidence:** the commands actually run and their result lines. Missing evidence is listed as a gap.
   - **Reviews:** `/review` gate and open findings.
   - **Screenshots needed** for UI changes.
   - **Sign-offs:** BA / QA / tech lead / security checkboxes.
   - **Rollback plan.**
3. **Readiness.** Never call it "ready to merge" while a blocker, missing evidence, uncommitted work or a missing sign-off remains; list them at the top.

Don't commit, push or create the PR unless the user explicitly asks in a separate message.
