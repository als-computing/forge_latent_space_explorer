import { useEffect, useState } from 'react'
import { fetchJobLogs } from '../api/jobs'

interface Props {
  jobId: string
  onClose: () => void
}

export default function LogsModal({ jobId, onClose }: Props) {
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchJobLogs(jobId)
      .then(setLogs)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load logs'))
      .finally(() => setLoading(false))
  }, [jobId])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 8, width: 700, maxWidth: '90vw',
          maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid #dee2e6',
          fontWeight: 600, fontSize: '1rem',
        }}>
          Job Logs
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6c757d', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {loading && <div style={{ color: '#999', fontSize: 13 }}>Loading logs…</div>}
          {error && <div style={{ color: 'red', fontSize: 13 }}>{error}</div>}
          {!loading && !error && logs.length === 0 && (
            <div style={{ color: '#999', fontSize: 13 }}>No logs found.</div>
          )}
          {!loading && logs.length > 0 && (
            <pre style={{
              margin: 0, fontSize: 12, lineHeight: 1.5,
              whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              fontFamily: 'ui-monospace, monospace',
            }}>
              {logs.join('\n')}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
