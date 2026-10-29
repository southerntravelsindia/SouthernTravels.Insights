# FSD <ID>: <name>

Functional spec: **what** the business needs and **why**. Written and approved by the BA; no tables, procs or code here (that is the TSD). Items Claude prefilled from code or docs are marked *inferred (BA to confirm)* until the BA confirms them.

| | |
|---|---|
| Type | Feature / Report / Workflow change / Approval flow |
| Area | e.g. Insights, Finance, Approvals, Operations, Access Management |
| Owner (BA) / BA lead / QA / Tech lead | |
| Version | 0.1 (Draft) |
| Status | Draft / BA-approved (merged) / In development / In QA / Done |
| Source documents | <document, version, section>; ticket <link> |
| Figma | <link + frame per screen> |

## Purpose
Who uses it, and which decision or task it supports.

## Users and access
Roles that can use it, and what each may see or do. Row-level scope: own branch, own executive, approver level, all.

## Screens and behaviour
One subsection per screen or step: what the user sees, what they can do, and what happens next (Figma frame for each).

## Fields
| Field | Meaning (business terms) | Format | Required | Validation |
|---|---|---|---|---|

## Business rules
Numbered rules, each with its source (document section, BA decision, or *inferred from* `path:line`).
1. …

## Actions (CTAs)
| Action | Who | Effect | Confirmation | Can it be repeated safely? | Audit |
|---|---|---|---|---|---|

## Reports only
Delete this section for other types.
- **Filters:** filter, type, default, required, validation.
- **Columns:** column, meaning, format, sort, total.
- **Drill-downs:** what each clickable number opens.
- **Export:** formats, columns, row cap, file name; whether personal data is shown or masked.
- **Volume:** largest expected date range and row count.

## Notifications and side effects
Messages (WhatsApp, SMS, e-mail), payments or postings this triggers, and when.

## Acceptance criteria
Numbered and testable. QA traces tests to these ids.
1. AC1 …

## Test data
Synthetic dataset and expected results (totals for reports). No real customer data.

## Open questions
Numbered; each with who must answer it.
1. …

## Change log
| Version | Date | Change | Approved by |
|---|---|---|---|
