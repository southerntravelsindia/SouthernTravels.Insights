namespace SouthernTravels.Insights.Models.Ins01;

// INS-01 BFF responses (/api/ins01/*), serialised camelCase for the React page. Field names and meanings follow the API
// contract docs-claude planned/contracts/INS-01.md v0.1 (TicketRow, Paging, Kpi, TicketService, VendorRow, VendorService);
// the BFF passes API values through unchanged. Dates are "yyyy-MM-dd" strings so the browser never shifts them by time zone.

public sealed record Ins01Paging(int TotalCount, int PageNumber, int PageSize, int ShowingFrom, int ShowingTo, int TotalPages);

public sealed record Ins01Page<T>(IReadOnlyList<T> Rows, Ins01Paging Paging);

public sealed record Ins01Kpi(int TotalTickets, int NewTickets, int InProgressTickets, int CompletedTickets, int CancelledTickets, decimal? NewToCompletedTatDays);

public sealed record Ins01TicketRow
{
    public int TicketRowKey { get; init; }
    public required string MbkNo { get; init; }
    public required string TicketNo { get; init; }
    public required string FileNo { get; init; }
    public required string Passenger { get; init; }
    public required string TourName { get; init; }
    public int? Pax { get; init; }
    public required string TicketStatus { get; init; }
    public string? BookingDate { get; init; }
    public required string BookingExecutiveName { get; init; }
    public required string BookingBranch { get; init; }
    public required string OpsStatus { get; init; }
    /// <summary>Comma-separated OPS branch codes, as the API returns them.</summary>
    public required string OpsBranchCodes { get; init; }
    public string? TourStartDate { get; init; }
    public string? TourEndDate { get; init; }
    public int? TourDays { get; init; }
    public int? DaysLeft { get; init; }
    public decimal TotalAmount { get; init; }
    public decimal PaidAmount { get; init; }
    public decimal BalancePending { get; init; }
    public decimal PercentPaid { get; init; }
    public int ServiceCount { get; init; }
    public int? CompletionPct { get; init; }
    public int PendingServices { get; init; }
    public int CancelledServices { get; init; }
    /// <summary>
    /// Proposed, not in contract v0.1: every service voucher-ready (enables "Download Vouchers"). Raised against the API contract.
    /// </summary>
    public bool IsVoucherEnabled { get; init; }
    public bool IsMine { get; init; }
    public bool IsCancelled { get; init; }
}

public sealed record Ins01TicketService
{
    public int ServiceRowId { get; init; }
    public int TicketRowKey { get; init; }
    public required string SvcType { get; init; }
    public required string City { get; init; }
    public required string NameOfService { get; init; }
    public required string Category { get; init; }
    public required string MealPlan { get; init; }
    public required string OpsUser { get; init; }
    public required string OpsBranch { get; init; }
    public required string OpsStatus { get; init; }
    public required string ServiceStatus { get; init; }
    public string? ConfirmationDate { get; init; }
    public required string ConfirmationNo { get; init; }
    public string? SvcStart { get; init; }
    public string? SvcEnd { get; init; }
    public int? Days { get; init; }
    public bool IsVoucherEnabled { get; init; }
}

public sealed record Ins01TicketServices(IReadOnlyList<Ins01TicketService> Services);

public sealed record Ins01VendorRow
{
    public int VendorId { get; init; }
    public required string VendorCode { get; init; }
    public required string VendorName { get; init; }
    /// <summary>Comma-separated, as the API returns them.</summary>
    public required string Cities { get; init; }
    /// <summary>Comma-separated, as the API returns them.</summary>
    public required string ServiceTypes { get; init; }
    public int Tickets { get; init; }
    public int ServiceCount { get; init; }
    public decimal TotalSaleValue { get; init; }
    public decimal VendorPayable { get; init; }
    public decimal VendorPaid { get; init; }
    public decimal BalancePending { get; init; }
    public bool IsActive { get; init; }
}

public sealed record Ins01VendorService
{
    public int ServiceRowId { get; init; }
    public int VendorId { get; init; }
    public int TicketRowKey { get; init; }
    public required string MbkNo { get; init; }
    public required string TicketNo { get; init; }
    public required string FileNo { get; init; }
    public required string Passenger { get; init; }
    public decimal GrandTotal { get; init; }
    public decimal PaidAmount { get; init; }
    public decimal BalanceAmount { get; init; }
    public decimal PaidPercent { get; init; }
    public decimal DuePercent { get; init; }
    public required string SvcType { get; init; }
    public required string City { get; init; }
    public required string NameOfService { get; init; }
    public string? StartDate { get; init; }
    public string? EndDate { get; init; }
    public int? Days { get; init; }
    public decimal Selling { get; init; }
    public decimal Payable { get; init; }
    public decimal Profit { get; init; }
    public decimal? ProfitPercent { get; init; }
    public string? ConfirmationDate { get; init; }
}

public sealed record Ins01VendorServices(IReadOnlyList<Ins01VendorService> Services);

/// <summary>Body of POST /api/ins01/ticket-services: the row keys of the expanded tickets (at most 100).</summary>
public sealed record Ins01TicketServicesRequest(IReadOnlyList<int>? TicketRowKeys, bool All);

/// <summary>Body of POST /api/ins01/vendor-services: the ids of the expanded vendors (at most 100).</summary>
public sealed record Ins01VendorServicesRequest(IReadOnlyList<int>? VendorIds, bool All);
