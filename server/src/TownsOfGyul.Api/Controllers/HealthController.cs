using Microsoft.AspNetCore.Mvc;
using TownsOfGyul.Api.Contracts;

namespace TownsOfGyul.Api.Controllers;

// Liveness probe; the client calls it on load to prove the proxy and server are wired up.
[ApiController]
[Route("api/health")]
public sealed class HealthController : ControllerBase
{
    private const string HealthyStatus = "ok";

    private readonly TimeProvider _timeProvider;

    public HealthController(TimeProvider timeProvider)
    {
        _timeProvider = timeProvider;
    }

    [HttpGet]
    public ActionResult<HealthResponse> Get()
    {
        DateTimeOffset now = _timeProvider.GetUtcNow();
        HealthResponse response = new HealthResponse(HealthyStatus, now);
        return Ok(response);
    }
}
