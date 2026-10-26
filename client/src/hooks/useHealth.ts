import { useEffect, useState } from 'react'
import { fetchHealth } from '../api/healthClient'
import type { HealthState } from '../types/health'

// Runs the health check once on mount.
export function useHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    fetchHealth(controller.signal)
      .then((response) => {
        setState({ kind: 'ok', response })
      })
      .catch((error: unknown) => {
        // StrictMode unmounts once in dev; ignore that cancelled request.
        if (controller.signal.aborted) {
          return
        }
        const message = error instanceof Error ? error.message : String(error)
        setState({ kind: 'error', message })
      })

    return () => {
      controller.abort()
    }
  }, [])

  return state
}
