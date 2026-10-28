using System.Globalization;
using SouthernTravels.Insights.Data;
using SouthernTravels.Insights.Infrastructure;
using SouthernTravels.Insights.Interfaces;
using SouthernTravels.Insights.Models;
using SouthernTravels.Insights.Models.Ins01;

namespace SouthernTravels.Insights.Services;

/// <summary>
/// INS-01 Phase 4a: the synthetic sample set (<see cref="SampleData"/>) shaped like the API contract, so the React page renders
/// the same rows as the Razor page. Figures follow the Razor page's rules (Reports/TicketServiceStatusReport.cs), not the v1.3
/// rules, so the two pages can be compared screen for screen; the live figures arrive with the API service in Phase 4.
/// </summary>
public sealed class Ins01SampleReportService : IIns01ReportService
{
    public const int PageSize = 10;

    private static string Iso(DateTime d) => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    private static string? Iso(DateTime? d) => d is null ? null : Iso(d.Value);
    private static decimal Pct0(double part, double whole) => whole == 0 ? 0 : Fmt.Round(part / whole * 100);
    private static int VendorNo(string vendorId) => int.Parse(vendorId.AsSpan(1), CultureInfo.InvariantCulture);

    /// <summary>Tickets in scope: mine first, then tour start (the Razor order).</summary>
    private static List<Ticket> Scope(bool mineOnly) => SampleData.Tickets
        .Where(t => !mineOnly || t.IsAssignedTo(SampleData.Me))
        .OrderBy(t => t.IsAssignedTo(SampleData.Me) ? 0 : 1).ThenBy(t => t.Start)
        .ToList();

    private static Ins01Page<T> Paginate<T>(IReadOnlyList<T> rows, int requested)
    {
        var pages = Math.Max(1, (int)Math.Ceiling(rows.Count / (double)PageSize));
        var page = Math.Clamp(requested, 1, pages);
        var slice = rows.Skip((page - 1) * PageSize).Take(PageSize).ToList();
        var from = rows.Count == 0 ? 0 : (page - 1) * PageSize + 1;
        return new Ins01Page<T>(slice, new Ins01Paging(rows.Count, page, PageSize, from, from == 0 ? 0 : from + slice.Count - 1, pages));
    }

    public Task<Ins01Kpi> GetKpiAsync(bool mineOnly, CancellationToken ct)
    {
        var tk = Scope(mineOnly);
        var tats = tk.SelectMany(t => t.Services).Where(s => s.OpsStatus == "Completed" && s.Status == "Confirmed" && s.Tat is not null).Select(s => s.Tat!.Value).ToList();
        return Task.FromResult(new Ins01Kpi(
            tk.Count,
            tk.Count(t => t.OverallOps == "New"),
            tk.Count(t => t.OverallOps == "In Progress"),
            tk.Count(t => t.OverallOps == "Completed"),
            tk.Count(IsCancelled),
            tats.Count > 0 ? Math.Round((decimal)tats.Average(), 1, MidpointRounding.AwayFromZero) : null));
    }

    private static bool IsCancelled(Ticket t) => t.Status == "Cancelled" || t.Services.All(s => s.Status == "Cancelled");

    public Task<Ins01Page<Ins01TicketRow>> GetTicketsAsync(bool mineOnly, int page, CancellationToken ct)
    {
        var rows = Scope(mineOnly).Select(t =>
        {
            var active = t.Services.Where(s => s.Status != "Cancelled").ToList();
            return new Ins01TicketRow
            {
                TicketRowKey = t.Index,
                MbkNo = t.Mbk,
                TicketNo = t.No,
                FileNo = t.File,
                Passenger = t.PaxName,
                TourName = t.Tour,
                Pax = t.Pax,
                TicketStatus = t.Status,
                BookingDate = Iso(t.Booked),
                BookingExecutiveName = t.Exec,
                BookingBranch = t.Branch,
                OpsStatus = t.OverallOps,
                OpsBranchCodes = string.Join(",", t.Services.Select(s => s.OpsBranch).Distinct()),
                TourStartDate = Iso(t.Start),
                TourEndDate = Iso(t.End),
                TourDays = t.Days,
                DaysLeft = (int)Fmt.Round((t.Start - SampleData.Today).TotalDays),
                TotalAmount = (decimal)t.Grand,
                PaidAmount = (decimal)t.Paid,
                BalancePending = (decimal)t.Balance,
                PercentPaid = Pct0(t.Paid, t.Grand),
                ServiceCount = t.Services.Count,
                CompletionPct = active.Count == 0 ? null : (int)Fmt.Round(active.Count(s => s.OpsStatus == "Completed") * 100.0 / active.Count),
                PendingServices = active.Count(s => s.OpsStatus != "Completed"),
                CancelledServices = t.Services.Count - active.Count,
                IsVoucherEnabled = t.VouchersReady,
                IsMine = t.IsAssignedTo(SampleData.Me),
                IsCancelled = IsCancelled(t),
            };
        }).ToList();
        return Task.FromResult(Paginate(rows, page));
    }

