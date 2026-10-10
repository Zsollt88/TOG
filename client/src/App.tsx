import { HealthStatus } from './components/HealthStatus'
import { useHealth } from './hooks/useHealth'

function App() {
  const health = useHealth()

  return (
    <main>
      <h1>Towns of G'yul</h1>
      <HealthStatus state={health} />
    </main>
  )
}

export default App
