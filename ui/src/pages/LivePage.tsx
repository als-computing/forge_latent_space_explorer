import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle, ArrowLeft, CheckCircle2, ChevronDown,
  Clock, Play, RefreshCw, Square, Terminal, Trash2,
} from 'lucide-react'
import { fetchInfraHealth } from '../api/infra'
import { fetchLiveModels, fetchLiveModelVersions } from '../api/jobs'
import { startLive, stopLive } from '../api/live'
import ScatterPlot from '../components/ScatterPlot'
import type { InfraState } from '../types/infra'
import type { FeatureVectorResponse } from '../types/data'


const DEBOUNCE_MS = 100

// ── Palette ──────────────────────────────────────────────────────────────────

const GREEN = { border: '#1D9E75', pillBg: '#E1F5EE', pillText: '#0F6E56', dot: '#1D9E75' }
const RED   = { border: '#E24B4A', pillBg: '#FCEBEB', pillText: '#A32D2D', dot: '#E24B4A' }
const AUTO_RECHECK_MS = 60_000
const HEADER_H = 72

// ── Types ────────────────────────────────────────────────────────────────────

type Technique = 'xps' | 'sas'
type Step = 'technique' | 'preflight' | 'models' | 'loading' | 'streaming'
type ReadyKey = 'tiled_ready' | 'mlflow_ready' | 'arroyo_ready' | 'data_source_ready'
type ErrorKey = 'tiled_error' | 'mlflow_error' | 'arroyo_error' | 'data_source_error'

interface ServiceDef { readyKey: ReadyKey; errorKey: ErrorKey; name: string; desc: string; readyLabel: string }
interface LiveConfig {
  technique: Technique
  experimentName: string
  autoencoderName: string
  autoencoderVersion: string
  dimredName: string
  dimredVersion: string
}

const TECHNIQUE_META: Record<Technique, { label: string; full: string; dataSource: string }> = {
  xps: { label: 'XPS', full: 'X-ray Photoelectron Spectroscopy', dataSource: 'WebSocket stream from TimePix detector' },
  sas: { label: 'SAS', full: 'Small Angle Scattering',           dataSource: 'WebSocket stream'          },
}

function getServices(technique: Technique): ServiceDef[] {
  const meta = TECHNIQUE_META[technique]
  return [
    { readyKey: 'tiled_ready',       errorKey: 'tiled_error',       name: 'Tiled — results store',     desc: 'Streams processed detector data to the explorer.',       readyLabel: 'Reachable' },
    { readyKey: 'mlflow_ready',      errorKey: 'mlflow_error',      name: 'MLflow — model registry',   desc: 'Provides autoencoder and dim-reduction model artifacts.', readyLabel: 'Reachable' },
    { readyKey: 'arroyo_ready',      errorKey: 'arroyo_error',      name: 'Arroyo — stream processor', desc: 'Runs live inference and publishes results to Tiled.',     readyLabel: 'Ready'     },
    { readyKey: 'data_source_ready', errorKey: 'data_source_error', name: `${meta.label} data source`, desc: meta.dataSource,                                          readyLabel: 'Reachable' },
  ]
}

// ── Small shared components ───────────────────────────────────────────────────

function StatusPill({ ok, readyLabel }: { ok: boolean | null; readyLabel: string }) {
  if (ok === null) return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20,
      background: 'var(--code-bg)', color: 'var(--text)', whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border)', flexShrink: 0 }} />
      Checking…
    </span>
  )
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

