# API contract <ID>: <name>

The only source the calling repo (e.g. the CostSheet UI) uses for this API's shape. Written by the API side; changed only by the API side.

| | |
|---|---|
| Status | Draft / Agreed / Implemented (API PR <link>) |
| API repo / branch | e.g. STPLCostSheetAPI / <branch> |
| Callers | e.g. STPLCostSheet `COMMON/ApiEndpoints.cs` |
| FSD / TSD | <paths and versions> |

## Endpoint
`POST api/<Controller>/<Action>`

## Auth and visibility
- Token: the existing `securityKey` / JWT check on the request, plus the `[Authorize]` policy once ACC-01/02 lands.
- Row scope enforced **by the API**, e.g. only branches in the caller's `HandlingBranch`. The caller never filters for security.

## Request
| Field | Type | Required | Notes |
|---|---|---|---|
| UserName | string | yes | |
| securityKey | string | yes | |

For lists and reports, also: `FromDate` / `ToDate` (yyyy-MM-dd, inclusive, max range), `PageNo` / `PageSize` (with a maximum), `SortBy` / `SortDir` (allow-listed column names only).

## Response
Envelope: `{ "Success": bool, "Message": string, "Data": … }`. For lists: `"Data": { "Rows": [...], "Totals": {...}, "TotalCount": int }`.

| Field | Type | Format | Source (proc.column) |
|---|---|---|---|

## Errors
| Case | Success | Message | HTTP |
|---|---|---|---|
| Invalid token | false | "Unauthorized" | 200 (current API convention) |

## Compatibility
What changed from the previous version, whether old callers keep working, and the deploy order.

## Sample
Request and response with synthetic data only.
