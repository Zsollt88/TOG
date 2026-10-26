import type { HealthState } from '../types/health'

interface HealthStatusProps {
  state: HealthState
}

// Shows the result of the server health check.
export function HealthStatus({ state }: HealthStatusProps) {
  if (state.kind === 'loading') {
    return <p className="health">Contacting server…</p>
  }

  if (state.kind === 'error') {
    return (
      <p className="health health--error">
        Server unreachable: <code>{state.message}</code>
      </p>
    )
  }

  return (
    <p className="health health--ok">
      Server says <code>{state.response.status}</code> at{' '}
      <code>{state.response.serverTimeUtc}</code>
    </p>
  )
}