function ServiceCard({ svc, ready, errorMsg }: { svc: ServiceDef; ready: boolean | null; errorMsg: string | null }) {
  const [logsOpen, setLogsOpen] = useState(false)
  const borderColor = ready === null ? 'var(--border)' : ready ? GREEN.border : RED.border

  return (
    <div style={{
      background: 'var(--bg)', border: '0.5px solid var(--border)',
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 10, padding: '.875rem 1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-h)' }}>{svc.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text)', marginTop: 2 }}>{svc.desc}</div>
        </div>
        <StatusPill ok={ready} readyLabel={svc.readyLabel} />
      </div>
      {ready !== null && (
        <>
          <button
            onClick={() => setLogsOpen(o => !o)}
            style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <Terminal size={12} />
            <span>{logsOpen ? 'Hide logs' : 'Show logs'}</span>
            <ChevronDown size={11} style={{ transform: logsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {logsOpen && (
            <div style={{ marginTop: 6, background: 'var(--code-bg)', border: '0.5px solid var(--border)',
              borderRadius: 6, padding: '.5rem .75rem', maxHeight: 100, overflowY: 'auto' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.8, color: ready ? GREEN.dot : RED.dot }}>
                <span style={{ color: 'var(--text)', opacity: 0.5, marginRight: 6 }}>last check</span>
                {ready ? `INFO — ${svc.name} health OK` : `ERROR — ${errorMsg ?? 'connection failed'}`}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StepBadge({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
      background: 'var(--code-bg)', border: '0.5px solid var(--border)',
      color: 'var(--text)', letterSpacing: '0.03em',
    }}>{label}</span>
  )
}

function GreenBtn({ onClick, disabled, children }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: GREEN.border, color: '#fff', border: 'none', borderRadius: 6,
      padding: '0 1.1rem', height: 36, fontSize: 13, fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1, transition: 'opacity 0.15s',
    }}>{children}</button>
  )
}

function GhostBtn({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'transparent', color: 'var(--text)',
      border: '0.5px solid var(--border)', borderRadius: 6,
      padding: '0 1.1rem', height: 36, fontSize: 13, cursor: 'pointer',
    }}>{children}</button>
  )
}

// ── Step 0: Technique selection ───────────────────────────────────────────────

function TechniqueStep({ onSelect }: { onSelect: (t: Technique) => void }) {
  const options: { key: Technique; label: string; full: string; dataSource: string }[] = [
    { key: 'xps', label: 'XPS', full: 'X-ray Photoelectron Spectroscopy', dataSource: 'WebSocket stream · TimePix detector' },
    { key: 'sas', label: 'SAS', full: 'Small Angle Scattering',           dataSource: 'WebSocket stream · Bluesky/Tiled'    },
  ]
  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-h)', marginBottom: 4 }}>Live mode</div>
      <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: '1.25rem' }}>
        Choose your technique to begin.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {options.map(opt => (
          <button
            key={opt.key}
            onClick={() => onSelect(opt.key)}
            style={{
              textAlign: 'left', background: 'var(--bg)', cursor: 'pointer',
              border: '0.5px solid var(--border)', borderRadius: 10,
              padding: '1.25rem 1.25rem 1rem',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = GREEN.border
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 2px ${GREEN.pillBg}`
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-h)', marginBottom: 4 }}>{opt.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-h)', fontWeight: 500, marginBottom: 8 }}>{opt.full}</div>
            <div style={{ fontSize: 11, color: 'var(--text)', opacity: 0.7 }}>{opt.dataSource}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Step 1: Preflight ─────────────────────────────────────────────────────────

function PreflightStep({
  technique, infra, checking, error, onRecheck, onBack, onNext,
}: {
  technique: Technique; infra: InfraState | null; checking: boolean; error: string | null
  onRecheck: () => void; onBack: () => void; onNext: () => void
}) {
  const services = getServices(technique)
  const allOk = infra ? !infra.any_infra_down : false
  const downCount = infra ? services.filter(s => !infra[s.readyKey]).length : 0

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--text)', fontSize: 12, padding: 0, marginBottom: '1rem' }}
      >
        <ArrowLeft size={13} /> Back to technique selection
      </button>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-h)' }}>Live mode setup</span>
            <StepBadge label="Step 1 of 2" />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 3 }}>
            Confirm all services are reachable before selecting models.
          </div>
        </div>
        {infra && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text)', opacity: 0.6, flexShrink: 0 }}>
            <Clock size={12} /> {infra.last_checked}
          </div>
        )}
      </div>

      {/* Banner */}
      {error ? (
        <Banner variant="err"><strong>Health check failed.</strong> {error}</Banner>
      ) : infra && (
        allOk
          ? <Banner variant="ok"><strong>All services reachable.</strong> You can proceed to model selection.</Banner>
          : <Banner variant="err"><strong>{downCount} service{downCount !== 1 ? 's' : ''} unavailable.</strong> Resolve below before continuing.</Banner>
      )}

      {/* Service grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: '1.1rem' }}>
        {services.map(svc => (
          <ServiceCard
            key={svc.readyKey}
            svc={svc}
            ready={infra ? infra[svc.readyKey] : null}
            errorMsg={infra ? infra[svc.errorKey] : null}
          />
        ))}
      </div>

      <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '1rem 0' }} />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <GreenBtn onClick={onNext} disabled={!allOk}>
          Select models <ArrowLeft size={13} style={{ transform: 'rotate(180deg)' }} />
        </GreenBtn>
        <GhostBtn onClick={onRecheck}>
          <RefreshCw size={13} style={{ animation: checking ? 'spin 0.8s linear infinite' : 'none' }} />
          {checking ? 'Checking…' : 'Re-check'}
        </GhostBtn>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text)', opacity: 0.55 }}>
          <Clock size={11} /> Auto re-checks every 60 s
        </div>
      </div>
    </div>
  )
}

// ── Step 2: Model selection ───────────────────────────────────────────────────

function ModelSelect({
  label, models, modelName, onModelName,
  versions, version, onVersion, loadingModels, loadingVersions,
}: {
  label: string
  models: { label: string; value: string | null }[]
  modelName: string
  onModelName: (v: string) => void
  versions: { label: string; value: string }[]
  version: string
  onVersion: (v: string) => void
  loadingModels: boolean
  loadingVersions: boolean
}) {
  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '6px 10px',
    background: 'var(--bg)', color: 'var(--text-h)',
    border: '0.5px solid var(--border)', borderRadius: 6,
    fontSize: 13, cursor: 'pointer', outline: 'none',
  }
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <FieldLabel>{label}</FieldLabel>
      <select
        value={modelName}
        onChange={e => onModelName(e.target.value)}
        disabled={loadingModels}
        style={{ ...selectStyle, marginBottom: 6 }}
      >
        <option value="">{loadingModels ? 'Loading…' : 'Select model…'}</option>
        {models.map(m => (
          <option key={m.value} value={m.value ?? ''}>{m.label}</option>
        ))}
      </select>
      {modelName && (
        <select
          value={version}
          onChange={e => onVersion(e.target.value)}
          disabled={loadingVersions || versions.length === 0}
          style={{ ...selectStyle, paddingLeft: 22, fontSize: 12, color: version ? 'var(--text-h)' : 'var(--text)' }}
        >
          <option value="">{loadingVersions ? 'Loading versions…' : 'Select version…'}</option>
          {versions.map(v => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      )}
    </div>
  )
}

function ModelStep({ technique, onBack, onStart }: { technique: Technique; onBack: () => void; onStart: (cfg: LiveConfig) => void }) {
  const [aeModels, setAeModels] = useState<{ label: string; value: string | null }[]>([])
  const [drModels, setDrModels] = useState<{ label: string; value: string | null }[]>([])
  const [loadingModels, setLoadingModels] = useState(true)
  const [modelsError, setModelsError] = useState(false)

  const [experimentName, setExperimentName] = useState('')

  const [aeName, setAeName] = useState('')
  const [aeVersions, setAeVersions] = useState<{ label: string; value: string }[]>([])
  const [aeVersion, setAeVersion] = useState('')
  const [loadingAeV, setLoadingAeV] = useState(false)

  const [drName, setDrName] = useState('')
  const [drVersions, setDrVersions] = useState<{ label: string; value: string }[]>([])
  const [drVersion, setDrVersion] = useState('')
  const [loadingDrV, setLoadingDrV] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchLiveModels('autoencoder'),
      fetchLiveModels('dimension_reduction'),
    ])
      .then(([ae, dr]) => { setAeModels(ae); setDrModels(dr) })
      .catch(() => setModelsError(true))
      .finally(() => setLoadingModels(false))
  }, [])

  useEffect(() => {
    if (!aeName) { setAeVersions([]); setAeVersion(''); return }
    setLoadingAeV(true); setAeVersion('')
    fetchLiveModelVersions(aeName)
      .then(setAeVersions)
      .catch(() => setAeVersions([]))
      .finally(() => setLoadingAeV(false))
  }, [aeName])

  useEffect(() => {
    if (!drName) { setDrVersions([]); setDrVersion(''); return }
    setLoadingDrV(true); setDrVersion('')
    fetchLiveModelVersions(drName)
      .then(setDrVersions)
      .catch(() => setDrVersions([]))
      .finally(() => setLoadingDrV(false))
  }, [drName])

  const canStart = !!experimentName.trim() && !!aeName && !!aeVersion && !!drName && !!drVersion

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px 10px',
    background: 'var(--bg)', color: 'var(--text-h)',
    border: '0.5px solid var(--border)', borderRadius: 6,
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--text)', fontSize: 12, padding: 0, marginBottom: '1rem' }}
      >
        <ArrowLeft size={13} /> Back to service check
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-h)' }}>Live mode setup</span>
        <StepBadge label="Step 2 of 2" />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: '1.25rem' }}>
        Configure models and experiment name.
      </div>

      {modelsError && (
        <Banner variant="err" style={{ marginBottom: '1rem' }}>
          <strong>Could not load models from MLflow.</strong> Check that MLflow is reachable.
        </Banner>
      )}

      <FieldLabel>Experiment name</FieldLabel>
      <input
        type="text"
        placeholder="e.g. exp_nafion_run_1"
        value={experimentName}
        onChange={e => setExperimentName(e.target.value)}
        style={{ ...inputStyle, marginBottom: '1.1rem' }}
      />

      <ModelSelect
        label="Autoencoder model"
        models={aeModels} modelName={aeName} onModelName={setAeName}
        versions={aeVersions} version={aeVersion} onVersion={setAeVersion}
        loadingModels={loadingModels} loadingVersions={loadingAeV}
      />

      <ModelSelect
        label="Dimension reduction model"
        models={drModels} modelName={drName} onModelName={setDrName}
        versions={drVersions} version={drVersion} onVersion={setDrVersion}
        loadingModels={loadingModels} loadingVersions={loadingDrV}
      />

      <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '0.5rem 0 1rem' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {canStart && (
            <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20,
              background: GREEN.pillBg, color: GREEN.pillText }}>
              ✓ Ready
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <GhostBtn onClick={onBack}>Cancel</GhostBtn>
          <GreenBtn
            disabled={!canStart}
            onClick={() => canStart && onStart({
              technique,
              experimentName: experimentName.trim(),
              autoencoderName: aeName, autoencoderVersion: aeVersion,
              dimredName: drName, dimredVersion: drVersion,
            })}
          >
            <Play size={13} /> Start live mode
          </GreenBtn>
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Loading ───────────────────────────────────────────────────────────

function LoadingStep() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '3rem 1.5rem', gap: 14 }}>
      <div style={{ width: 36, height: 36, border: `3px solid var(--border)`,
        borderTopColor: GREEN.border, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 14, color: 'var(--text-h)', fontWeight: 500 }}>Loading model…</div>
      <div style={{ fontSize: 12, color: 'var(--text)' }}>Fetching artifacts from MLflow</div>
    </div>
  )
}

// ── Live workspace ────────────────────────────────────────────────────────────

type WsStatus = 'connecting' | 'connected' | 'closed' | 'error'

interface LatentSpaceEvent {
  feature_vector: number[]
  autoencoder_model: string
  dimred_model: string
  experiment_name: string
  timestamp: number
}

function LiveWorkspace({ config, infra, onStop }: { config: LiveConfig; infra: InfraState | null; onStop: () => void }) {
  const [plotData, setPlotData]         = useState<FeatureVectorResponse | null>(null)
  const [timestamps, setTimestamps]     = useState<number[]>([])
  const [wsStatus, setWsStatus]         = useState<WsStatus>('connecting')
  const [paused, setPaused]             = useState(false)
  const [clearCount, setClearCount]     = useState(0)
  const [dataRevision, setDataRevision] = useState(0)
  const [msgCount, setMsgCount]         = useState(0)   // total messages received
  const [skipCount, setSkipCount]       = useState(0)   // messages filtered by model mismatch
  const bufferRef    = useRef<number[][]>([])
  const tsBufferRef  = useRef<number[]>([])
  const pausedRef    = useRef(false)
  const msgRef       = useRef(0)
  const skipRef      = useRef(0)

  // Keep pausedRef in sync so the interval closure sees the latest value
  useEffect(() => { pausedRef.current = paused }, [paused])

  // EventSource connection
  useEffect(() => {
      const es = new EventSource(`/api/v1/live/stream`)
      const aeTag = `${config.autoencoderName}:${config.autoencoderVersion}`
      const drTag = `${config.dimredName}:${config.dimredVersion}`

      es.onopen    = () => setWsStatus('connected')
      es.onerror   = () => setWsStatus('error')
      es.onmessage = (e) => {
          if (pausedRef.current) return
          msgRef.current += 1
          try {
              const msg: LatentSpaceEvent = JSON.parse(e.data)
              if (msg.autoencoder_model !== aeTag || msg.dimred_model !== drTag) {
                  skipRef.current += 1
                  return
              }
              bufferRef.current.push(msg.feature_vector)
              tsBufferRef.current.push(msg.timestamp)
          } catch (err) {
              console.warn('[SSE] parse error', err)
          }
      }
      return () => es.close()
  }, [config.autoencoderName, config.autoencoderVersion, config.dimredName, config.dimredVersion])


  // Drain buffer + counters into state every DEBOUNCE_MS
  useEffect(() => {
    const id = setInterval(() => {
      if (msgRef.current > 0) {
        setMsgCount(msgRef.current)
        setSkipCount(skipRef.current)
      }
      if (bufferRef.current.length === 0) return
      const batch = bufferRef.current.splice(0)
      const tsBatch = tsBufferRef.current.splice(0)
      setPlotData(prev => {
        const existing = prev?.vectors ?? []
        return { vectors: [...existing, ...batch], n_components: batch[0].length }
      })
      setTimestamps(prev => [...prev, ...tsBatch])
      setDataRevision(r => r + 1)
    }, DEBOUNCE_MS)
    return () => clearInterval(id)
  }, [])

  const wsStatusPill = {
    connecting: { label: 'connecting…', bg: 'var(--code-bg)',  text: 'var(--text)',    dot: 'var(--border)', border: 'var(--border)' },
    connected:  { label: 'streaming',   bg: GREEN.pillBg,       text: GREEN.pillText,   dot: GREEN.dot,       border: '#9FE1CB' },
    closed:     { label: 'disconnected',bg: RED.pillBg,         text: RED.pillText,     dot: RED.dot,         border: '#F09595' },
    error:      { label: 'error',       bg: RED.pillBg,         text: RED.pillText,     dot: RED.dot,         border: '#F09595' },
  }[wsStatus]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: `calc(100svh - ${HEADER_H}px)`, padding: '1.25rem', gap: 10, boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-h)' }}>Live mode</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500,
              padding: '3px 10px', borderRadius: 20, background: wsStatusPill.bg, color: wsStatusPill.text,
              border: `0.5px solid ${wsStatusPill.border}` }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: wsStatusPill.dot,
                animation: wsStatus === 'connected' ? 'pulse 2s ease-in-out infinite' : 'none' }} />
              {wsStatusPill.label}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 3 }}>
            Experiment: <strong style={{ color: 'var(--text-h)', fontWeight: 500 }}>{config.experimentName}</strong>
            <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
            AE: <strong style={{ color: 'var(--text-h)', fontWeight: 500 }}>{config.autoencoderName} v{config.autoencoderVersion}</strong>
            <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
            DR: <strong style={{ color: 'var(--text-h)', fontWeight: 500 }}>{config.dimredName} v{config.dimredVersion}</strong>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => { bufferRef.current = []; tsBufferRef.current = []; setPlotData(null); setTimestamps([]); setClearCount(c => c + 1) }}
            title="Clear plot"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'transparent', color: 'var(--text)', border: '0.5px solid var(--border)',
              borderRadius: 6, padding: '0 0.875rem', height: 34, fontSize: 13, cursor: 'pointer' }}
          >
            <Trash2 size={13} /> Clear
          </button>
          <button
            onClick={() => setPaused(p => !p)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
              background: paused ? 'var(--code-bg)' : 'transparent', color: 'var(--text)',
              border: '0.5px solid var(--border)', borderRadius: 6,
              padding: '0 0.875rem', height: 34, fontSize: 13, cursor: 'pointer' }}
          >
            {paused ? <Play size={13} /> : <Square size={13} />}
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={onStop}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'transparent', color: RED.pillText, border: `0.5px solid ${RED.dot}`,
              borderRadius: 6, padding: '0 0.875rem', height: 34, fontSize: 13, cursor: 'pointer' }}
          >
            <Square size={13} /> Stop
          </button>
        </div>
      </div>

      {/* Scatter plot */}
      <div style={{ flex: 1, minHeight: 0, borderRadius: 10, overflow: 'hidden' }}>
        <ScatterPlot
          data={plotData}
          onSelect={() => {}}
          onDeselect={() => {}}
          clearCount={clearCount}
          dataRevision={dataRevision}
          timestamps={timestamps}
        />
      </div>

      {/* Point count + service health strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        background: 'var(--code-bg)', borderRadius: 8, padding: '.5rem .875rem', fontSize: 11, color: 'var(--text)' }}>
        <span style={{ color: 'var(--text-h)', fontWeight: 500 }}>
          {plotData?.vectors.length ?? 0} pts
        </span>
        <span style={{ opacity: 0.5 }}>
          {msgCount} received{skipCount > 0 ? `, ${skipCount} filtered` : ''}
        </span>
        {infra && getServices(config.technique).map(svc => {
          const ok = infra[svc.readyKey]
          return (
            <span key={svc.readyKey} style={{ display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 7px', borderRadius: 20,
              background: ok ? GREEN.pillBg : RED.pillBg,
              color: ok ? GREEN.pillText : RED.pillText,
              border: `0.5px solid ${ok ? '#9FE1CB' : '#F09595'}` }}>
              {svc.name.split(' — ')[0]}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── Banner helper ─────────────────────────────────────────────────────────────

function Banner({ variant, children, style }: {
  variant: 'ok' | 'err'; children: React.ReactNode; style?: React.CSSProperties
}) {
  const c = variant === 'ok'
    ? { bg: GREEN.pillBg, border: '#9FE1CB', text: GREEN.pillText, Icon: CheckCircle2 }
    : { bg: RED.pillBg,   border: '#F09595', text: RED.pillText,   Icon: AlertCircle  }
  return (
    <div style={{ borderRadius: 8, padding: '.75rem 1rem', marginBottom: '1rem',
      display: 'flex', alignItems: 'flex-start', gap: 8,
      background: c.bg, border: `0.5px solid ${c.border}`, ...style }}>
      <c.Icon size={16} style={{ color: c.text, flexShrink: 0, marginTop: 1 }} />
      <div style={{ fontSize: 13, lineHeight: 1.6, color: c.text }}>{children}</div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
      color: 'var(--text)', marginBottom: 5 }}>{children}</div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LivePage() {
  const [step, setStep]               = useState<Step>('technique')
  const [technique, setTechnique]     = useState<Technique>('xps')
  const [infra, setInfra]             = useState<InfraState | null>(null)
  const [checking, setChecking]       = useState(false)
  const [infraError, setInfraError]   = useState<string | null>(null)
  const [liveConfig, setLiveConfig]   = useState<LiveConfig | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const runCheck = useCallback(async () => {
    setChecking(true)
    setInfraError(null)
    try {
      setInfra(await fetchInfraHealth())
    } catch (e) {
      setInfraError(e instanceof Error ? e.message : 'Health check failed')
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    runCheck()
    intervalRef.current = setInterval(runCheck, AUTO_RECHECK_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [runCheck])

  async function handleStart(cfg: LiveConfig) {
    setLiveConfig(cfg)
    setStep('loading')
    try {
      await startLive(
        `${cfg.autoencoderName}:${cfg.autoencoderVersion}`,
        `${cfg.dimredName}:${cfg.dimredVersion}`,
        cfg.experimentName,
      )
    } catch (e) {
      console.error('Failed to write model config to Redis:', e)
      // Proceed anyway — arroyo may still publish if keys were already set
    }
    setStep('streaming')
  }

  function handleStop() {
    stopLive().catch(e => console.error('Failed to clear Redis keys:', e))
    setStep('technique')
  }

  // Live workspace — no modal
  if (step === 'streaming' && liveConfig) {
    return (
      <>
        <LiveWorkspace config={liveConfig} infra={infra} onStop={handleStop} />
        <style>{`
          @keyframes spin  { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.3 } }
        `}</style>
      </>
    )
  }

  // Modal overlay — preflight / models / loading
  return (
    <>
      {/* Dimmed background hint */}
      <div style={{ padding: '3rem', textAlign: 'center', fontSize: 13, color: 'var(--text)', opacity: 0.25, userSelect: 'none' }}>
        Live streaming workspace
      </div>

      {/* Modal overlay */}
      <div style={{
        position: 'fixed', top: HEADER_H, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1500,
      }}>
        <div style={{
          background: 'var(--bg)', borderRadius: 12,
          border: '0.5px solid var(--border)',
          width: 760, maxWidth: '95vw',
          maxHeight: 'calc(90vh - 72px)',
          overflowY: 'auto',
          boxShadow: 'var(--shadow)',
        }}>
          {step === 'technique' && (
            <TechniqueStep onSelect={t => { setTechnique(t); setStep('preflight') }} />
          )}
          {step === 'preflight' && (
            <PreflightStep
              technique={technique}
              infra={infra}
              checking={checking}
              error={infraError}
              onRecheck={runCheck}
              onBack={() => setStep('technique')}
              onNext={() => setStep('models')}
            />
          )}
          {step === 'models' && (
            <ModelStep
              technique={technique}
              onBack={() => setStep('preflight')}
              onStart={handleStart}
            />
          )}
          {step === 'loading' && <LoadingStep />}
        </div>
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.3 } }
      `}</style>
    </>
  )
}
