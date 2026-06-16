import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchFlowRuns, fetchJobLogs } from '../api/jobs'
import { useJobStatus } from '../hooks/useJobStatus'
import type { FlowRunOption } from '../types/jobs'

export interface ActiveJobEntry {
  jobId: string
  kind: 'latent-space' | 'clustering'
  startedAt: number
}

interface EnrichedRun extends FlowRunOption {
  kind: 'latent-space' | 'clustering'
}

const C = {
  panel: '#1e2329',
  panel2: '#252b33',
  border: 'rgba(255,255,255,0.1)',
  borderHi: 'rgba(255,255,255,0.2)',
  text: '#e2e8f0',
  textMuted: 'rgba(255,255,255,0.65)',
  textDim: 'rgba(255,255,255,0.4)',
  mono: "'IBM Plex Mono', monospace",
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.12)',
  greenBorder: 'rgba(34,197,94,0.3)',
  amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.12)',
  amberBorder: 'rgba(245,158,11,0.3)',
  red: '#ef4444',
  redBg: 'rgba(239,68,68,0.1)',
  redBorder: 'rgba(239,68,68,0.22)',
  accent: '#4f8ef7',
}

function formatElapsed(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

function formatTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return dateStr
  }
}

const kindLabel = (kind: 'latent-space' | 'clustering') =>
  kind === 'latent-space' ? 'Dim Reduction' : 'Clustering'

// ── Inline log lines ─────────────────────────────────────────────────
function LogLines({ jobId }: { jobId: string }) {
  const [lines, setLines] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchJobLogs(jobId)
      .then(setLines)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [jobId])

  if (loading) return <div style={{ color: C.textDim }}>Loading…</div>
  if (error) return <div style={{ color: C.red }}>Failed to load logs.</div>
  if (lines.length === 0) return <div style={{ color: C.textDim }}>No logs yet.</div>
  return (
    <>
      {lines.map((line, i) => (
        <div key={i} style={{ marginBottom: 1 }}>{line}</div>
      ))}
    </>
  )
}

// ── Running/just-terminated job card ─────────────────────────────────
interface ActiveJobCardProps {
  job: ActiveJobEntry
  allRuns: EnrichedRun[]
  onTerminate: (jobId: string, isFailed: boolean) => void
}

function ActiveJobCard({ job, allRuns, onTerminate }: ActiveJobCardProps) {
  const status = useJobStatus(job.jobId, job.kind, '')
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - job.startedAt) / 1000))
  const [logsPanelOpen, setLogsPanelOpen] = useState(false)
  const terminatedRef = useRef(false)

  useEffect(() => {
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - job.startedAt) / 1000))
    }, 1000)
    return () => clearInterval(iv)
  }, [job.startedAt])

  useEffect(() => {
    if (status?.ready && !terminatedRef.current) {
      terminatedRef.current = true
      const isFailed = status.state === 'FAILED' || status.state === 'CRASHED'
      onTerminate(job.jobId, isFailed)
    }
  }, [status?.ready]) // eslint-disable-line react-hooks/exhaustive-deps

  const isFailed = status?.state === 'FAILED' || status?.state === 'CRASHED'
  const isReady = status?.ready ?? false
  const isRunning = !isReady

  const statusColor = isFailed ? C.red : isReady ? C.green : C.amber
  const statusBorder = isFailed ? C.redBorder : isReady ? C.greenBorder : C.amberBorder
  const statusText = isFailed ? 'FAILED' : isReady ? 'COMPLETED' : 'RUNNING'

  const run = allRuns.find(r => r.value === job.jobId)
  const displayName = run?.label ?? `${kindLabel(job.kind)} job`
  const algorithm = run?.algorithm ?? '—'

  return (
    <div style={{
      background: C.panel2,
      border: `1px solid ${statusBorder}`,
      borderRadius: 8,
      padding: '12px 14px',
      marginBottom: 8,
    }}>
      <style>{`
        @keyframes jsp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes jsp-bar {
          0% { transform: translateX(-100%); width: 40%; }
          50% { width: 60%; }
          100% { transform: translateX(280%); width: 40%; }
        }
      `}</style>

      {/* Status + name + elapsed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: statusColor,
          flexShrink: 0, display: 'inline-block',
          ...(isRunning ? { animation: 'jsp-pulse 1.2s ease-in-out infinite' } : {}),
        }} />
        <span style={{
          fontFamily: C.mono, fontSize: 11, fontWeight: 600,
          letterSpacing: '.06em', color: statusColor,
        }}>
          {statusText}
        </span>
        <span style={{
          fontFamily: C.mono, fontSize: 11, color: C.text,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {displayName}
        </span>
        <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim, flexShrink: 0 }}>
          {formatElapsed(elapsed)}
        </span>
      </div>

      {/* Metadata */}
      <div style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim, marginBottom: isRunning ? 8 : 6 }}>
        {kindLabel(job.kind)} · {algorithm} · job {job.jobId.slice(0, 8)}…
      </div>

      {/* Indeterminate progress bar (running only) */}
      {isRunning && (
        <div style={{
          height: 3, background: 'rgba(245,158,11,0.15)',
          borderRadius: 2, overflow: 'hidden', marginBottom: 10,
        }}>
          <div style={{
            height: '100%', background: C.amber, borderRadius: 2,
            animation: 'jsp-bar 2.2s ease-in-out infinite',
          }} />
        </div>
      )}

      {/* Buttons row */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          onClick={() => setLogsPanelOpen(o => !o)}
          style={{
            padding: '3px 10px', border: `1px solid ${C.border}`, borderRadius: 4,
            background: 'transparent', color: C.textMuted,
            fontFamily: C.mono, fontSize: 9, cursor: 'pointer', letterSpacing: '.06em',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = C.borderHi)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
        >
          {logsPanelOpen ? '▼ Hide logs' : '▶ Show logs'}
        </button>
        {isRunning && (
          <button
            style={{
              marginLeft: 'auto', padding: '3px 10px',
              border: `1px solid ${C.redBorder}`, borderRadius: 4,
              background: 'transparent', color: C.red,
              fontFamily: C.mono, fontSize: 9, cursor: 'pointer', letterSpacing: '.06em',
            }}
          >
            ✕ Cancel
          </button>
        )}
      </div>

      {/* Inline log panel */}
      {logsPanelOpen && (
        <div style={{
          marginTop: 10,
          background: 'rgba(0,0,0,0.3)',
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          padding: '8px 10px',
          fontFamily: C.mono, fontSize: 10, color: C.textDim, lineHeight: 1.7,
          maxHeight: 120, overflowY: 'auto',
        }}>
          <LogLines jobId={job.jobId} />
        </div>
      )}
    </div>
  )
}

