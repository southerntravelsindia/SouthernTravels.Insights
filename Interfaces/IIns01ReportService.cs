using SouthernTravels.Insights.Models.Ins01;

namespace SouthernTravels.Insights.Interfaces;

/// <summary>
/// Data behind the INS-01 BFF endpoints (/api/ins01/*). Phase 4a serves the synthetic sample set
/// (<see cref="Services.Ins01SampleReportService"/>); Phase 4 adds the STPLCostSheetAPI implementation built from the API contract.
/// The caller is identified from the server session only; <paramref name="mineOnly"/> is the only scope input from the browser.
/// </summary>
public interface IIns01ReportService
{
    Task<Ins01Kpi> GetKpiAsync(bool mineOnly, CancellationToken ct);
    Task<Ins01Page<Ins01TicketRow>> GetTicketsAsync(bool mineOnly, int page, CancellationToken ct);
    Task<Ins01Page<Ins01VendorRow>> GetVendorsAsync(bool mineOnly, int page, CancellationToken ct);
    Task<Ins01TicketServices> GetTicketServicesAsync(IReadOnlyList<int> ticketRowKeys, bool mineOnly, CancellationToken ct);
    Task<Ins01VendorServices> GetVendorServicesAsync(IReadOnlyList<int> vendorIds, bool mineOnly, CancellationToken ct);
}
