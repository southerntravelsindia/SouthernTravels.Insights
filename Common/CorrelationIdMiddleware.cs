using System.Text.RegularExpressions;

namespace SouthernTravels.Insights.Common;

/// <summary>
/// INS-01 H13: every /api/* call carries an <c>X-Correlation-ID</c>. The React page sends one id per page load; a missing or
/// malformed id (not 1–64 letters, digits or '-') is replaced with a new one. The id becomes the request's TraceIdentifier, so
/// error bodies (<c>traceId</c>), logs and, from Phase 4, the STPLCostSheetAPI call all carry the same value.
/// </summary>
public partial class CorrelationIdMiddleware(RequestDelegate next)
{
    public const string Header = "X-Correlation-ID";

    [GeneratedRegex("^[A-Za-z0-9-]{1,64}$")]
    private static partial Regex Valid();

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase))
        {
            var id = context.Request.Headers[Header].ToString();
            if (!Valid().IsMatch(id)) id = Guid.NewGuid().ToString("N");
            context.TraceIdentifier = id;
            context.Response.Headers[Header] = id;
        }
        await next(context);
    }
}
