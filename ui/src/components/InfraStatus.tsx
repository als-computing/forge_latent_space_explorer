import { useEffect, useState } from 'react'
import { fetchInfraHealth } from '../api/infra'
import type { InfraState } from '../types/infra'

const POLL_INTERVAL_MS = 30_000

const SERVICES: { key: keyof InfraState; label: string }[] = [
  { key: 'tiled_ready', label: 'Tiled' },
  { key: 'mlflow_ready', label: 'MLflow' },
  { key: 'arroyo_ready', label: 'Arroyo' },
  { key: 'data_source_ready', label: 'Data source' },
]

export default function InfraStatus() {
  const [state, setState] = useState<InfraState | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetchInfraHealth().then(setState).catch(console.error)
    const id = setInterval(
      () => fetchInfraHealth().then(setState).catch(console.error),
      POLL_INTERVAL_MS,
    )
    return () => clearInterval(id)
  }, [])

  const ok = state ? !state.any_infra_down : null
  const color = ok === null ? '#888' : ok ? 'green' : 'red'
  const label = ok === null ? 'Checking...' : ok ? 'All systems operational' : 'Service degraded'

  return (
    <div style={{ fontSize: 13 }}>
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
        <span style={{ color }}>{label}</span>
      </button>

      {expanded && state && (
        <div style={{ marginTop: 8, paddingLeft: 16 }}>
          {SERVICES.map(({ key, label }) => {
            const ready = state[key] as boolean
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: ready ? 'green' : 'red', display: 'inline-block' }} />
                <span style={{ color: ready ? 'inherit' : 'red' }}>{label}</span>
              </div>
            )
          })}
          <div style={{ color: '#888', marginTop: 4 }}>Last checked: {state.last_checked}</div>
        </div>
      )}
    </div>
  )
}
