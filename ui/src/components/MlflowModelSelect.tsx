import { useEffect, useState } from 'react'
import { fetchMlflowModels } from '../api/jobs'
import type { MlflowModelOption } from '../types/jobs'

interface Props {
  value: string | null
  onChange: (value: string | null) => void
}

export default function MlflowModelSelect({ value, onChange }: Props) {
  const [options, setOptions] = useState<MlflowModelOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMlflowModels()
      setOptions(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load models')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <label style={{ fontWeight: 600 }}>MLflow Model</label>
        <button onClick={load} disabled={loading} style={{ fontSize: 12, padding: '2px 8px' }}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      {error && <div style={{ color: 'red', fontSize: 13, marginBottom: 8 }}>{error}</div>}
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={{ width: '100%', padding: 6 }}
        disabled={loading || options.length === 0}
      >
        <option value="">
          {loading ? 'Loading…' : options.length === 0 ? 'No models available' : '-- Select a model --'}
        </option>
        {options.map((opt) => (
          <option key={opt.value ?? opt.label} value={opt.value ?? ''}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
