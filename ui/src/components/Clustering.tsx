import { useEffect, useRef, useState } from 'react'
import { fetchClusters, fetchDataProjectDictFromClusteringJob } from '../api/data'
import { fetchModels } from '../api/models'
import { submitClusteringJob } from '../api/jobs'
import { useJobStatus } from '../hooks/useJobStatus'
import type { DataProjectDict } from '../types/data'
import type { JobSubmitResponse } from '../types/jobs'
import type { GuiParameter, Model, ParameterValues } from '../types/models'
import JobRunSelect from './JobRunSelect'
import LogsModal from './LogsModal'

interface Props {
  projectName: string
  latentSpaceJobId: string | null
  logTransform: boolean
  percentiles: [number, number]
  mask: string
  onJobSubmitted: (jobId: string) => void
  onShowClusters: () => void
  onHideClusters: () => void
  onDataProjectDictChange?: (dict: DataProjectDict) => void
  clearCount?: number
  hideHistory?: boolean
  historyOnly?: boolean
}

const C = {
  bg3: 'rgba(0,0,0,0.2)',
  accent: '#4f8ef7',
  text: 'white',
  textMuted: 'rgba(255,255,255,0.65)',
  textDim: 'rgba(255,255,255,0.4)',
  border: 'rgba(255,255,255,0.15)',
  mono: "'IBM Plex Mono', monospace",
}

// Must match ScatterPlot.tsx COLORS order so legend colors align with the plot
const CLUSTER_COLORS = [
  '#636efa', '#ef553b', '#00cc96', '#ab63fa', '#ffa15a',
  '#19d3f3', '#ff6692', '#b6e880', '#ff97ff', '#fecb52',
]

const divider = <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '14px 0' }} />

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: C.mono,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '.1em',
      textTransform: 'uppercase' as const,
      color: C.textDim,
      marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