    public Task<Ins01Page<Ins01VendorRow>> GetVendorsAsync(bool mineOnly, int page, CancellationToken ct)
    {
        var rows = Scope(mineOnly).SelectMany(t => t.Services)
            .GroupBy(s => s.VendorId)
            .OrderBy(g => g.Key, StringComparer.Ordinal)
            .Select(g =>
            {
                var payable = g.Sum(s => s.Payable);
                var balance = g.Sum(s => s.VendorBalance);
                return new Ins01VendorRow
                {
                    VendorId = VendorNo(g.Key),
                    VendorCode = g.Key,
                    VendorName = SampleData.VendorName(g.Key),
                    Cities = string.Join(",", g.Select(s => s.City).Distinct()),
                    ServiceTypes = string.Join(",", g.Select(s => s.Type).Distinct()),
                    ServiceCount = g.Count(),
                    TotalSaleValue = (decimal)g.Sum(s => s.Sell),
                    VendorPayable = (decimal)payable,
                    VendorPaid = (decimal)(payable - balance),
                    BalancePending = (decimal)balance,
                    IsActive = g.Any(s => s.Status != "Cancelled"),
                };
            }).ToList();

        // Distinct tickets per vendor (the services alone don't carry their ticket).
        var tickets = Scope(mineOnly).SelectMany(t => t.Services.Select(s => (s.VendorId, t.No))).Distinct()
            .GroupBy(x => x.VendorId).ToDictionary(g => VendorNo(g.Key), g => g.Count());
        rows = rows.Select(r => r with { Tickets = tickets[r.VendorId] }).ToList();
        return Task.FromResult(Paginate(rows, page));
    }

    public Task<Ins01TicketServices> GetTicketServicesAsync(IReadOnlyList<int> ticketRowKeys, bool mineOnly, CancellationToken ct)
    {
        var keys = ticketRowKeys.ToHashSet();
        var services = Scope(mineOnly).Where(t => keys.Contains(t.Index))
            .SelectMany(t => t.Services.Select((s, si) => new Ins01TicketService
            {
                ServiceRowId = t.Index * 100 + si,
                TicketRowKey = t.Index,
                SvcType = s.Type,
                City = s.City,
                NameOfService = s.Name,
                Category = s.Category,
                MealPlan = s.Meal,
                OpsUser = s.Ops,
                OpsBranch = s.OpsBranch,
                OpsStatus = s.OpsStatus,
                ServiceStatus = s.Status,
                ConfirmationDate = Iso(s.Conf),
                ConfirmationNo = s.ConfNo,
                SvcStart = Iso(s.Start),
                SvcEnd = Iso(s.End),
                Days = s.Days,
                IsVoucherEnabled = s.VoucherReady,
            })).ToList();
        return Task.FromResult(new Ins01TicketServices(services));
    }

    public Task<Ins01VendorServices> GetVendorServicesAsync(IReadOnlyList<int> vendorIds, bool mineOnly, CancellationToken ct)
    {
        var ids = vendorIds.ToHashSet();
        var services = Scope(mineOnly)
            .SelectMany(t => t.Services.Select((s, si) => (T: t, S: s, Si: si)))
            .Where(x => ids.Contains(VendorNo(x.S.VendorId)))
            .Select(x => new Ins01VendorService
            {
                ServiceRowId = x.T.Index * 100 + x.Si,
                VendorId = VendorNo(x.S.VendorId),
                TicketRowKey = x.T.Index,
                MbkNo = x.T.Mbk,
                TicketNo = x.T.No,
                FileNo = x.T.File,
                Passenger = x.T.PaxName,
                GrandTotal = (decimal)x.T.Grand,
                PaidAmount = (decimal)x.T.Paid,
                BalanceAmount = (decimal)x.T.Balance,
                PaidPercent = x.T.Grand == 0 ? 0 : Math.Round((decimal)(x.T.Paid / x.T.Grand * 100), MidpointRounding.AwayFromZero),
                DuePercent = x.T.Grand == 0 ? 0 : Math.Round((decimal)(x.T.Balance / x.T.Grand * 100), MidpointRounding.AwayFromZero),
                SvcType = x.S.Type,
                City = x.S.City,
                NameOfService = x.S.Name,
                StartDate = Iso(x.S.Start),
                EndDate = Iso(x.S.End),
                Days = x.S.Days,
                Selling = (decimal)x.S.Sell,
                Payable = (decimal)x.S.Payable,
                Profit = (decimal)(x.S.Sell - x.S.Payable),
                ProfitPercent = x.S.Sell == 0 ? null : Math.Round((decimal)((x.S.Sell - x.S.Payable) / x.S.Sell * 100), 1, MidpointRounding.AwayFromZero),
                ConfirmationDate = Iso(x.S.Conf),
            }).ToList();
        return Task.FromResult(new Ins01VendorServices(services));
    }
}
