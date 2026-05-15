import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import FileBrowser from './FileBrowser'
import type { FileBrowserHandle } from './FileBrowser'
import type { DataProjectDict } from '../types/data'
import type { MlflowModelOption } from '../types/jobs'
import type { GuiParameter, Model, ParameterValues } from '../types/models'
import { fetchOverview } from '../api/data'
import { fetchMlflowModels, submitLatentSpaceJob } from '../api/jobs'
import { fetchModels } from '../api/models'
import { deriveProjectName } from '../utils/projectName'

const STEPS = ['Data', 'Preprocessing', 'Model', 'Confirm'] as const

export interface SessionConfig {
  mlflowModelId: string | null
  dimRedModelName: string | null
  dimRedParams: ParameterValues
  jobId: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  dataProjectDict: DataProjectDict | null
  hasData: boolean
  onClearData: () => void
  onDataLoad: (dict: DataProjectDict, config: SessionConfig | null) => void
  jobRunning?: boolean
  masks?: string[]
  logTransform: boolean
  onLogTransformChange: (v: boolean) => void
  percentiles: [number, number]
  onPercentilesChange: (v: [number, number]) => void
  mask: string
  onMaskChange: (v: string) => void
}

export default function SessionModal({ open, onClose, dataProjectDict, hasData, onClearData, onDataLoad, jobRunning: externalJobRunning, masks = ['None'], logTransform, onLogTransformChange, percentiles, onPercentilesChange, mask, onMaskChange }: Props) {
  const [step, setStep] = useState(1)
  const total = STEPS.length

  const fileBrowserRef = useRef<FileBrowserHandle | null>(null)
  const [fbSelection, setFbSelection] = useState<string | null>(null)
  const [launching, setLaunching] = useState(false)
  const [advancingStep, setAdvancingStep] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null)
  const [submittedJobLabel, setSubmittedJobLabel] = useState<string | null>(null)

  // DataProjectDict captured after step 1 load, used for preview + final launch
  const [previewDict, setPreviewDict] = useState<DataProjectDict | null>(null)


  // Model state (step 3)
  const [mlflowModelId, setMlflowModelId] = useState<string | null>(null)
  const [mlflowModelLabel, setMlflowModelLabel] = useState<string | null>(null)
  const [dimRedModelName, setDimRedModelName] = useState<string | null>(null)
  const [dimRedParams, setDimRedParams] = useState<ParameterValues>({})

  const launchedRef = useRef(false)

  useEffect(() => {
    if (open) {
      setStep(1)
      setLaunching(false)
      setAdvancingStep(false)
      setPreviewDict(dataProjectDict)
      if (dataProjectDict) {
        const uris = dataProjectDict.datasets.map(ds => ds.uri)
        setFbSelection(uris[0] + (uris.length > 1 ? ` +${uris.length - 1} more` : ''))
      } else {
        setFbSelection(null)
      }
      setLaunchError(null)
      setMlflowModelId(null)
      setMlflowModelLabel(null)
      setDimRedModelName(null)
      setDimRedParams({})
      setSubmittedJobId(null)
      setSubmittedJobLabel(null)
    } else {
      launchedRef.current = false
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  function handleFileBrowserLoad(dict: DataProjectDict) {
    setPreviewDict(dict)
  }

  async function handleNext() {
    if (step === 1) {
      setAdvancingStep(true)
      const success = await fileBrowserRef.current?.load()
      setAdvancingStep(false)
      if (!success) return
      setStep(2)
      return
    }
    setStep(s => Math.min(total, s + 1))
  }

  async function handleLaunch() {
    if (!previewDict) { setStep(1); return }

    // If no model selected, just load data without submitting a job
    if (!mlflowModelId || !dimRedModelName) {
      launchedRef.current = true
      onDataLoad(previewDict, null)
      onClose()
      return
    }

    setLaunching(true)
    setLaunchError(null)

    try {
      const uris = previewDict.datasets.map(ds => ds.uri)
      const projectName = await deriveProjectName(uris)
      const res = await submitLatentSpaceJob({
        data_project_dict: previewDict,
        model_name: dimRedModelName,
        model_parameters: dimRedParams,
        log_transform: logTransform,
        percentiles,
        mask: mask !== 'None' ? mask : null,
        job_name: 'latent-space-job',
        project_name: projectName,
        mlflow_model_id: mlflowModelId,
      })

      const config: SessionConfig = {
        mlflowModelId,
        dimRedModelName,
        dimRedParams,
        jobId: res.job_uid ?? null,
      }

      launchedRef.current = true
      onDataLoad(previewDict, config)
      // Stay open and show the running state instead of closing
      setSubmittedJobId(res.job_uid ?? null)
      setSubmittedJobLabel(
        [mlflowModelLabel, dimRedModelName].filter(Boolean).join(' · ') || 'Dim reduction'
      )
    } catch (e) {
      setLaunchError(e instanceof Error ? e.message : 'Job submission failed. Please try again.')
    } finally {
      setLaunching(false)
    }
  }

  const nextDisabled = step === 1 ? (!fbSelection || advancingStep) : false
  const nextLabel = advancingStep ? 'Loading…' : 'Next →'
  // Show the RunningPanel when a job was submitted in this modal session
  const showJobPanel = submittedJobId !== null || externalJobRunning
  // Job is complete once it was submitted here but is no longer running
  const isJobComplete = submittedJobId !== null && !externalJobRunning

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={showJobPanel && !isJobComplete ? undefined : onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 10,
          width: 720,
          maxWidth: '92vw',
          maxHeight: '88vh',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {showJobPanel ? (
          <RunningPanel
            jobLabel={submittedJobLabel}
            jobId={submittedJobId}
            complete={isJobComplete}
            onClose={onClose}
          />
        ) : (<>
        {/* Header */}
        <div style={{
          padding: '18px 24px 16px',
          borderBottom: '1px solid #dee2e6',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#212529' }}>
              Session Setup
            </div>
            <div style={{ fontSize: 12, color: '#6c757d', fontFamily: 'monospace', marginTop: 2 }}>
              Choose your data, preprocessing, and model before exploring
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close (Esc)"
            style={{
              marginLeft: 'auto',
              width: 32,
              height: 32,
              border: '1px solid #dee2e6',
              borderRadius: 6,
              background: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6c757d',
              flexShrink: 0,
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#dc3545'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#dc3545'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#dee2e6'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#6c757d'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Stepper */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 24px',
          borderBottom: '1px solid #dee2e6',
          flexShrink: 0,
        }}>
          {STEPS.map((label, i) => {
            const num = i + 1
            const isDone = num < step
            const isActive = num === step

            const numColor = isDone ? '#0a1a10' : isActive ? '#fff' : '#adb5bd'
            const numBg = isDone ? '#7dd3a8' : isActive ? '#0c63e4' : 'white'
            const numBorder = isDone ? '#7dd3a8' : isActive ? '#0c63e4' : '#dee2e6'
            const labelColor = isDone ? '#7dd3a8' : isActive ? '#0c63e4' : '#adb5bd'

            return (
              <div
                key={num}
                style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: isDone ? 'pointer' : 'default',
                    flexShrink: 0,
                  }}
                  onClick={() => { if (isDone) setStep(num) }}
                >
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: `1px solid ${numBorder}`,
                    background: numBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: numColor,
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}>
                    {isDone ? '✓' : num}
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontFamily: 'monospace',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: labelColor,
                    whiteSpace: 'nowrap',
                    transition: 'color 0.2s',
                  }}>
                    {num} · {label}
                  </span>
                </div>

                {i < STEPS.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: 1,
                    background: '#dee2e6',
                    margin: '0 10px',
                  }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Body — all panels stay mounted so the FileBrowser ref remains valid */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          minHeight: 260,
        }}>
          {/* Step 1: Data */}
          <div style={{ display: step === 1 ? 'block' : 'none' }}>
            <FileBrowser
              ref={fileBrowserRef}
              onLoad={handleFileBrowserLoad}
              hideLoadButton
              onSelectionChange={setFbSelection}
              initialMode={dataProjectDict?.data_type === 'tiled' ? 'tiled' : 'file'}
              initialFsSelected={
                dataProjectDict?.data_type === 'file' && dataProjectDict.root_uri
                  ? dataProjectDict.datasets.map(d =>
                      d.uri.startsWith(dataProjectDict.root_uri! + '/')
                        ? d.uri.slice(dataProjectDict.root_uri!.length + 1)
                        : d.uri
                    )
                  : undefined
              }
              initialTiledUri={dataProjectDict?.data_type === 'tiled' ? dataProjectDict.root_uri : undefined}
              initialTiledSelected={
                dataProjectDict?.data_type === 'tiled'
                  ? dataProjectDict.datasets.map(d => d.uri)
                  : undefined
              }
            />
          </div>

          {/* Step 2: Preprocessing */}
          <div style={{ display: step === 2 ? 'block' : 'none' }}>
            <Step2Preprocessing
              previewDict={previewDict}
              logTransform={logTransform}
              onLogTransformChange={onLogTransformChange}
              percentiles={percentiles}
              onPercentilesChange={onPercentilesChange}
              mask={mask}
              onMaskChange={onMaskChange}
              masks={masks}
            />
          </div>

          {/* Step 3: Model — always mounted to avoid re-fetching on navigation */}
          <div style={{ display: step === 3 ? 'block' : 'none' }}>
            <Step3Model
              mlflowModelId={mlflowModelId}
              onMlflowModelChange={(id, label) => { setMlflowModelId(id); setMlflowModelLabel(label) }}
              dimRedModelName={dimRedModelName}
              dimRedParams={dimRedParams}
              onDimRedChange={(name, params) => {
                setDimRedModelName(name)
                setDimRedParams(params)
              }}
            />
          </div>

          {/* Step 4: Confirm */}
          <div style={{ display: step === 4 ? 'block' : 'none' }}>
            <Step4Summary
              fbSelection={fbSelection}
              logTransform={logTransform}
              percentiles={percentiles}
              mask={mask}
              mlflowModelId={mlflowModelId}
              mlflowModelLabel={mlflowModelLabel}
              dimRedModelName={dimRedModelName}
              dimRedParams={dimRedParams}
              launching={launching}
              launchError={launchError}
              onLaunch={handleLaunch}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid #dee2e6',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
          background: '#f8f9fa',
          borderRadius: '0 0 10px 10px',
        }}>
          {hasData && (
            <button
              onClick={onClearData}
              style={{
                padding: '6px 14px',
                borderRadius: 5,
                border: '1px solid #dc3545',
                background: 'white',
                color: '#dc3545',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                letterSpacing: '0.04em',
                transition: 'background 0.15s, color 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#dc3545'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'white'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'white'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#dc3545'
              }}
            >
              Clear data
            </button>
          )}

          <button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            style={{
              padding: '7px 16px',
              borderRadius: 5,
              border: '1px solid #dee2e6',
              background: 'transparent',
              color: step === 1 ? '#adb5bd' : '#495057',
              cursor: step === 1 ? 'default' : 'pointer',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              letterSpacing: '0.06em',
              opacity: step === 1 ? 0.45 : 1,
              flexShrink: 0,
            }}
          >
            ← Back
          </button>

          <div style={{
            flex: 1,
            height: 3,
            background: '#dee2e6',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              background: '#0c63e4',
              borderRadius: 2,
              width: `${(step / total) * 100}%`,
              transition: 'width 0.3s',
            }} />
          </div>

          {step < total ? (
            <button
              onClick={handleNext}
              disabled={nextDisabled}
              style={{
                padding: '7px 20px',
                borderRadius: 5,
                border: 'none',
                background: nextDisabled ? '#adb5bd' : '#0c63e4',
                color: 'white',
                cursor: nextDisabled ? 'default' : 'pointer',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                fontWeight: 500,
                letterSpacing: '0.06em',
                flexShrink: 0,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { if (!nextDisabled) (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
            >
              {nextLabel}
            </button>
          ) : null}
        </div>
        </>)}
      </div>
    </div>
  )
}

// ---------- Step 2: Preprocessing ----------

function Step2Preprocessing({
  previewDict,
  logTransform,
  onLogTransformChange,
  percentiles,
  onPercentilesChange,
  mask,
  onMaskChange,
  masks,
}: {
  previewDict: DataProjectDict | null
  logTransform: boolean
  onLogTransformChange: (v: boolean) => void
  percentiles: [number, number]
  onPercentilesChange: (v: [number, number]) => void
  mask: string
  onMaskChange: (v: string) => void
  masks: string[]
}) {
  const [rawImage, setRawImage] = useState<string | null>(null)
  const [transformedImage, setTransformedImage] = useState<string | null>(null)
  const [rawLoading, setRawLoading] = useState(false)
  const [transformedLoading, setTransformedLoading] = useState(false)

  useEffect(() => {
    if (!previewDict) return
    setRawLoading(true)
    fetchOverview({
      data_project_dict: previewDict,
      log_transform: false,
      percentiles: [0, 100],
      page: 0,
      page_size: 1,
    })
      .then(r => setRawImage(r.images[0] ?? null))
      .catch(() => setRawImage(null))
      .finally(() => setRawLoading(false))
  }, [previewDict])

  useEffect(() => {
    if (!previewDict) return
    const id = setTimeout(() => {
      setTransformedLoading(true)
      fetchOverview({
        data_project_dict: previewDict,
        log_transform: logTransform,
        percentiles,
        page: 0,
        page_size: 1,
      })
        .then(r => setTransformedImage(r.images[0] ?? null))
        .catch(() => setTransformedImage(null))
        .finally(() => setTransformedLoading(false))
    }, 300)
    return () => clearTimeout(id)
  }, [previewDict, logTransform, percentiles])

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#6c757d',
    marginBottom: 6,
    letterSpacing: '0.05em',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'white',
    border: '1px solid #dee2e6',
    borderRadius: 4,
    padding: '5px 8px',
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#212529',
    boxSizing: 'border-box',
  }

  return (
    <div>
      <SectionTitle>Data transformation</SectionTitle>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={labelStyle}>Log transform</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {([true, false] as const).map(v => (
                <button
                  key={String(v)}
                  onClick={() => onLogTransformChange(v)}
                  style={{
                    flex: 1,
                    padding: '5px 0',
                    border: '1px solid',
                    borderColor: logTransform === v ? '#0c63e4' : '#dee2e6',
                    borderRadius: 4,
                    background: logTransform === v ? '#0c63e4' : 'white',
                    color: logTransform === v ? 'white' : '#495057',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    transition: 'all 0.15s',
                  }}
                >
                  {v ? 'On' : 'Off'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={labelStyle}>Mask</div>
            <select
              value={mask}
              onChange={e => onMaskChange(e.target.value)}
              style={inputStyle}
            >
              {masks.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={labelStyle}>Min percentile clip</div>
            <input
              type="number"
              value={percentiles[0]}
              min={0}
              max={percentiles[1] - 1}
              onChange={e => onPercentilesChange([Number(e.target.value), percentiles[1]])}
              style={inputStyle}
            />
          </div>
          <div>
            <div style={labelStyle}>Max percentile clip</div>
            <input
              type="number"
              value={percentiles[1]}
              min={percentiles[0] + 1}
              max={100}
              onChange={e => onPercentilesChange([percentiles[0], Number(e.target.value)])}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      <SectionTitle>Transform preview</SectionTitle>

      {!previewDict ? (
        <div style={{
          padding: 16,
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: 6,
          fontSize: 12,
          color: '#6c757d',
          fontFamily: 'monospace',
          textAlign: 'center',
        }}>
          No dataset selected — go back to Step 1
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...labelStyle, textAlign: 'center', marginBottom: 5 }}>Raw</div>
            <PreviewImagePanel image={rawImage} loading={rawLoading} />
          </div>

          <div style={{ color: '#adb5bd', fontSize: 18, flexShrink: 0, paddingTop: 28 }}>→</div>

          <div style={{ flex: 1 }}>
            <div style={{
              ...labelStyle,
              color: '#0c63e4',
              textAlign: 'center',
              marginBottom: 5,
            }}>
              Transformed
            </div>
            <PreviewImagePanel
              image={transformedImage}
              loading={transformedLoading}
              borderColor="rgba(12,99,228,0.25)"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function PreviewImagePanel({
  image,
  loading,
  borderColor = '#dee2e6',
}: {
  image: string | null
  loading: boolean
  borderColor?: string
}) {
  return (
    <div style={{
      background: '#f0f2f5',
      border: `1px solid ${borderColor}`,
      borderRadius: 5,
      height: 120,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {loading ? (
        <span style={{ fontSize: 12, color: '#adb5bd', fontFamily: 'monospace' }}>Loading…</span>
      ) : image ? (
        <img
          src={image}
          alt="preview"
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      ) : (
        <span style={{ fontSize: 12, color: '#adb5bd', fontFamily: 'monospace' }}>No preview</span>
      )}
    </div>
  )
}

// ---------- Step 3: Model ----------

function Step3Model({
  mlflowModelId,
  onMlflowModelChange,
  dimRedModelName,
  dimRedParams,
  onDimRedChange,
}: {
  mlflowModelId: string | null
  onMlflowModelChange: (id: string | null, label: string | null) => void
  dimRedModelName: string | null
  dimRedParams: ParameterValues
  onDimRedChange: (modelName: string, params: ParameterValues) => void
}) {
  const [mlflowModels, setMlflowModels] = useState<MlflowModelOption[]>([])
  const [mlflowLoading, setMlflowLoading] = useState(false)
  const [mlflowError, setMlflowError] = useState<string | null>(null)

  const [dimRedModels, setDimRedModels] = useState<Model[]>([])
  const [selectedDimRed, setSelectedDimRed] = useState<Model | null>(null)
  const [dimRedLoading, setDimRedLoading] = useState(false)
  const [dimRedError, setDimRedError] = useState<string | null>(null)

  function defaultValues(model: Model): ParameterValues {
    return Object.fromEntries(model.gui_parameters.map(p => [p.param_key, p.value]))
  }

  useEffect(() => {
    setMlflowLoading(true)
    fetchMlflowModels()
      .then(data => {
        setMlflowModels(data)
      })
      .catch(e => setMlflowError(e instanceof Error ? e.message : 'Failed to load MLflow models'))
      .finally(() => setMlflowLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDimRedLoading(true)
    fetchModels('dimension_reduction')
      .then(data => {
        setDimRedModels(data)
        if (data.length > 0) {
          // Restore previously selected model or default to first
          const found = dimRedModelName ? data.find(m => m.model_name === dimRedModelName) : null
          const initial = found ?? data[0]
          setSelectedDimRed(initial)
          if (!dimRedModelName) {
            const defs = defaultValues(initial)
            onDimRedChange(initial.model_name, defs)
          }
        }
      })
      .catch(e => setDimRedError(e instanceof Error ? e.message : 'Failed to load dim reduction models'))
      .finally(() => setDimRedLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleDimRedModelChange(name: string) {
    const model = dimRedModels.find(m => m.model_name === name) ?? null
    setSelectedDimRed(model)
    if (model) {
      const defs = defaultValues(model)
      onDimRedChange(model.model_name, defs)
    }
  }

  function handleParamChange(key: string, value: number) {
    if (!selectedDimRed) return
    const next = { ...dimRedParams, [key]: value }
    onDimRedChange(selectedDimRed.model_name, next)
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#6c757d',
    marginBottom: 5,
    letterSpacing: '0.05em',
  }

  return (
    <div>
      {/* ── Autoencoder model ── */}
      <SectionTitle>Autoencoder model</SectionTitle>

      {mlflowLoading && (
        <div style={{ fontSize: 12, color: '#6c757d', fontFamily: 'monospace', marginBottom: 16 }}>
          Loading models…
        </div>
      )}
      {mlflowError && (
        <div style={{ fontSize: 12, color: '#dc3545', fontFamily: 'monospace', marginBottom: 16 }}>
          {mlflowError}
        </div>
      )}
      {!mlflowLoading && !mlflowError && mlflowModels.length === 0 && (
        <div style={{
          fontSize: 12, color: '#6c757d', fontFamily: 'monospace',
          background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 6,
          padding: '12px 16px', marginBottom: 16, textAlign: 'center',
        }}>
          No MLflow models available. Register a model to enable automatic job submission.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
        {mlflowModels.map(model => {
          const id = model.value ?? model.label
          const isSelected = mlflowModelId === model.value
          return (
            <ModelCard
              key={id}
              label={model.label}
              selected={isSelected}
              status={null}
              onClick={() => isSelected
                ? onMlflowModelChange(null, null)
                : onMlflowModelChange(model.value ?? null, model.label)
              }
            />
          )
        })}
      </div>

      {/* ── Dimension reduction ── */}
      <SectionTitle>Dimension reduction</SectionTitle>

      {dimRedLoading && (
        <div style={{ fontSize: 12, color: '#6c757d', fontFamily: 'monospace', marginBottom: 12 }}>
          Loading algorithms…
        </div>
      )}
      {dimRedError && (
        <div style={{ fontSize: 12, color: '#dc3545', fontFamily: 'monospace', marginBottom: 12 }}>
          {dimRedError}
        </div>
      )}
      {!dimRedLoading && !dimRedError && dimRedModels.length === 0 && (
        <div style={{
          fontSize: 12, color: '#6c757d', fontFamily: 'monospace',
          background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 6,
          padding: '12px 16px', marginBottom: 16, textAlign: 'center',
        }}>
          No dimension reduction models registered.
        </div>
      )}

      {dimRedModels.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {/* Algorithm + parameters in a 2-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={labelStyle}>Algorithm</div>
              <select
                value={selectedDimRed?.model_name ?? ''}
                onChange={e => handleDimRedModelChange(e.target.value)}
                style={{
                  width: '100%',
                  background: 'white',
                  border: '1px solid #dee2e6',
                  borderRadius: 4,
                  padding: '5px 8px',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: '#212529',
                  boxSizing: 'border-box',
                }}
              >
                {dimRedModels.map(m => (
                  <option key={m.model_name} value={m.model_name}>{m.model_name}</option>
                ))}
              </select>
            </div>

            {selectedDimRed?.gui_parameters.map(param => (
              <div key={param.param_key}>
                <div style={labelStyle}>{param.title}</div>
                <InlineParamInput
                  param={param}
                  value={dimRedParams[param.param_key] ?? param.value}
                  onChange={handleParamChange}
                />
              </div>
            ))}
          </div>

          {selectedDimRed?.description && (
            <div style={{
              fontSize: 11, color: '#6c757d', fontFamily: 'monospace',
              background: '#f8f9fa', border: '1px solid #dee2e6',
              borderRadius: 4, padding: '6px 8px', marginBottom: 12,
            }}>
              {selectedDimRed.description}
            </div>
          )}
        </div>
      )}

      {/* Warning note */}
      <div style={{
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: 5,
        padding: '8px 10px',
        fontSize: 11,
        color: '#664d03',
        lineHeight: 1.55,
        display: 'flex',
        gap: 7,
        alignItems: 'flex-start',
      }}>
        <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
        Changing the model after a session has started will clear all vectors and cluster results. 
      </div>
    </div>
  )
}

const MODEL_STATUS_MAP: Record<string, { dot: string; label: string }> = {
  READY: { dot: '#198754', label: 'Ready' },
  PENDING_REGISTRATION: { dot: '#f59e0b', label: 'Registering…' },
  FAILED_REGISTRATION: { dot: '#dc3545', label: 'Failed' },
}

function ModelCard({
  label,
  selected,
  status,
  onClick,
}: {
  label: string
  selected: boolean
  status: string | null
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const statusInfo = status ? (MODEL_STATUS_MAP[status] ?? { dot: '#adb5bd', label: status }) : null

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? 'rgba(12,99,228,0.05)' : hovered ? '#f8f9fa' : 'white',
        border: `${selected ? 2 : 1}px solid ${selected ? '#0c63e4' : hovered ? '#adb5bd' : '#dee2e6'}`,
        borderRadius: 6,
        padding: selected ? '9px 11px' : '10px 12px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        minHeight: 62,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#212529', wordBreak: 'break-all' }}>
        {label}
      </div>
      {statusInfo && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          marginTop: 6,
        }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: statusInfo.dot,
            flexShrink: 0,
            display: 'inline-block',
          }} />
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#6c757d' }}>
            {statusInfo.label}
          </span>
        </div>
      )}
    </div>
  )
}

function InlineParamInput({
  param,
  value,
  onChange,
}: {
  param: GuiParameter
  value: number
  onChange: (key: string, value: number) => void
}) {
  const baseStyle: React.CSSProperties = {
    width: '100%',
    background: 'white',
    border: '1px solid #dee2e6',
    borderRadius: 4,
    padding: '5px 8px',
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#212529',
    boxSizing: 'border-box',
  }

  if (param.type === 'dropdown') {
    return (
      <select
        value={value}
        onChange={e => onChange(param.param_key, Number(e.target.value))}
        style={baseStyle}
      >
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
          type="range"
          min={param.min} max={param.max} step={param.step}
          value={value}
          onChange={e => onChange(param.param_key, Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#6c757d' }}>{value}</span>
      </div>
    )
  }

  return (
    <input
      type="number"
      value={value}
      step={param.type === 'float' ? 0.01 : 1}
      min={param.min}
      max={param.max}
      onChange={e => onChange(param.param_key, Number(e.target.value))}
      style={baseStyle}
    />
  )
}

// ---------- Shared ----------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'monospace',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: '#6c757d',
      marginBottom: 12,
    }}>
      {children}
    </div>
  )
}

// ---------- Step 4: Confirm ----------

function SumItem({ label, value, accent }: { label: string; value: string; accent?: 'blue' | 'green' }) {
  const color = accent === 'blue' ? '#0c63e4' : accent === 'green' ? '#198754' : '#212529'
  return (
    <div style={{
      background: '#f8f9fa',
      borderRadius: 5,
      padding: '8px 10px',
      border: '1px solid #dee2e6',
    }}>
      <div style={{
        fontSize: 9,
        fontFamily: 'monospace',
        color: '#6c757d',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 12,
        fontFamily: 'monospace',
        color,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {value}
      </div>
    </div>
  )
}

function Step4Summary({
  fbSelection,
  logTransform,
  percentiles,
  mask,
  mlflowModelId,
  mlflowModelLabel,
  dimRedModelName,
  dimRedParams,
  launching,
  launchError,
  onLaunch,
}: {
  fbSelection: string | null
  logTransform: boolean
  percentiles: [number, number]
  mask: string
  mlflowModelId: string | null
  mlflowModelLabel: string | null
  dimRedModelName: string | null
  dimRedParams: ParameterValues
  launching: boolean
  launchError: string | null
  onLaunch: () => void
}) {
  const canLaunch = !!fbSelection && !launching
  const hasModel = !!mlflowModelId && !!dimRedModelName

  // Build a short params summary string
  const paramSummary = Object.entries(dimRedParams)
    .map(([k, v]) => `${k}=${v}`)
    .join(' · ') || '—'

  return (
    <div>
      <SectionTitle>Session summary</SectionTitle>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
        {/* Dataset — full width */}
        <div style={{
          gridColumn: '1 / -1',
          background: '#f8f9fa',
          borderRadius: 5,
          padding: '8px 10px',
          border: '1px solid #dee2e6',
        }}>
          <div style={{
            fontSize: 9,
            fontFamily: 'monospace',
            color: '#6c757d',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 3,
          }}>
            Dataset
          </div>
          <div style={{
            fontSize: 12,
            fontFamily: 'monospace',
            color: fbSelection ? '#0c63e4' : '#adb5bd',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {fbSelection ?? 'No data selected — go back to Step 1'}
          </div>
        </div>

        <SumItem label="Log transform" value={logTransform ? 'On' : 'Off'} accent={logTransform ? 'green' : undefined} />
        <SumItem label="Percentile clip" value={`${percentiles[0]}% – ${percentiles[1]}%`} />
        <SumItem label="Mask" value={mask} />
        <SumItem label="Frames" value="0 → all" />
        <SumItem
          label="Autoencoder"
          value={mlflowModelLabel ?? '—'}
          accent={mlflowModelId ? 'blue' : undefined}
        />
        <SumItem
          label="Dim reduction"
          value={dimRedModelName ?? '—'}
          accent={dimRedModelName ? 'blue' : undefined}
        />
        {hasModel && (
          <div style={{ gridColumn: '1 / -1' }}>
            <SumItem label="Dim reduction params" value={paramSummary} />
          </div>
        )}
      </div>

      {hasModel ? (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: 5,
          padding: '8px 10px',
          fontSize: 11,
          color: '#664d03',
          lineHeight: 1.55,
          display: 'flex',
          gap: 7,
          alignItems: 'flex-start',
          marginBottom: 16,
        }}>
          <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
          Running will submit a Prefect job for dimension reduction. This may take 30–90 seconds depending on dataset size. Results will stream into the latent space view when ready.
        </div>
      ) : (
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: 5,
          padding: '8px 10px',
          fontSize: 11,
          color: '#6c757d',
          lineHeight: 1.55,
          display: 'flex',
          gap: 7,
          alignItems: 'flex-start',
          marginBottom: 16,
        }}>
          <span style={{ flexShrink: 0, marginTop: 1 }}>ℹ</span>
          No model selected — the session will load data only. You can run dimension reduction from the sidebar after launching.
        </div>
      )}

      {launchError && (
        <div style={{
          background: '#f8d7da',
          border: '1px solid #f5c2c7',
          borderRadius: 5,
          padding: '8px 10px',
          fontSize: 11,
          color: '#842029',
          fontFamily: 'monospace',
          marginBottom: 16,
          display: 'flex',
          gap: 7,
          alignItems: 'flex-start',
        }}>
          <span style={{ flexShrink: 0 }}>✕</span>
          {launchError}
        </div>
      )}

      <button
        onClick={onLaunch}
        disabled={!canLaunch}
        style={{
          width: '100%',
          padding: 11,
          background: canLaunch ? '#0c63e4' : '#adb5bd',
          border: 'none',
          borderRadius: 6,
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: canLaunch ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => { if (canLaunch) (e.currentTarget as HTMLButtonElement).style.opacity = '0.88' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
      >
        <span style={{ fontSize: 14 }}>▶</span>
        {launching
          ? 'Submitting job…'
          : hasModel
            ? 'Submit & Run Dim Reduction'
            : 'Launch Session'
        }
      </button>
    </div>
  )
}

// ---------- RunningPanel ----------

function RunningPanel({
  jobLabel,
  jobId,
  complete,
  onClose,
}: {
  jobLabel: string | null
  jobId: string | null
  complete: boolean
  onClose: () => void
}) {
  if (complete) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: '#d1fae5', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, color: '#212529', marginBottom: 6 }}>
          Dimension reduction complete
        </div>

        {jobLabel && (
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#059669', marginBottom: 20 }}>
            {jobLabel}
          </div>
        )}

        <div style={{
          fontSize: 12, color: '#6c757d', lineHeight: 1.6,
          textAlign: 'center', maxWidth: 340, marginBottom: 24,
        }}>
          Latent space vectors are ready. Head to the Explore page to view results.
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '8px 24px',
            border: 'none', borderRadius: 6,
            background: '#0c63e4', color: 'white',
            fontFamily: 'monospace', fontSize: 12,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 32px',
    }}>
      {/* Spinner */}
      <div style={{ width: 52, height: 52, marginBottom: 20 }}>
        <svg viewBox="0 0 52 52" style={{ width: '100%', height: '100%' }}>
          <style>{`@keyframes lse-spin { to { stroke-dashoffset: -138; } }`}</style>
          <circle cx="26" cy="26" r="22" fill="none" stroke="#fde8c0" strokeWidth="3" />
          <circle
            cx="26" cy="26" r="22" fill="none"
            stroke="#f59e0b" strokeWidth="3"
            strokeDasharray="35 103" strokeLinecap="round"
            style={{ animation: 'lse-spin 1.4s linear infinite', transformOrigin: 'center' }}
          />
        </svg>
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: '#212529', marginBottom: 6 }}>
        Dimension reduction running
      </div>

      {jobLabel && (
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#f59e0b', marginBottom: 20 }}>
          {jobLabel}
        </div>
      )}

      {/* Indeterminate progress bar */}
      <div style={{
        width: '100%', maxWidth: 380,
        height: 3, background: '#fde8c0', borderRadius: 2,
        overflow: 'hidden', marginBottom: 8,
      }}>
        <style>{`
          @keyframes lse-indeterminate {
            0%   { transform: translateX(-100%); width: 40%; }
            50%  { width: 60%; }
            100% { transform: translateX(280%); width: 40%; }
          }
        `}</style>
        <div style={{
          height: '100%', background: '#f59e0b', borderRadius: 2,
          animation: 'lse-indeterminate 2.2s ease-in-out infinite',
        }} />
      </div>

      {jobId && (
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#adb5bd', marginBottom: 20 }}>
          job {jobId.slice(0, 8)}…
        </div>
      )}

      <div style={{
        fontSize: 12, color: '#6c757d', lineHeight: 1.6,
        textAlign: 'center', maxWidth: 340, marginBottom: 24,
      }}>
        Results will appear in the latent space view when complete.
        You can close this dialog and return later.
      </div>

      <button
        onClick={onClose}
        style={{
          padding: '8px 24px',
          border: '1px solid #dee2e6', borderRadius: 6,
          background: 'white', color: '#495057',
          fontFamily: 'monospace', fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Close
      </button>
    </div>
  )
}
