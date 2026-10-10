namespace TownsOfGyul.Api.Contracts;

// Body of GET /api/health.
public sealed record HealthResponse(string Status, DateTimeOffset ServerTimeUtc);
