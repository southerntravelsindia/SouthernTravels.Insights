using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using SouthernTravels.Insights.Common;
using SouthernTravels.Insights.Security;

namespace SouthernTravels.Insights.Tests;

public class MiddlewareTests
{
    private sealed class FakeSession(Dictionary<string, byte[]>? values = null) : ISession
    {
        private readonly Dictionary<string, byte[]> _values = values ?? new();
        public bool IsAvailable => true;
        public string Id => "test";
        public IEnumerable<string> Keys => _values.Keys;
        public void Clear() => _values.Clear();
        public Task CommitAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task LoadAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public void Remove(string key) => _values.Remove(key);
        public void Set(string key, byte[] value) => _values[key] = value;
        public bool TryGetValue(string key, [NotNullWhen(true)] out byte[]? value) => _values.TryGetValue(key, out value);
    }

    private sealed class SessionFeature(ISession session) : ISessionFeature
    {
        public ISession Session { get; set; } = session;
    }

    private static DefaultHttpContext Context(string path, bool signedIn = false, string method = "GET")
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Path = path;
        ctx.Request.Method = method;
        ctx.Response.Body = new MemoryStream();
        var session = new FakeSession();
        if (signedIn)
        {
            session.SetString(SessionKeys.UserId, "test.user");
            session.SetString(SessionKeys.AccessToken, "test-token");
        }
        ctx.Features.Set<ISessionFeature>(new SessionFeature(session));
        return ctx;
    }

    private static string Body(HttpContext ctx)
    {
        ctx.Response.Body.Position = 0;
        return new StreamReader(ctx.Response.Body).ReadToEnd();
    }

    [Fact]
    public async Task Session_missing_on_ins01_api_returns_401_json_not_a_redirect()
    {
        var ctx = Context("/api/ins01/tickets");
        ctx.TraceIdentifier = "corr-1";
        var called = false;
        await new SessionMiddleware(_ => { called = true; return Task.CompletedTask; }).InvokeAsync(ctx);

        Assert.False(called);
        Assert.Equal(401, ctx.Response.StatusCode);
        Assert.Equal("no-store", ctx.Response.Headers.CacheControl.ToString());
        Assert.False(ctx.Response.Headers.ContainsKey("Location"));
        using var json = JsonDocument.Parse(Body(ctx));
        Assert.Equal("Session expired", json.RootElement.GetProperty("message").GetString());
        Assert.Equal("corr-1", json.RootElement.GetProperty("traceId").GetString());
    }

    [Fact]
    public async Task Session_missing_on_a_page_still_redirects_to_login()
    {
        var ctx = Context("/Operations/TicketServiceStatus");
        ctx.Request.QueryString = new QueryString("?tab=vendor");
        await new SessionMiddleware(_ => Task.CompletedTask).InvokeAsync(ctx);

        Assert.Equal(302, ctx.Response.StatusCode);
        Assert.Equal("/Account/Login?returnUrl=%2FOperations%2FTicketServiceStatus%3Ftab%3Dvendor", ctx.Response.Headers.Location.ToString());
    }

    [Fact]
    public async Task Signed_in_api_call_passes_through()
    {
        var ctx = Context("/api/ins01/kpi", signedIn: true);
        var called = false;
        await new SessionMiddleware(_ => { called = true; return Task.CompletedTask; }).InvokeAsync(ctx);
        Assert.True(called);
    }

    [Theory]
    [InlineData("abc-123", "abc-123")]
    [InlineData("", null)]
    [InlineData("bad id with spaces", null)]
    [InlineData("<script>", null)]
    public async Task Correlation_id_is_kept_when_valid_and_replaced_otherwise(string sent, string? expected)
    {
        var ctx = Context("/api/ins01/kpi");
        ctx.Request.Headers[CorrelationIdMiddleware.Header] = sent;
        await new CorrelationIdMiddleware(_ => Task.CompletedTask).InvokeAsync(ctx);

        var id = ctx.Response.Headers[CorrelationIdMiddleware.Header].ToString();
        Assert.Equal(id, ctx.TraceIdentifier);
        if (expected is null) Assert.Matches("^[0-9a-f]{32}$", id);
        else Assert.Equal(expected, id);
    }

    [Fact]
    public async Task Correlation_id_is_only_added_to_api_calls()
    {
        var ctx = Context("/Operations/TicketServiceStatus");
        await new CorrelationIdMiddleware(_ => Task.CompletedTask).InvokeAsync(ctx);
        Assert.False(ctx.Response.Headers.ContainsKey(CorrelationIdMiddleware.Header));
    }

    [Fact]
    public async Task Security_headers_allow_scripts_from_this_site_only()
    {
        var ctx = Context("/Operations/TicketServiceStatus");
        await new SecurityHeadersMiddleware(_ => Task.CompletedTask).InvokeAsync(ctx);

        var csp = ctx.Response.Headers.ContentSecurityPolicy.ToString();
        Assert.Contains("script-src 'self';", csp);
        Assert.DoesNotContain("unsafe-eval", csp);
        Assert.Contains("frame-ancestors 'none'", csp);
        Assert.Equal("nosniff", ctx.Response.Headers.XContentTypeOptions.ToString());
        Assert.Equal("DENY", ctx.Response.Headers.XFrameOptions.ToString());
    }
}
