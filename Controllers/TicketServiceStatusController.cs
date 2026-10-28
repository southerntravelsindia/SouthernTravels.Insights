using Microsoft.AspNetCore.Mvc;
using SouthernTravels.Insights.Interfaces;
using SouthernTravels.Insights.Reports;

namespace SouthernTravels.Insights.Controllers;

/// <summary>Ticket &amp; Service Status: tickets with their services, ops status and the Show all link. Filter lists come from the API.</summary>
[Route("Operations/TicketServiceStatus")]
public class TicketServiceStatusController : BaseController
{
    private readonly IOperationService _operationService;
    private readonly IConfiguration _configuration;

    public TicketServiceStatusController(IOperationService operationService, IConfiguration configuration)
    {
        _operationService = operationService;
        _configuration = configuration;
    }

    [HttpGet("")]
    public async Task<IActionResult> Index()
    {
        // INS-01 React page (TSD §2.2): the shell keeps _Layout and mounts the bundle; flag off → the Razor page below, unchanged.
        if (_configuration.GetValue<bool>("FeatureFlags:INS01_React"))
            return View("IndexReact", TicketServiceStatusReport.Shell(Q));

        // Filter dropdowns from Reports/GetOperationsReportFilters (the built-in lists if the API fails).
        var result = await _operationService.GetOperationsReportFiltersAsync();
        var filters = CommonFilters.TicketServiceFrom(result.Success ? result.Data : null);

        return View(TicketServiceStatusReport.Build(Q, filters));
    }
}
