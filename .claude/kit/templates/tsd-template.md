# TSD <ID>: <name>

Technical design: **how** the approved FSD is built. Produced by the developer's planning session and approved by the tech lead. Keep facts and assumptions visibly separate: mark each mapping *verified* (seen in code or schema) or *proposed*.

| | |
|---|---|
| FSD | `<docs>/planned/specs/<ID>.md`, version <x.y> |
| Path | Standard |
| Repos | e.g. STPLCostSheetAPI, then STPLCostSheet |
| Contract | `<docs>/planned/contracts/<ID>.md` (if another repo calls the API) |
| Approved by (tech lead) / date | |

## 1. Requirement summary
Acceptance criteria from the FSD, by id. Note any that are ambiguous.

## 2. Requirement → implementation
| FSD item (field, filter, total, CTA, export) | Screen / endpoint | Service / repository method | Proc | Table.column | Verified / proposed |
|---|---|---|---|---|---|

## 3. Impacted code
Files and methods with `path:line`, per repo.

## 4. Database
New or changed procs, tables and indexes. For each existing object, the other apps that call it. "/db-change needed for: …". No SQL here.

## 5. Contracts and other apps
Routes, request and response DTOs, proc signatures and config keys (names only) that change; callers in other repos; deploy order (DB → API → UI → panels).

## 6. Security and access
Who can call each endpoint, the token or session check, row-level scope enforced server-side, and the checklist items that apply (`.claude/kit/SECURITY-CHECKLIST.md`).

## 7. Performance
Largest range, paging, row caps, indexes needed, response-time target.

## 8. Risks
Money/seat/number atomicity, idempotency, external messages, data volume, open-auth exposure.

## 9. Open questions for the BA
Numbered.

## 10. Milestones
| # | Scope | Builds on its own? | Verification | Test IDs it must pass |
|---|---|---|---|---|

## 11. Test strategy
What is automated (and where), what is manual or UAT, regression of other callers. If the test plan already exists (`<docs>/planned/tests/<ID>.md`, written test-first from the FSD), map its test IDs to the milestones above and list any test that no milestone makes pass.
