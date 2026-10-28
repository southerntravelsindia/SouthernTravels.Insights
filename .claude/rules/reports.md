# Report rules (CostSheet API and its report UIs)

Reports follow the normal Standard path in `workflow.md`: FSD (with its *Reports only* section) → TSD → `/db-change` → implement → contract → `/review`. The backlog and IDs are in `<docs>/planned/reports/catalog.md`. This rule adds what is specific to reports.

**Reference implementations** (confirm in code; don't copy their defects):
- API: `Controllers/InsightsReport/*Controller.cs`. `OpsUserWorkload`, `ServiceWiseReport` and `TicketServiceStatus` compile. `CancellationReport` and `VendorPaymentDetails` are excluded in the `.csproj`; find out why before reusing them.
- UI (STPLCostSheet): the matching service in `Services/`, the route constant in `COMMON/ApiEndpoints.cs`, and the view under `Views/`.
- UI (SouthernTravels.Insights): the service in `Services/`, the route constant in `Common/ApiEndpoints.cs`, and the report under `Reports/` and `Views/`. A report rebuilt in React follows its TSD (INS-01 §2.2: React page under `ClientApp/` behind the ASP.NET Core BFF).

**One repo per session.** API layers in STPLCostSheetAPI (proc → DTOs → `clsSPNames` → repository → controller → contract file), then UI layers in the UI repo, built only from the contract file:
- STPLCostSheet: route constant → session-validated service → controller with the role/scope check → view → `wwwroot/js/reports/<id>.js`.
- SouthernTravels.Insights: route constant → session-validated service → BFF controller (session check, identity from the session only) → React page or Razor view. The browser never calls STPLCostSheetAPI directly.

**Per report:**
- **SQL:** report procs are read-only. Page and filter on the server. Return totals from the same query as the rows they total. Use `NOLOCK` only if the existing reports do and the BA accepts dirty reads.
- **API:** async repository method with per-call `DynamicParameters`; the controller's token check and the existing envelope; no exception text in responses.
- **Visibility:** row-level scope (branch, executive or approver) is enforced by the API, per the Access Management requirements (ACC-01/02). The UI never filters for security.
- **Exports:** the same query and filters as the screen, with a row cap or streaming.
- **Limits:** a maximum date range and page size, stated in the contract.
