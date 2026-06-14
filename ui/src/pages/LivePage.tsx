import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronDown, Clock, Play, RefreshCw, Terminal } from 'lucide-react'
import { fetchInfraHealth } from '../api/infra'
import type { InfraState } from '../types/infra'

const GREEN = { border: '#1D9E75', pillBg: '#E1F5EE', pillText: '#0F6E56', dot: '#1D9E75' }
const RED   = { border: '#E24B4A', pillBg: '#FCEBEB', pillText: '#A32D2D', dot: '#E24B4A' }

type ReadyKey = 'tiled_ready' | 'mlflow_ready' | 'arroyo_ready' | 'websocket_ready'
type ErrorKey = 'tiled_error' | 'mlflow_error' | 'arroyo_error' | 'websocket_error'

interface ServiceDef {
  readyKey: ReadyKey
  errorKey: ErrorKey
  name: string
  desc: string
  readyLabel: string
}

const SERVICES: ServiceDef[] = [
  { readyKey: 'tiled_ready',   errorKey: 'tiled_error',   name: 'Tiled — results store',     desc: 'Streams processed detector data to the explorer.',       readyLabel: 'Reachable' },
  { readyKey: 'mlflow_ready',  errorKey: 'mlflow_error',  name: 'MLflow — model registry',   desc: 'Provides autoencoder and dim-reduction model artifacts.', readyLabel: 'Reachable' },
  { readyKey: 'arroyo_ready',    errorKey: 'arroyo_error',    name: 'Arroyo — stream processor', desc: 'Runs live inference and publishes results to Tiled.',  readyLabel: 'Ready'     },
  { readyKey: 'websocket_ready', errorKey: 'websocket_error', name: 'WebSocket — data source',   desc: 'Upstream detector stream feeding the arroyo operator.', readyLabel: 'Reachable' },
]

function StatusPill({ ok, readyLabel }: { ok: boolean; readyLabel: string }) {
  const c = ok ? GREEN : RED
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20,
      background: c.pillBg, color: c.pillText, whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {ok ? readyLabel : 'Unreachable'}
    </span>
  )
}

function LogBox({ ok, serviceName, errorMsg }: { ok: boolean; serviceName: string; errorMsg: string | null }) {
  return (
    <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, lineHeight: 1.8, color: 'var(--text)' }}>
      {ok ? (
        <div style={{ color: GREEN.dot }}>
          <span style={{ color: 'var(--text)', opacity: 0.5, marginRight: 8 }}>last check</span>
          INFO  — {serviceName} health OK (200)
        </div>
      ) : (
        <div style={{ color: RED.dot }}>
          <span style={{ color: 'var(--text)', opacity: 0.5, marginRight: 8 }}>last check</span>
          ERROR — {errorMsg ?? 'connection failed'}
        </div>
      )}
    </div>
  )
}

