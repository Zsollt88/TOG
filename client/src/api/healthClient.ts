import type { HealthResponse } from '../types/health'

// Relative URL: the Vite dev proxy forwards /api to the ASP.NET Core server.
const healthUrl = '/api/health'

// Calls GET /api/health and returns the parsed body, or throws on failure.
export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {

  try {
    const response = await fetch(healthUrl, { headers: { "Accept": "application/json" }, signal });

    if (!response.ok) {
      throw new Error(`Response status: (HTTP ${response.status})`)
    }

    const result = await response.json();

    const isValid = result.hasOwnProperty("status") && result.hasOwnProperty("serverTimeUtc");

    if (!isValid) {
      throw new Error("Incorrect response");
    }
    return result
  }
  catch (error) {
    console.error(error);
    throw error;
  }

}
