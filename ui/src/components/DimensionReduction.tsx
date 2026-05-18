import { useEffect, useRef, useState } from 'react'
import { fetchMlflowModels, submitLatentSpaceJob } from '../api/jobs'
import { fetchDataProjectDictFromJob } from '../api/data'
import { fetchModels } from '../api/models'
import { useJobStatus } from '../hooks/useJobStatus'
import type { DataProjectDict } from '../types/data'
import type { MlflowModelOption, JobSubmitResponse } from '../types/jobs'
import type { GuiParameter, Model, ParameterValues } from '../types/models'
import JobRunSelect from './JobRunSelect'
import LogsModal from './LogsModal'

interface Props {
  dataProjectDict: DataProjectDict | null
  projectName: string
  currentJobId: string | null
  logTransform: boolean
  percentiles: [number, number]
  mask: string
  onJobSubmitted: (jobId: string) => void
  onShowFeatureVectors: () => void
  onHideFeatureVectors: () => void
  onDataProjectDictChange?: (dict: DataProjectDict) => void
  clearCount?: number
}

const C = {
  bg3: 'rgba(0,0,0,0.2)',
  bg: '#343a40',
  accent: '#4f8ef7',
  text: 'white',
  textMuted: 'rgba(255,255,255,0.65)',
  textDim: 'rgba(255,255,255,0.4)',
  border: 'rgba(255,255,255,0.15)',
  mono: "'IBM Plex Mono', monospace",
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: C.mono,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: C.textDim,
      marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

function ModelCard({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? `rgba(79,142,247,0.12)` : hovered ? 'rgba(255,255,255,0.06)' : C.bg3,
        border: `${selected ? 2 : 1}px solid ${selected ? C.accent : hovered ? 'rgba(255,255,255,0.25)' : C.border}`,
        borderRadius: 6,
        padding: selected ? '7px 9px' : '8px 10px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        minHeight: 48,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span style={{
        fontFamily: C.mono,
        fontSize: 11,
        color: selected ? C.accent : C.textMuted,
        wordBreak: 'break-all',
        lineHeight: 1.4,
      }}>
        {label}
      </span>
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

function formatElapsed(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function JobStatusBlock({ ready, failed, elapsedSec, jobId }: {
  ready: boolean; failed: boolean; elapsedSec: number; jobId: string
}) {
  const [dot, bar, label, dotColor] = failed
    ? ['rgba(239,68,68,0.2)', null, 'FAILED', '#ef4444']
    : ready
      ? ['rgba(34,197,94,0.2)', null, 'COMPLETED', '#22c55e']
      : ['rgba(245,158,11,0.2)', 'running', 'RUNNING', '#f59e0b']

  return (
    <div style={{
      background: dot,
      border: `1px solid ${dotColor}30`,
      borderRadius: 5,
      padding: '8px 10px',
      marginBottom: 10,
    }}>
      <style>{`
        @keyframes dr-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes dr-bar {
          0%   { transform: translateX(-100%); width: 40%; }
          50%  { width: 60%; }
          100% { transform: translateX(280%); width: 40%; }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: bar ? 6 : 3 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: dotColor,
          flexShrink: 0, display: 'inline-block',
          ...(bar ? { animation: 'dr-pulse 1.2s ease-in-out infinite' } : {}),
        }} />
        <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 600, letterSpacing: '.06em', color: dotColor }}>
          {label}
        </span>
        <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim, marginLeft: 'auto' }}>
          {formatElapsed(elapsedSec)}
        </span>
      </div>
      {bar && (
        <div style={{ height: 3, background: 'rgba(245,158,11,0.2)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', background: '#f59e0b', borderRadius: 2, animation: 'dr-bar 2.2s ease-in-out infinite' }} />
        </div>
      )}
      <div style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim }}>job {jobId.slice(0, 8)}…</div>
    </div>
  )
}

const divider = <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '14px 0' }} />

export default function DimensionReduction({
  dataProjectDict,
  projectName,
  currentJobId,
  logTransform,
  percentiles,
  mask,
  onJobSubmitted,
  onShowFeatureVectors,
  onHideFeatureVectors,
  onDataProjectDictChange,
  clearCount = 0,
}: Props) {
  // MLflow models
  const [mlflowModels, setMlflowModels] = useState<MlflowModelOption[]>([])
  const [mlflowLoading, setMlflowLoading] = useState(false)
  const [mlflowModelId, setMlflowModelId] = useState<string | null>(null)

  // Dim reduction models
  const [dimRedModels, setDimRedModels] = useState<Model[]>([])
  const [selectedDimRed, setSelectedDimRed] = useState<Model | null>(null)
  const [dimRedParams, setDimRedParams] = useState<ParameterValues>({})

  // Job submission
  const [jobName] = useState('latent-space-job')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<JobSubmitResponse | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [showFV, setShowFV] = useState(false)

  const effectiveJobId = activeJobId ?? currentJobId
  const status = useJobStatus(effectiveJobId, 'latent-space', projectName)

  const [elapsedSec, setElapsedSec] = useState(0)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoShowRef = useRef(false)

  useEffect(() => {
    if (status?.ready && autoShowRef.current) {
      autoShowRef.current = false
      setShowFV(true)
      onShowFeatureVectors()
    } else if (!status?.ready) {
      setShowFV(false)
    }
  }, [status?.ready])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (clearCount > 0) {
      setActiveJobId(null)
      setResult(null)
      setShowFV(false)
    }
  }, [clearCount])

  useEffect(() => {
    if (effectiveJobId && !status?.ready) {
      setElapsedSec(0)
      elapsedRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000)
    } else {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current) }
  }, [effectiveJobId, status?.ready])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setMlflowLoading(true)
    fetchMlflowModels()
      .then(setMlflowModels)
      .catch(() => {})
      .finally(() => setMlflowLoading(false))
  }, [])

  useEffect(() => {
    fetchModels('dimension_reduction')
      .then(data => {
        setDimRedModels(data)
        if (data.length > 0) {
          setSelectedDimRed(data[0])
          const defaults = Object.fromEntries(data[0].gui_parameters.map(p => [p.param_key, p.value]))
          setDimRedParams(defaults)
        }
      })
      .catch(() => {})
  }, [])

  function handleDimRedChange(name: string) {
    const model = dimRedModels.find(m => m.model_name === name) ?? null
    setSelectedDimRed(model)
    if (model) {
      const defaults = Object.fromEntries(model.gui_parameters.map(p => [p.param_key, p.value]))
      setDimRedParams(defaults)
    }
  }

  function handleParamChange(key: string, value: number) {
    setDimRedParams(prev => ({ ...prev, [key]: value }))
  }

  async function handleSelectPastJob(jobId: string | null) {
    if (!jobId) return
    setActiveJobId(jobId)
    onJobSubmitted(jobId)
    setResult(null)
    setShowFV(false)
    if (onDataProjectDictChange) {
      try {
        const dict = await fetchDataProjectDictFromJob(jobId)
        onDataProjectDictChange(dict)
      } catch {
        // keep existing dataProjectDict if fetch fails
      }
    }
  }

  const canSubmit = !!dataProjectDict && !!mlflowModelId && !!selectedDimRed && !!projectName && !submitting

  async function handleSubmit() {
    if (!dataProjectDict || !mlflowModelId || !selectedDimRed) return
    setSubmitting(true)
    setResult(null)
    setShowFV(false)
    try {
      const res = await submitLatentSpaceJob({
        data_project_dict: dataProjectDict,
        model_name: selectedDimRed.model_name,
        model_parameters: dimRedParams,
        log_transform: logTransform,
        percentiles,
        mask: mask !== 'None' ? mask : null,
        job_name: jobName,
        project_name: projectName,
        mlflow_model_id: mlflowModelId,
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

  function handleToggleFV(checked: boolean) {
    setShowFV(checked)
    if (checked) onShowFeatureVectors()
    else onHideFeatureVectors()
  }

  const isRunning = effectiveJobId && status && !status.ready
  const fvEnabled = !!effectiveJobId && !isRunning

  const selectStyle: React.CSSProperties = {
    width: '100%',
    background: C.bg3,
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    padding: '5px 8px',
    fontFamily: C.mono,
    fontSize: 12,
    color: C.text,
    outline: 'none',
    appearance: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: C.mono,
    fontSize: 11,
    color: C.textDim,
    marginBottom: 4,
    display: 'block',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Autoencoder model ── */}
      <SectionLabel>Autoencoder model</SectionLabel>

      {mlflowLoading && (
        <div style={{ fontFamily: C.mono, fontSize: 12, color: C.textDim, marginBottom: 12 }}>Loading…</div>
      )}
      {!mlflowLoading && mlflowModels.length === 0 && (
        <div style={{
          fontFamily: C.mono, fontSize: 11, color: C.textDim,
          background: C.bg3, border: `1px solid ${C.border}`,
          borderRadius: 6, padding: '10px 12px', marginBottom: 12, textAlign: 'center',
        }}>
          No MLflow models available
        </div>
      )}
      {mlflowModels.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
          {mlflowModels.map(model => {
            const id = model.value ?? model.label
            return (
              <ModelCard
                key={id}
                label={model.label}
                selected={mlflowModelId === model.value}
                onClick={() => setMlflowModelId(mlflowModelId === model.value ? null : (model.value ?? null))}
              />
            )
          })}
        </div>
      )}

      {/* ── Dimension reduction ── */}
      <SectionLabel>Dimension reduction</SectionLabel>

      {dimRedModels.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <span style={labelStyle}>Algorithm</span>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedDimRed?.model_name ?? ''}
                  onChange={e => handleDimRedChange(e.target.value)}
                  style={selectStyle}
                >
                  {dimRedModels.map(m => (
                    <option key={m.model_name} value={m.model_name}>{m.model_name}</option>
                  ))}
                </select>
                <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: C.textDim, fontSize: 10, pointerEvents: 'none' }}>▾</span>
              </div>
            </div>

            {selectedDimRed?.gui_parameters.map(param => (
              <div key={param.param_key}>
                <span style={labelStyle}>{param.title}</span>
                <ParamInput param={param} value={dimRedParams[param.param_key] ?? param.value} onChange={handleParamChange} />
              </div>
            ))}
          </div>

          {selectedDimRed?.description && (
            <div style={{
              fontFamily: C.mono, fontSize: 11, color: C.textDim,
              background: C.bg3, border: `1px solid ${C.border}`,
              borderRadius: 4, padding: '6px 8px',
            }}>
              {selectedDimRed.description}
            </div>
          )}
        </div>
      )}

      {divider}

      {/* ── Submit ── */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{
          width: '100%',
          padding: '9px 0',
          marginBottom: 8,
          background: canSubmit ? C.accent : 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: 5,
          color: canSubmit ? 'white' : C.textDim,
          fontFamily: C.mono,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '.06em',
          cursor: canSubmit ? 'pointer' : 'default',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
      >
        {submitting ? 'Submitting…' : 'Run Dim Reduction'}
      </button>

      {!dataProjectDict && (
        <div style={{ fontFamily: C.mono, fontSize: 11, color: C.textDim, marginBottom: 6 }}>Load data first.</div>
      )}
      {dataProjectDict && !mlflowModelId && (
        <div style={{ fontFamily: C.mono, fontSize: 11, color: C.textDim, marginBottom: 6 }}>Select an autoencoder model above.</div>
      )}
      {result && (
        <div style={{
          fontFamily: C.mono, fontSize: 11, marginBottom: 8,
          color: result.status === 'error' ? '#ef4444' : result.status === 'success' ? '#22c55e' : C.textMuted,
        }}>
          {result.message}
        </div>
      )}

      {divider}

      {/* ── Past jobs ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 0 }}>
        <div style={{ flex: 1 }}>
          <JobRunSelect
            label="Past Jobs"
            tags={['latent-space-explorer', 'latent-space']}
            value={effectiveJobId}
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

      {effectiveJobId && status && (
        <JobStatusBlock
          ready={status.ready}
          failed={status.state === 'FAILED' || status.state === 'CRASHED'}
          elapsedSec={elapsedSec}
          jobId={effectiveJobId}
        />
      )}

      {/* ── Show Feature Vectors ── */}
      <div
        onClick={() => { if (fvEnabled) handleToggleFV(!showFV) }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 4,
          opacity: fvEnabled ? 1 : 0.4,
          cursor: fvEnabled ? 'pointer' : 'default',
        }}
      >
        <span style={{ fontFamily: C.mono, fontSize: 12, color: C.textMuted }}>Show Feature Vectors</span>
        <div style={{
          width: 28, height: 16,
          background: showFV ? C.accent : 'rgba(0,0,0,0.2)',
          border: `1px solid ${showFV ? C.accent : C.border}`,
          borderRadius: 8, position: 'relative',
          transition: 'background 0.2s, border-color 0.2s',
        }}>
          <div style={{
            position: 'absolute', top: 2, left: showFV ? 14 : 2,
            width: 10, height: 10, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s',
          }} />
        </div>
      </div>

      {showLogs && effectiveJobId && (
        <LogsModal jobId={effectiveJobId} onClose={() => setShowLogs(false)} />
      )}
    </div>
  )
}
