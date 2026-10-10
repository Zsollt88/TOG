var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// Injected instead of DateTime.UtcNow so tests can fake the clock.
builder.Services.AddSingleton(TimeProvider.System);

var app = builder.Build();

app.MapControllers();

app.Run();

// Exposes Program to WebApplicationFactory in the Phase 2 integration tests.
public partial class Program
{
}
