using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace SouthernTravels.Insights.Common;

/// <summary>Answers 404 unless the configuration flag (e.g. "FeatureFlags:INS01_React") is true. Missing flag = off.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class FeatureGateAttribute(string flag) : Attribute, IResourceFilter
{
    public void OnResourceExecuting(ResourceExecutingContext context)
    {
        var config = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        if (!config.GetValue<bool>(flag)) context.Result = new NotFoundResult();
    }

    public void OnResourceExecuted(ResourceExecutedContext context) { }
}
