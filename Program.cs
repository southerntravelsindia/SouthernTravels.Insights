using System.Threading.RateLimiting;
using SouthernTravels.Insights.Common;
using SouthernTravels.Insights.Helpers;
using SouthernTravels.Insights.Interfaces;
using SouthernTravels.Insights.Security;
using SouthernTravels.Insights.Services;

var builder = WebApplication.CreateBuilder(args);

/* =======================
   CORE SERVICES
======================= */
builder.Services.AddHttpContextAccessor();
builder.Services.AddControllersWithViews();

/* =======================
   SESSION (signed-in user and API token)
======================= */
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.Name = "STInsightsSession";
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    options.Cookie.SameSite = SameSiteMode.Lax;
});

/* =======================
   APPLICATION SERVICES (same as STPLCostSheet: Controller -> Service -> ApiClientHelper -> API)
======================= */
builder.Services.AddHttpClient<IApiClientHelper, ApiClientHelper>();
builder.Services.AddScoped<ISessionSecurityService, SessionSecurityService>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<IOperationService, OperationService>();

/* =======================
   INS-01 REACT PAGE (behind FeatureFlags:INS01_React): BFF data and the antiforgery header its POST calls send
======================= */
builder.Services.AddSingleton<IIns01ReportService, Ins01SampleReportService>();
builder.Services.AddAntiforgery(options => options.HeaderName = "X-XSRF-TOKEN");

/* =======================
   RATE LIMITING (Send OTP / Validate OTP: 5 tries per minute per IP)
======================= */
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("loginLimit", http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = (ctx, _) =>
    {
        if (string.IsNullOrEmpty(ctx.HttpContext.Request.Headers.XRequestedWith))
            ctx.HttpContext.Response.Redirect("/Account/Login?limited=true");
        return ValueTask.CompletedTask;
    };
});

var app = builder.Build();

/* =======================
   MIDDLEWARE PIPELINE
======================= */
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Operations/Error");
    app.UseHsts();
}

// Security headers and CSP on every response (INS-01 H9); correlation id on /api/* calls (H13).
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<CorrelationIdMiddleware>();

app.UseStaticFiles();
app.UseRouting();
app.UseRateLimiter();
app.UseSession();

// Login is required: anyone without a session is sent to /Account/Login.
app.UseMiddleware<SessionMiddleware>();
app.UseMiddleware<GlobalExceptionMiddleware>();

// Each controller has its route on the class: /Operations/<Report>, /Account/...
app.MapControllers();
app.MapGet("/", () => Results.Redirect("/Operations/TicketServiceStatus"));

app.Run();

// Lets the xUnit project (tests/SouthernTravels.Insights.Tests) host the app with WebApplicationFactory.
public partial class Program { }