function ServiceCard({ svc, ready, errorMsg }: { svc: ServiceDef; ready: boolean; errorMsg: string | null }) {
  const [logsOpen, setLogsOpen] = useState(!ready)
  const color = ready ? GREEN.border : RED.border

  return (
    <div style={{
      background: 'var(--bg)',
      border: `0.5px solid var(--border)`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
      padding: '1rem 1.25rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-h)' }}>{svc.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 2 }}>{svc.desc}</div>
        </div>
        <StatusPill ok={ready} readyLabel={svc.readyLabel} />
      </div>

      <button
        onClick={() => setLogsOpen(o => !o)}
        style={{
          marginTop: 10, display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 12, color: 'var(--text)', background: 'none', border: 'none',
          cursor: 'pointer', padding: 0,
        }}
      >
        <Terminal size={13} />
        <span>{logsOpen ? 'Hide logs' : 'Show logs'}</span>
        <ChevronDown
          size={12}
          style={{ transform: logsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </button>

      {logsOpen && (
        <div style={{
          marginTop: 8,
          background: 'var(--code-bg)',
          border: '0.5px solid var(--border)',
          borderRadius: 6,
          padding: '0.75rem',
          maxHeight: 130,
          overflowY: 'auto',
        }}>
          <LogBox ok={ready} serviceName={svc.name} errorMsg={errorMsg} />
        </div>
      )}
    </div>
  )
}

const AUTO_RECHECK_MS = 60_000

export default function LivePage() {
  const [infra, setInfra] = useState<InfraState | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const runCheck = useCallback(async () => {
    setChecking(true)
    setError(null)
    try {
      const state = await fetchInfraHealth()
      setInfra(state)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Health check failed')
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    runCheck()
    intervalRef.current = setInterval(runCheck, AUTO_RECHECK_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [runCheck])

  const allOk = infra ? !infra.any_infra_down : false
  const downCount = infra
    ? SERVICES.filter(s => !infra[s.readyKey]).length
    : 0

  return (
    <div style={{ padding: '1.5rem', maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-h)' }}>Live mode</span>
            <span style={{
              fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20,
              background: 'var(--code-bg)', border: '0.5px solid var(--border)',
              color: 'var(--text)', letterSpacing: '0.03em',
            }}>
              pre-flight check
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 2 }}>
            All services must be reachable before streaming can start.
          </div>
        </div>
        {infra && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text)', opacity: 0.7 }}>
            <Clock size={13} />
            Checked {infra.last_checked}
          </div>
        )}
      </div>

      {/* Status banner */}
      {error ? (
        <div style={{
          borderRadius: 10, padding: '0.875rem 1.25rem', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: RED.pillBg, border: `0.5px solid #F09595`,
        }}>
          <AlertCircle size={18} style={{ color: RED.pillText, flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-h)' }}>
            <strong style={{ fontWeight: 500 }}>Health check failed.</strong> {error}
          </div>
        </div>
      ) : infra && (
        <div style={{
          borderRadius: 10, padding: '0.875rem 1.25rem', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: allOk ? GREEN.pillBg : RED.pillBg,
          border: `0.5px solid ${allOk ? '#5DCAA5' : '#F09595'}`,
        }}>
          {allOk
            ? <CheckCircle2 size={18} style={{ color: GREEN.pillText, flexShrink: 0, marginTop: 1 }} />
            : <AlertCircle  size={18} style={{ color: RED.pillText,   flexShrink: 0, marginTop: 1 }} />
          }
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-h)' }}>
            {allOk
              ? <><strong style={{ fontWeight: 500 }}>All services reachable.</strong> Ready to start live mode.</>
              : <><strong style={{ fontWeight: 500 }}>{downCount} service{downCount !== 1 ? 's' : ''} unavailable.</strong> Resolve the issue{downCount !== 1 ? 's' : ''} below, then re-check before starting live mode.</>
            }
          </div>
        </div>
      )}

      {/* Service cards */}
      {infra && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: '1.25rem' }}>
          {SERVICES.map(svc => (
            <ServiceCard key={svc.readyKey} svc={svc} ready={infra[svc.readyKey]} errorMsg={infra[svc.errorKey]} />
          ))}
        </div>
      )}

      {/* Divider */}
      <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '1.25rem 0' }} />

      {/* Action row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          disabled={!allOk}
          title={allOk ? undefined : 'Fix all service connections first'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: GREEN.border, color: '#fff', border: 'none', borderRadius: 6,
            padding: '0 1.25rem', height: 38, fontSize: 14, fontWeight: 500,
            cursor: allOk ? 'pointer' : 'not-allowed',
            opacity: allOk ? 1 : 0.45,
            transition: 'opacity 0.15s, background 0.15s',
          }}
        >
          <Play size={15} />
          Start live mode
        </button>

        <button
          onClick={runCheck}
          disabled={checking}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'transparent', color: 'var(--text)',
            border: '0.5px solid var(--border)', borderRadius: 6,
            padding: '0 1.25rem', height: 38, fontSize: 14, cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} style={{ animation: checking ? 'spin 0.8s linear infinite' : 'none' }} />
          {checking ? 'Checking…' : 'Re-check services'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text)', opacity: 0.6, marginLeft: 'auto' }}>
          <Clock size={12} />
          Auto re-checks every 60 s
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
