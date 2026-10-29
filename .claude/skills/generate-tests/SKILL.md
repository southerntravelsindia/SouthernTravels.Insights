---
name: generate-tests
description: Build or update the test plan for a change (test cases traced to the FSD acceptance criteria and TSD sections, plus contract and regression tests), test-first from the FSD alone with --fsd, and optionally write the automated unit tests this repo can run.
disable-model-invocation: true
argument-hint: "<ticket or spec id> [--fsd | --write]"
---
Tests for: $ARGUMENTS

If no id is given and the requirement isn't clear from the session, ask before starting.

The test plan grows in stages, so QA can write the test cases before any code exists. Every row has a **Stage**:

| Stage | Written when | From | What the rows check |
|---|---|---|---|
| **FSD** | As soon as the FSD is BA-approved, before the TSD and the code (test-first) | The FSD only | What a user does and sees, in business terms: no procs, endpoints or class names |
| **TSD** | After the TSD is approved | The TSD and the contract | Proc results, row-level access, performance, risks, contract shape, regression of other callers |
| **Build** | After code changes | The diff | New error paths and edge cases the code introduced; the automated tests |

**With `--fsd`:** build FSD-stage rows only. Don't read the TSD, the contract or the code even if they exist, and skip steps 5–7. `--fsd` and `--write` can't be combined. **Without it:** cover every stage whose input exists.

1. **Read the inputs** (paths in `.claude/rules/workflow.md`): the FSD (acceptance criteria), and unless `--fsd`, the TSD, the contract file if there is one, and the diff or files involved.
   - **FSD missing:** stop. Say so, and offer to draft the FSD for the BA from `fsd-template.md`. Test cases need an agreed spec to trace to.
   - **FSD still Draft or not merged:** say so and ask whether to go on. If yes, write "Draft FSD v<x.y>" in the plan header; the rows are provisional until the BA lead approves it.
2. **Build the test plan** from `.claude/kit/templates/test-plan-template.md`. Every row traces to an FSD acceptance criterion (`AC3`) **or** a TSD section (`TSD §7`); a row that traces to neither doesn't belong. Cover:
   - **FSD stage:** each acceptance criterion with functional, negative and boundary cases; every CTA; every export. Plus the standard risks a user can try on screen: another branch's data, an expired session, a missing role, a tampered id in the URL or form; double submit; money zero/negative/rounding and totals that reconcile; empty results, date-range edges, very large result sets; non-LIVE suppression of WhatsApp/SMS/e-mail/payments. Steps name the screens, fields and buttons from the FSD.
   - **TSD stage:** proc results reconciled against reference SQL (§2/§4), row-level access and the checklist items in §6, the performance targets in §7, the risks in §8; retry after timeout and partial failure. **Contract tests:** if a contract file exists, one row per endpoint for the valid shape, each documented error, paging/sort limits and auth failure. **Regression:** the other callers listed in the TSD's *Contracts and other apps* section.
   - **Build stage:** error paths, branches and edge cases in the diff that no earlier row covers.

   Fill the **Coverage** table: every acceptance criterion with its test IDs. An AC with no row is a gap; say so. Where the FSD doesn't settle the expected result, write "BA question", list it in the *BA questions* section and mark the row Blocked.
3. **If a test plan already exists** at `<docs>/planned/tests/<ID>.md`, update it:
   - Add rows for the new stage, new criteria or new TSD items. Keep the existing test IDs; new rows take the next free number.
   - Earlier rows may gain detail in Preconditions and Steps. Change an **Expected result** only when the FSD changed: cite the new FSD version in the row, and update the header.
   - Mark rows whose source was removed as Obsolete.
   - Never overwrite the Actual, Result, Tester, Date or Evidence columns.
4. **Show the plan and offer to save it** to `<docs>/planned/tests/<ID>.md` on a `docs/claude-<id>-tests` branch in docs-claude. A human opens the PR. QA executes from that file, and developers plan against its FSD-stage test IDs (the TSD maps each milestone to the IDs it must pass).
5. **Pick the automation candidates** using this repo's stack rule:
   - **.NET 8:** xUnit tests for services, controllers, validators and calculations, and contract-shape tests on DTOs. If the repo has no test project, propose `/add-test-project` first.
   - **Web Forms / MVC 5:** characterization tests on extracted pure logic only; pages stay manual or UAT.
   - No tests against a shared database until a test-database strategy is agreed; those rows stay `manual`.
6. **Write tests only if the user passed `--write` or asks.** Put each test's name in the row's Automation column. Test-first in code: a test may be written before the code it checks, and then it's reported as failing until that milestone is built.
7. **Run them and report** the command and the result lines. Failing tests are reported as failing, not adjusted to pass. Only automated runs may fill a Result; manual rows stay "Not run" for QA.

Synthetic data only. Never put real customer rows, PAN, Aadhaar or mobile numbers into fixtures or the plan.
