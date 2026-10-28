using SouthernTravels.Insights.Security;

namespace SouthernTravels.Insights.Common;

/// <summary>
/// Login is required for every page (as STPLCostSheet's SessionMiddleware does). Without a signed-in user and token in the session:
/// AJAX calls get 401 (/api/ins01/* as JSON); normal requests are redirected to
/// /Account/Login?returnUrl=... so the user comes back to the same page after logging in.
/// </summary>
public class SessionMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path;
        if (path.StartsWithSegments("/Account", StringComparison.OrdinalIgnoreCase))
        {
            await next(context);
            return;
        }

        await context.Session.LoadAsync();
        if (!string.IsNullOrEmpty(context.Session.GetString(SessionKeys.UserId)) &&
            !string.IsNullOrEmpty(context.Session.GetString(SessionKeys.AccessToken)))
        {
            await next(context);
            return;
        }

        // The INS-01 React page's BFF: 401 JSON with the correlation id, never a redirect (the page sends the user to login).
        if (path.StartsWithSegments("/api/ins01", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.Headers.CacheControl = "no-store";
            await context.Response.WriteAsJsonAsync(new { message = "Session expired", traceId = context.TraceIdentifier });
            return;
        }

        if (!string.IsNullOrEmpty(context.Request.Headers.XRequestedWith))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsync("Session expired");
            return;
        }

        // After a POST, go back to the page the form was on (the returnUrl field) rather than the POST address.
        var back = HttpMethods.IsGet(context.Request.Method) ? path + context.Request.QueryString
            : context.Request.HasFormContentType && context.Request.Form["returnUrl"].ToString() is { Length: > 0 } r ? r : "/";
        context.Response.Redirect("/Account/Login?returnUrl=" + Uri.EscapeDataString(back));
    }
}