// ── Past (completed / failed) job card ───────────────────────────────
interface PastJobCardProps {
  run: EnrichedRun
  onOpenInExplore?: (jobId: string) => void
}

function PastJobCard({ run, onOpenInExplore }: PastJobCardProps) {
  const [logsPanelOpen, setLogsPanelOpen] = useState(false)

  const isFailed = run.state === 'Failed' || run.state === 'Crashed'
  const isCompleted = run.state === 'Completed'

  const dotColor = isFailed ? C.red : isCompleted ? C.green : C.textDim
  const borderColor = isFailed ? C.redBorder : C.border

  return (
    <div style={{
      background: C.panel2,
      border: `1px solid ${borderColor}`,
      borderRadius: 6,
      padding: '10px 12px',
      marginBottom: 8,
      opacity: isFailed ? 0.75 : 1,
    }}>
      {/* Status + name + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: dotColor,
          flexShrink: 0, display: 'inline-block',
        }} />
        {run.state && (
          <span style={{
            fontFamily: C.mono, fontSize: 10, fontWeight: 600, letterSpacing: '.06em',
            color: dotColor,
          }}>
            {isFailed ? 'FAILED' : isCompleted ? 'COMPLETED' : run.state.toUpperCase()}
          </span>
        )}
        <span style={{
          fontFamily: C.mono, fontSize: 10, color: C.text,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {run.label}
        </span>
        <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, flexShrink: 0 }}>
          {formatTime(run.date)}
        </span>
      </div>

      {/* Metadata */}
      <div style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, marginBottom: 6 }}>
        {kindLabel(run.kind)} · {run.algorithm} · {run.project_name || run.value.slice(0, 8) + '…'}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 5 }}>
        <button
          onClick={() => setLogsPanelOpen(o => !o)}
          style={{
            padding: '3px 8px', border: `1px solid ${C.border}`, borderRadius: 3,
            background: 'transparent', color: C.textMuted,
            fontFamily: C.mono, fontSize: 9, cursor: 'pointer', letterSpacing: '.04em',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = C.borderHi)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
        >
          Logs
        </button>
        {run.kind === 'latent-space' && onOpenInExplore && (
          <button
            onClick={() => onOpenInExplore(run.value)}
            style={{
              padding: '3px 8px',
              border: '1px solid rgba(79,142,247,0.3)', borderRadius: 3,
              background: 'transparent', color: C.accent,
              fontFamily: C.mono, fontSize: 9, cursor: 'pointer', letterSpacing: '.04em',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,142,247,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Open in Explore →
          </button>
        )}
        {isFailed && (
          <button
            style={{
              padding: '3px 8px',
              border: `1px solid ${C.greenBorder}`, borderRadius: 3,
              background: 'transparent', color: C.green,
              fontFamily: C.mono, fontSize: 9, cursor: 'pointer', letterSpacing: '.04em',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.greenBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            ↺ Retry
          </button>
        )}
      </div>

      {/* Inline logs */}
      {logsPanelOpen && (
        <div style={{
          marginTop: 10,
          background: 'rgba(0,0,0,0.3)',
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          padding: '8px 10px',
          fontFamily: C.mono, fontSize: 10, color: C.textDim, lineHeight: 1.7,
          maxHeight: 120, overflowY: 'auto',
        }}>
          <LogLines jobId={run.value} />
        </div>
      )}
    </div>
  )
}

const PAGE_SIZE = 10

// ── Main panel ───────────────────────────────────────────────────────
interface Props {
  activeJobs: ActiveJobEntry[]
}

export default function JobStatusPanel({ activeJobs }: Props) {
  const navigate = useNavigate()
  const [allRuns, setAllRuns] = useState<EnrichedRun[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  // jobId → true=failed, false=completed
  const [terminalStates, setTerminalStates] = useState<Map<string, boolean>>(new Map())
  const fetchRunsRef = useRef<(() => void) | null>(null)
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null)

  const fetchRuns = useCallback(() => {
    Promise.all([
      fetchFlowRuns(['latent-space-explorer', 'latent-space']),
      fetchFlowRuns(['latent-space-explorer', 'clustering']),
    ])
      .then(([dr, cl]) => {
        setAllRuns([
          ...dr.map(r => ({ ...r, kind: 'latent-space' as const })),
          ...cl.map(r => ({ ...r, kind: 'clustering' as const })),
        ])
        setInitialLoading(false)
      })
      .catch(() => setInitialLoading(false))
  }, [])

  fetchRunsRef.current = fetchRuns

  useEffect(() => {
    fetchRuns()
    const iv = setInterval(fetchRuns, 15_000)
    return () => clearInterval(iv)
  }, [fetchRuns])

  useEffect(() => {
    if (!sentinelEl) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount(c => c + PAGE_SIZE) },
      { threshold: 0.1 },
    )
    observer.observe(sentinelEl)
    return () => observer.disconnect()
  }, [sentinelEl])

  function handleTerminate(jobId: string, isFailed: boolean) {
    setTerminalStates(prev => new Map([...prev, [jobId, isFailed]]))
    // Give Prefect a moment to record the result, then refresh history
    setTimeout(() => fetchRunsRef.current?.(), 2_500)
  }

  const runningJobIds = new Set(
    activeJobs.filter(j => !terminalStates.has(j.jobId)).map(j => j.jobId)
  )
  const runningJobs = activeJobs.filter(j => runningJobIds.has(j.jobId))

  // Past jobs: all fetched runs, newest first, excluding still-running ones
  const pastJobs = [...allRuns]
    .filter(r => !runningJobIds.has(r.value))
    .sort((a, b) => b.date.localeCompare(a.date))

  const runningCount = runningJobs.length
  const failedCount = pastJobs.filter(r => r.state === 'Failed' || r.state === 'Crashed').length
  const completedCount = pastJobs.filter(r => r.state === 'Completed').length

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: C.panel,
      borderRadius: 6,
      border: `1px solid ${C.border}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 14px', height: 34,
        borderBottom: `1px solid ${C.border}`,
        background: 'rgba(0,0,0,0.15)',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', color: C.textMuted }}>
          Job Status
        </span>
        {runningCount > 0 && (
          <span style={{
            fontFamily: C.mono, fontSize: 10,
            background: C.amberBg, color: C.amber,
            border: `1px solid ${C.amberBorder}`,
            borderRadius: 3, padding: '1px 6px',
          }}>
            ● {runningCount} running
          </span>
        )}
        {completedCount > 0 && (
          <span style={{
            fontFamily: C.mono, fontSize: 10,
            background: C.greenBg, color: C.green,
            border: `1px solid ${C.greenBorder}`,
            borderRadius: 3, padding: '1px 6px',
          }}>
            {completedCount} completed
          </span>
        )}
        {failedCount > 0 && (
          <span style={{
            fontFamily: C.mono, fontSize: 10,
            background: C.redBg, color: C.red,
            border: `1px solid ${C.redBorder}`,
            borderRadius: 3, padding: '1px 6px',
          }}>
            {failedCount} failed
          </span>
        )}
      </div>

      {/* Running jobs section */}
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        {runningJobs.length === 0 ? (
          <div style={{ fontFamily: C.mono, fontSize: 11, color: C.textDim }}>
            No running jobs
          </div>
        ) : (
          runningJobs.map(job => (
            <ActiveJobCard
              key={job.jobId}
              job={job}
              allRuns={allRuns}
              onTerminate={handleTerminate}
            />
          ))
        )}
      </div>

      {/* Past jobs section */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <div style={{
          fontFamily: C.mono, fontSize: 9, color: C.textDim,
          letterSpacing: '.08em', textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          Past jobs
        </div>

        {initialLoading ? (
          <div style={{ fontFamily: C.mono, fontSize: 11, color: C.textDim }}>
            Loading…
          </div>
        ) : pastJobs.length === 0 ? (
          <div style={{ fontFamily: C.mono, fontSize: 11, color: C.textDim }}>
            No past jobs
          </div>
        ) : (
          <>
            {pastJobs.slice(0, visibleCount).map(run => (
              <PastJobCard
                key={run.value}
                run={run}
                onOpenInExplore={() => navigate('/explore')}
              />
            ))}
            {/* Sentinel: observed to trigger next page load */}
            {visibleCount < pastJobs.length && (
              <div ref={setSentinelEl} style={{ height: 1 }} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
