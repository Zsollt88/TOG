// Mirrors the server's HealthResponse DTO.
export interface HealthResponse {
  status: string
  serverTimeUtc: string
}

// Every state the health check can be in; the UI switches on `kind`.
export type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; response: HealthResponse }
  | { kind: 'error'; message: string }