function ParamInput({ param, value, onChange }: {
  param: GuiParameter
  value: number
  onChange: (key: string, value: number) => void
}) {
  const base: React.CSSProperties = {
    width: '100%',
    background: C.bg3,
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    padding: '5px 8px',
    fontFamily: C.mono,
    fontSize: 12,
    color: C.text,
    outline: 'none',
    boxSizing: 'border-box',
  }
  if (param.type === 'dropdown') {
    return (
      <select value={value} onChange={e => onChange(param.param_key, Number(e.target.value))} style={base}>
        {param.options?.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    )
  }
  if (param.type === 'slider') {
    return (
      <div>
        <input
          type="range" min={param.min} max={param.max} step={param.step} value={value}
          onChange={e => onChange(param.param_key, Number(e.target.value))}
          style={{ width: '100%', accentColor: C.accent }}
        />
        <span style={{ fontFamily: C.mono, fontSize: 11, color: C.textMuted }}>{value}</span>
      </div>
    )
  }
  return (
    <input
      type="number" value={value}
      step={param.type === 'float' ? 0.01 : 1}
      min={param.min} max={param.max}
      onChange={e => onChange(param.param_key, Number(e.target.value))}
      style={base}
    />
  )
}

export default function Clustering({
  projectName,
  latentSpaceJobId,
  logTransform,
  percentiles,
  mask,
  onJobSubmitted,
  onShowClusters,
  onHideClusters,
  onDataProjectDictChange,
  clearCount = 0,
  hideHistory = false,
  historyOnly = false,
}: Props) {
  const [models, setModels] = useState<Model[]>([])
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [modelParams, setModelParams] = useState<ParameterValues>({})

  // Local copy of the dim reduction job to use — kept in sync with the prop but
  // also updated when the user picks one directly from the Clustering panel.
  const [selectedLatentJobId, setSelectedLatentJobId] = useState<string | null>(latentSpaceJobId)

  const [jobName, setJobName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<JobSubmitResponse | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [showClusters, setShowClusters] = useState(false)
  const [clusterStats, setClusterStats] = useState<{ id: number; count: number }[] | null>(null)

  const status = useJobStatus(activeJobId, 'clustering', projectName)
  const autoShowRef = useRef(false)

  // When the parent updates (e.g. user runs/selects a dim reduction job in that
  // panel), mirror it here so the default is always the most recent one.
  useEffect(() => {
    setSelectedLatentJobId(latentSpaceJobId)
  }, [latentSpaceJobId])

  useEffect(() => {
    fetchModels('clustering')
      .then(data => {
        setModels(data)
        if (data.length > 0) {
          setSelectedModel(data[0])
          setModelParams(Object.fromEntries(data[0].gui_parameters.map(p => [p.param_key, p.value])))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (status?.ready && autoShowRef.current) {
      autoShowRef.current = false
      setShowClusters(true)
      onShowClusters()
    } else if (!status?.ready) {
      setShowClusters(false)
      setClusterStats(null)
    }
  }, [status?.ready])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (clearCount > 0) {
      setActiveJobId(null)
      setResult(null)
      setShowClusters(false)
      setClusterStats(null)
    }
  }, [clearCount])

  // Fetch cluster counts for the legend whenever a completed job is selected
  useEffect(() => {
    if (!status?.ready || !activeJobId) {
      setClusterStats(null)
      return
    }
    fetchClusters(activeJobId, projectName, selectedLatentJobId ?? "")
      .then(data => {
        const counts = new Map<number, number>()
        data.clusters.forEach(id => counts.set(id, (counts.get(id) ?? 0) + 1))
        setClusterStats(
          [...counts.entries()].sort(([a], [b]) => a - b).map(([id, count]) => ({ id, count }))
        )
      })
      .catch(() => setClusterStats(null))
  }, [status?.ready, activeJobId, selectedLatentJobId, projectName])  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSelectPastJob(jobId: string | null) {
    if (!jobId) return
    setActiveJobId(jobId)
    onJobSubmitted(jobId)
    setResult(null)
    setShowClusters(false)
    setClusterStats(null)
    autoShowRef.current = true
      try {
        const dict = await fetchDataProjectDictFromClusteringJob(jobId)
        onDataProjectDictChange?.(dict)
      } catch {
        // keep existing dataProjectDict if fetch fails
      }
  }

  function handleModelChange(name: string) {
    const model = models.find(m => m.model_name === name) ?? null
    setSelectedModel(model)
    if (model) setModelParams(Object.fromEntries(model.gui_parameters.map(p => [p.param_key, p.value])))
  }

  function handleParamChange(key: string, value: number) {
    setModelParams(prev => ({ ...prev, [key]: value }))
  }

  const defaultJobName = selectedModel
    ? `${selectedModel.model_name} - ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
    : ''

  const canSubmit = !!selectedLatentJobId && !!selectedModel && !submitting

  async function handleSubmit() {
    if (!selectedLatentJobId || !selectedModel) return
    const effectiveJobName = jobName.trim() || defaultJobName
    setSubmitting(true)
    setResult(null)
    setShowClusters(false)
    setClusterStats(null)
    try {
      const res = await submitClusteringJob({
        model_name: selectedModel.model_name,
        model_parameters: modelParams,
        log_transform: logTransform,
        percentiles,
        mask: mask !== 'None' ? mask : null,
        job_name: effectiveJobName,
        project_name: projectName,
        dimension_reduction_job_id: selectedLatentJobId,
      })
      setResult(res)
      if (res.job_uid) {
        autoShowRef.current = true
        setActiveJobId(res.job_uid)
        onJobSubmitted(res.job_uid)
      }
    } catch (e) {
      setResult({ job_uid: null, message: e instanceof Error ? e.message : 'Unknown error', status: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  function handleToggleClusters(checked: boolean) {
    setShowClusters(checked)
    if (checked) onShowClusters()
    else onHideClusters()
  }

  const isReady = !!status?.ready
  const isFailed = status?.state === 'FAILED' || status?.state === 'CRASHED'
  const isRunning = !!(activeJobId && status && !status.ready && !isFailed)

  const labelStyle: React.CSSProperties = {
    fontFamily: C.mono,
    fontSize: 11,
    color: C.textDim,
    marginBottom: 4,
    display: 'block',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: C.bg3,
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    padding: '5px 8px',
    fontFamily: C.mono,
    fontSize: 12,
    color: C.text,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const statusColor = isFailed ? '#ef4444' : isReady ? '#22c55e' : '#f59e0b'

  if (historyOnly) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <style>{`@keyframes cl-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }`}</style>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <JobRunSelect
              label="Past Clustering Jobs"
              tags={['latent-space-explorer', 'clustering']}
              value={activeJobId}
              onChange={handleSelectPastJob}
            />
          </div>
          <button
            onClick={() => setShowLogs(true)}
            disabled={!activeJobId}
            style={{
              marginBottom: 12,
              padding: '5px 10px',
              background: activeJobId ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: `1px solid ${activeJobId ? C.border : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 4,
              color: activeJobId ? C.textMuted : C.textDim,
              fontFamily: C.mono,
              fontSize: 11,
              cursor: activeJobId ? 'pointer' : 'default',
              whiteSpace: 'nowrap',
            }}
          >
            View Logs
          </button>
        </div>

        {activeJobId && status && (
          <div style={{
            background: `${statusColor}1e`,
            border: `1px solid ${statusColor}4d`,
            borderRadius: 5,
            padding: '8px 10px',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: statusColor,
              flexShrink: 0, display: 'inline-block',
              ...(isRunning ? { animation: 'cl-pulse 1.2s ease-in-out infinite' } : {}),
            }} />
            <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 600, letterSpacing: '.06em', color: statusColor }}>
              {isFailed ? 'FAILED' : isReady ? 'COMPLETED' : 'RUNNING'}
            </span>
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, marginLeft: 'auto' }}>
              {activeJobId.slice(0, 8)}…
            </span>
          </div>
        )}

        {clusterStats && clusterStats.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <SectionLabel>Clusters</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {clusterStats.map(({ id, count }, i) => {
                const isNoise = id === -1
                return (
                  <div
                    key={id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '3px 5px', borderRadius: 4,
                      opacity: isNoise ? 0.5 : 1, cursor: 'default',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }} />
                    <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text, flex: 1 }}>
                      {isNoise ? 'Noise' : `Cluster ${id}`}
                    </span>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textMuted }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {showLogs && activeJobId && (
          <LogsModal jobId={activeJobId} onClose={() => setShowLogs(false)} />
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes cl-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }`}</style>

      {/* ── Algorithm ── */}
      <SectionLabel>Algorithm</SectionLabel>
      {models.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <span style={labelStyle}>Model</span>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedModel?.model_name ?? ''}
                onChange={e => handleModelChange(e.target.value)}
                style={{ ...inputStyle, appearance: 'none' } as React.CSSProperties}
              >
                {models.map(m => (
                  <option key={m.model_name} value={m.model_name}>{m.model_name}</option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: C.textDim, fontSize: 10, pointerEvents: 'none' }}>▾</span>
            </div>
          </div>
          {selectedModel?.gui_parameters.map(param => (
            <div key={param.param_key}>
              <span style={labelStyle}>{param.title}</span>
              <ParamInput param={param} value={modelParams[param.param_key] ?? param.value} onChange={handleParamChange} />
            </div>
          ))}
        </div>
      )}

      {/* ── Dim reduction job to cluster ── */}
      <div style={{ marginBottom: 14 }}>
        <SectionLabel>Dimension Reduction Job</SectionLabel>
        <JobRunSelect
          label=""
          tags={['latent-space-explorer', 'latent-space']}
          value={selectedLatentJobId}
          onChange={setSelectedLatentJobId}
        />
      </div>

      {/* ── Job name ── */}
      <div style={{ marginBottom: 12 }}>
        <span style={labelStyle}>Job Name (optional)</span>
        <input
          type="text"
          value={jobName}
          onChange={e => setJobName(e.target.value)}
          placeholder={defaultJobName || 'auto-generated'}
          style={inputStyle}
        />
      </div>

      {/* ── Run button (outlined / secondary style) ── */}
      <RunButton canSubmit={canSubmit} submitting={submitting} onClick={handleSubmit} />

      {!selectedLatentJobId && !hideHistory && (
        <div style={{ fontFamily: C.mono, fontSize: 11, color: C.textDim, marginTop: 6 }}>
          Select a Dimension Reduction job above.
        </div>
      )}
      {result && (
        <div style={{
          fontFamily: C.mono, fontSize: 11, marginTop: 6,
          color: result.status === 'error' ? '#ef4444' : result.status === 'success' ? '#22c55e' : C.textMuted,
        }}>
          {result.message}
        </div>
      )}

      {!hideHistory && (<>
      {divider}

      {/* ── Past jobs ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <JobRunSelect
            label="Past Clustering Jobs"
            tags={['latent-space-explorer', 'clustering']}
            value={activeJobId}
            onChange={handleSelectPastJob}
          />
        </div>
        <button
          onClick={() => setShowLogs(true)}
          disabled={!activeJobId}
          style={{
            marginBottom: 12,
            padding: '5px 10px',
            background: activeJobId ? 'rgba(255,255,255,0.08)' : 'transparent',
            border: `1px solid ${activeJobId ? C.border : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 4,
            color: activeJobId ? C.textMuted : C.textDim,
            fontFamily: C.mono,
            fontSize: 11,
            cursor: activeJobId ? 'pointer' : 'default',
            whiteSpace: 'nowrap',
          }}
        >
          View Logs
        </button>
      </div>
      </>)}

      {/* ── Status block ── */}
      {activeJobId && status && (
        <div style={{
          background: `${statusColor}1e`,
          border: `1px solid ${statusColor}4d`,
          borderRadius: 5,
          padding: '8px 10px',
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: statusColor,
            flexShrink: 0, display: 'inline-block',
            ...(isRunning ? { animation: 'cl-pulse 1.2s ease-in-out infinite' } : {}),
          }} />
          <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 600, letterSpacing: '.06em', color: statusColor }}>
            {isFailed ? 'FAILED' : isReady ? 'COMPLETED' : 'RUNNING'}
          </span>
          <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, marginLeft: 'auto' }}>
            {activeJobId.slice(0, 8)}…
          </span>
        </div>
      )}

      {/* ── Cluster legend ── */}
      {clusterStats && clusterStats.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>Clusters</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {clusterStats.map(({ id, count }, i) => {
              const isNoise = id === -1
              return (
                <div
                  key={id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '3px 5px',
                    borderRadius: 4,
                    opacity: isNoise ? 0.5 : 1,
                    cursor: 'default',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
                  }} />
                  <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text, flex: 1 }}>
                    {isNoise ? 'Noise' : `Cluster ${id}`}
                  </span>
                  <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textMuted }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!hideHistory && (
        <div
          onClick={() => { if (isReady) handleToggleClusters(!showClusters) }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 4,
            opacity: isReady ? 1 : 0.4,
            cursor: isReady ? 'pointer' : 'default',
          }}
        >
          <span style={{ fontFamily: C.mono, fontSize: 12, color: C.textMuted }}>Show Clusters</span>
          <div style={{
            width: 28, height: 16,
            background: showClusters ? C.accent : 'rgba(0,0,0,0.2)',
            border: `1px solid ${showClusters ? C.accent : C.border}`,
            borderRadius: 8,
            position: 'relative',
            transition: 'background 0.2s, border-color 0.2s',
            flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 2, left: showClusters ? 14 : 2,
              width: 10, height: 10, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s',
            }} />
          </div>
        </div>
      )}

      {showLogs && activeJobId && (
        <LogsModal jobId={activeJobId} onClose={() => setShowLogs(false)} />
      )}
    </div>
  )
}

function RunButton({ canSubmit, submitting, onClick }: {
  canSubmit: boolean
  submitting: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={!canSubmit}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        padding: '8px 0',
        marginBottom: 8,
        background: 'transparent',
        border: `1px solid ${canSubmit && hovered ? C.accent : canSubmit ? C.border : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 5,
        color: canSubmit && hovered ? C.accent : canSubmit ? C.textMuted : C.textDim,
        fontFamily: C.mono,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        cursor: canSubmit ? 'pointer' : 'default',
        transition: 'border-color 0.15s, color 0.15s',
      }}
    >
      {submitting ? 'Submitting…' : '▶ Run Clustering'}
    </button>
  )
}
