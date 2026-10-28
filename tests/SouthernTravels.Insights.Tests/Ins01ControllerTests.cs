using System.Reflection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SouthernTravels.Insights.Common;
using SouthernTravels.Insights.Controllers.Api;
using SouthernTravels.Insights.Models.Ins01;
using SouthernTravels.Insights.Services;

namespace SouthernTravels.Insights.Tests;

public class Ins01ControllerTests
{
    private static Ins01Controller Controller() => new(new Ins01SampleReportService())
    {
        ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { TraceIdentifier = "corr-2" } },
    };

    [Fact]
    public void Controller_is_gated_needs_antiforgery_on_post_and_is_never_cached()
    {
        var t = typeof(Ins01Controller);
        Assert.NotNull(t.GetCustomAttribute<AutoValidateAntiforgeryTokenAttribute>());
        Assert.NotNull(t.GetCustomAttribute<FeatureGateAttribute>());
        var cache = t.GetCustomAttribute<ResponseCacheAttribute>();
        Assert.NotNull(cache);
        Assert.True(cache.NoStore);
        Assert.Equal("api/ins01", t.GetCustomAttribute<RouteAttribute>()?.Template);
    }

    [Fact]
    public void No_endpoint_takes_a_user_branch_or_executive_from_the_browser()
    {
        var names = typeof(Ins01Controller).GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .SelectMany(m => m.GetParameters()).Select(p => p.ParameterType == typeof(CancellationToken) ? "" : p.Name!)
            .Concat(typeof(Ins01TicketServicesRequest).GetProperties().Select(p => p.Name))
            .Concat(typeof(Ins01VendorServicesRequest).GetProperties().Select(p => p.Name));
        Assert.DoesNotContain(names, n => n.Contains("user", StringComparison.OrdinalIgnoreCase)
            || n.Contains("branch", StringComparison.OrdinalIgnoreCase) || n.Contains("exec", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Drill_down_batch_must_have_between_1_and_100_keys()
    {
        var empty = await Controller().TicketServices(new Ins01TicketServicesRequest(Array.Empty<int>(), false), default);
        Assert.IsType<BadRequestObjectResult>(empty.Result);

        var tooMany = await Controller().VendorServices(new Ins01VendorServicesRequest(Enumerable.Range(1, 101).ToList(), false), default);
        var bad = Assert.IsType<BadRequestObjectResult>(tooMany.Result);
        Assert.Contains("corr-2", System.Text.Json.JsonSerializer.Serialize(bad.Value));

        var ok = await Controller().TicketServices(new Ins01TicketServicesRequest(Enumerable.Range(0, 100).ToList(), true), default);
        Assert.NotEmpty(ok.Value!.Services);
    }

    [Fact]
    public async Task Page_below_one_is_treated_as_page_one()
    {
        var r = await Controller().Tickets(all: 1, page: 0, default);
        Assert.Equal(1, r.Value!.Paging.PageNumber);
    }
}

public class Ins01SampleReportServiceTests
{
    private readonly Ins01SampleReportService _svc = new();

    [Fact]
    public async Task Mine_only_returns_only_my_tickets()
    {
        var mine = await _svc.GetTicketsAsync(mineOnly: true, page: 1, default);
        var all = await _svc.GetTicketsAsync(mineOnly: false, page: 1, default);
        Assert.All(mine.Rows, r => Assert.True(r.IsMine));
        Assert.True(all.Paging.TotalCount > mine.Paging.TotalCount);
        Assert.True(all.Rows[0].IsMine); // mine first
    }

    [Fact]
    public async Task Paging_returns_the_last_page_when_asked_beyond_it()
    {
        var all = await _svc.GetTicketsAsync(false, 1, default);
        var beyond = await _svc.GetTicketsAsync(false, 999, default);
        Assert.Equal(all.Paging.TotalPages, beyond.Paging.PageNumber);
        Assert.Equal(all.Paging.TotalCount, beyond.Paging.ShowingTo);
        Assert.Equal(Ins01SampleReportService.PageSize, beyond.Paging.PageSize);
    }

    [Fact]
    public async Task Kpi_states_add_up_and_drill_downs_respect_scope()
    {
        var k = await _svc.GetKpiAsync(false, default);
        Assert.Equal(k.TotalTickets, k.NewTickets + k.InProgressTickets + k.CompletedTickets);

        var notMine = (await _svc.GetTicketsAsync(false, 1, default)).Rows.First(r => !r.IsMine).TicketRowKey;
        Assert.Empty((await _svc.GetTicketServicesAsync(new[] { notMine }, mineOnly: true, default)).Services);
        Assert.NotEmpty((await _svc.GetTicketServicesAsync(new[] { notMine }, mineOnly: false, default)).Services);
    }

    [Fact]
    public async Task Dates_are_plain_iso_strings()
    {
        var row = (await _svc.GetTicketsAsync(false, 1, default)).Rows[0];
        Assert.Matches(@"^\d{4}-\d{2}-\d{2}$", row.TourStartDate!);
    }
}
