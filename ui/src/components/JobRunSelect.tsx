import { useEffect, useState } from 'react'
import { fetchFlowRuns } from '../api/jobs'
import type { FlowRunOption } from '../types/jobs'

interface Props {
  label: string
  tags?: string[]
  value: string | null
  onChange: (value: string | null) => void
}

export default function JobRunSelect({ label, tags, value, onChange }: Props) {
  const [options, setOptions] = useState<FlowRunOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setOptions(await fetchFlowRuns(tags))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load runs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
        <button onClick={load} disabled={loading} style={{ fontSize: 12, padding: '2px 8px' }}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      {error && <div style={{ color: 'red', fontSize: 12, marginBottom: 4 }}>{error}</div>}
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={{ width: '100%', padding: 6 }}
        disabled={loading}
      >
        <option value="">
          {loading ? 'Loading…' : options.length === 0 ? 'No runs found' : '-- Select a run --'}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
