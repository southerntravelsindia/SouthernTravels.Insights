using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace SouthernTravels.Insights.Tests;

/// <summary>The whole pipeline in memory (no API calls are made): ordering of headers, session check and feature gate.</summary>
public class HostTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private HttpClient Client(bool reactOn) => factory
        .WithWebHostBuilder(b => b.ConfigureAppConfiguration((_, c) =>
            c.AddInMemoryCollection(new Dictionary<string, string?> { ["FeatureFlags:INS01_React"] = reactOn ? "true" : "false" })))
        .CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

    [Fact]
    public async Task Unauthenticated_bff_call_gets_401_json_with_headers()
    {
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/ins01/kpi");
        req.Headers.Add("X-Correlation-ID", "host-test-1");
        var res = await Client(reactOn: true).SendAsync(req);

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
        Assert.Equal("application/json", res.Content.Headers.ContentType?.MediaType);
        Assert.Equal("host-test-1", res.Headers.GetValues("X-Correlation-ID").Single());
        Assert.True(res.Headers.CacheControl?.NoStore);
        Assert.Contains("script-src 'self'", res.Headers.GetValues("Content-Security-Policy").Single());
        Assert.Contains("host-test-1", await res.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Report_page_still_redirects_to_login_with_either_flag()
    {
        foreach (var on in new[] { false, true })
        {
            var res = await Client(on).GetAsync("/Operations/TicketServiceStatus");
            Assert.Equal(HttpStatusCode.Redirect, res.StatusCode);
            Assert.StartsWith("/Account/Login?returnUrl=", res.Headers.Location?.OriginalString);
        }
    }
}
