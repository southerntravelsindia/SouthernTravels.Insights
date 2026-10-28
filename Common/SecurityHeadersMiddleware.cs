namespace SouthernTravels.Insights.Common;

/// <summary>
/// INS-01 H9: response headers for every page. The CSP allows scripts from this site only (the React bundle and login.js are
/// external files; no inline script anywhere). Inline styles stay allowed because the Razor reports write their card and
/// alignment CSS inline (Infrastructure/CardCss.cs) and set colours with style attributes. Fonts come from Google Fonts.
/// HSTS is added by UseHsts outside Development.
/// </summary>
public class SecurityHeadersMiddleware(RequestDelegate next)
{
    public const string Csp =
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; " +
        "base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

    public Task InvokeAsync(HttpContext context)
    {
        var h = context.Response.Headers;
        h.ContentSecurityPolicy = Csp;
        h.XContentTypeOptions = "nosniff";
        h.XFrameOptions = "DENY";
        return next(context);
    }
}
