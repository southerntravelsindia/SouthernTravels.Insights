using Microsoft.AspNetCore.Mvc;
using SouthernTravels.Insights.Common;
using SouthernTravels.Insights.Interfaces;
using SouthernTravels.Insights.Models.Ins01;

namespace SouthernTravels.Insights.Controllers.Api;

/// <summary>
/// INS-01 Ticket &amp; Service Status: the backend-for-frontend the React page calls (TSD §2.2). The browser only ever talks to
/// these routes; the user's API token stays in the server session.
/// Off (404) unless FeatureFlags:INS01_React is on; Phase 4a answers from the synthetic sample set only.
/// <list type="bullet">
/// <item>Session: SessionMiddleware answers 401 JSON (not a redirect) for /api/ins01/* when nobody is signed in.</item>
/// <item>POST needs the antiforgery header (<c>X-XSRF-TOKEN</c>, token from the shell page's meta tag).</item>
/// <item>No caching (<c>Cache-Control: no-store</c>): the responses carry passenger and margin data (H9).</item>
/// <item>Identity never comes from the browser: <c>all</c> (Show all) is the only scope input.</item>
/// </list>
/// </summary>
[ApiController]
[Route("api/ins01")]
[FeatureGate("FeatureFlags:INS01_React")]
[AutoValidateAntiforgeryToken]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class Ins01Controller(IIns01ReportService report) : ControllerBase
{
    /// <summary>Most rows one drill-down call may ask for (the API's batch limit).</summary>
    public const int MaxBatch = 100;

    [HttpGet("kpi")]
    public async Task<ActionResult<Ins01Kpi>> Kpi([FromQuery] int all, CancellationToken ct) =>
        await report.GetKpiAsync(all != 1, ct);

    [HttpGet("tickets")]
    public async Task<ActionResult<Ins01Page<Ins01TicketRow>>> Tickets([FromQuery] int all, [FromQuery] int page, CancellationToken ct) =>
        await report.GetTicketsAsync(all != 1, Math.Max(1, page), ct);

    [HttpGet("vendors")]
    public async Task<ActionResult<Ins01Page<Ins01VendorRow>>> Vendors([FromQuery] int all, [FromQuery] int page, CancellationToken ct) =>
        await report.GetVendorsAsync(all != 1, Math.Max(1, page), ct);

    [HttpPost("ticket-services")]
    public async Task<ActionResult<Ins01TicketServices>> TicketServices([FromBody] Ins01TicketServicesRequest body, CancellationToken ct)
    {
        if (BatchError("ticketRowKeys", body.TicketRowKeys) is { } bad) return bad;
        return await report.GetTicketServicesAsync(body.TicketRowKeys!, !body.All, ct);
    }

    [HttpPost("vendor-services")]
    public async Task<ActionResult<Ins01VendorServices>> VendorServices([FromBody] Ins01VendorServicesRequest body, CancellationToken ct)
    {
        if (BatchError("vendorIds", body.VendorIds) is { } bad) return bad;
        return await report.GetVendorServicesAsync(body.VendorIds!, !body.All, ct);
    }

    private BadRequestObjectResult? BatchError(string field, IReadOnlyList<int>? keys) =>
        keys is null || keys.Count == 0 ? BadRequest(Error($"{field}: at least one is required"))
        : keys.Count > MaxBatch ? BadRequest(Error($"{field}: at most {MaxBatch}"))
        : null;

    /// <summary>Error body: safe text plus the correlation id (the request's TraceIdentifier, see CorrelationIdMiddleware).</summary>
    private object Error(string message) => new { message, traceId = HttpContext.TraceIdentifier };
}
