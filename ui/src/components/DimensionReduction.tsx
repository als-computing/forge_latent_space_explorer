import { useEffect, useState } from 'react'
import { submitLatentSpaceJob } from '../api/jobs'
import { useJobStatus } from '../hooks/useJobStatus'
import type { DataProjectDict } from '../types/data'
import type { JobSubmitResponse } from '../types/jobs'
import type { ParameterValues } from '../types/models'
import JobRunSelect from './JobRunSelect'
import LogsModal from './LogsModal'
import MlflowModelSelect from './MlflowModelSelect'
import ModelSelect from './ModelSelect'

interface Props {
  dataProjectDict: DataProjectDict | null
  projectName: string
  currentJobId: string | null
  logTransform: boolean
  percentiles: [number, number]
  mask: string
  onJobSubmitted: (jobId: string) => void
  onShowFeatureVectors: () => void
}

const resultColor: Record<string, string> = {
  success: 'green',
  dev: '#6366f1',
  error: 'red',
}

const divider = <hr style={{ border: 'none', borderTop: '1px solid #dee2e6', margin: '16px 0' }} />

export default function DimensionReduction({
  dataProjectDict,
  projectName,
  currentJobId,
  logTransform,
  percentiles,
  mask,
  onJobSubmitted,
  onShowFeatureVectors,
}: Props) {
  const [mlflowModelId, setMlflowModelId] = useState<string | null>(null)
  const [dimRedModelName, setDimRedModelName] = useState<string | null>(null)
  const [dimRedParams, setDimRedParams] = useState<ParameterValues>({})
  const [jobName, setJobName] = useState('latent-space-job')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<JobSubmitResponse | null>(null)

  // Active job — set by new submission OR selection from past-jobs dropdown
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [showFV, setShowFV] = useState(false)

  const effectiveJobId = activeJobId ?? currentJobId
  const status = useJobStatus(effectiveJobId, 'latent-space', projectName)

  useEffect(() => {
    if (!(status?.ready)) setShowFV(false)
  }, [status?.ready])  // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelectPastJob(jobId: string | null) {
    if (!jobId) return
    setActiveJobId(jobId)
    onJobSubmitted(jobId)
    setResult(null)
    setShowFV(false)
  }

  function handleParamsChange(modelName: string, params: ParameterValues) {
    setDimRedModelName(modelName)
    setDimRedParams(params)
  }

  const canSubmit = !!dataProjectDict && !!mlflowModelId && !!dimRedModelName && !!projectName && !submitting

  async function handleSubmit() {
    if (!dataProjectDict || !mlflowModelId || !dimRedModelName) return
    setSubmitting(true)
    setResult(null)
    setShowFV(false)
    try {
      const res = await submitLatentSpaceJob({
        data_project_dict: dataProjectDict,
        model_name: dimRedModelName,
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
  }

  const statusColor = status
    ? status.ready ? 'green' : status.state === 'FAILED' || status.state === 'CRASHED' ? 'red' : '#f59e0b'
    : '#ccc'
  const statusLabel = status
    ? status.ready ? 'Results ready' : status.state ? `State: ${status.state}` : 'Checking…'
    : null

    console.log("status", status)

  return (
    <div>
      {/* ── New job submission ── */}
      <MlflowModelSelect value={mlflowModelId} onChange={setMlflowModelId} />

      <ModelSelect
        label="Dimension Reduction Model"
        modelType="dimension_reduction"
        onParamsChange={handleParamsChange}
      />

      <div style={{ marginBottom: 8 }}>
        <span style={{ fontWeight: 600 }}>Project Name</span>
        <div style={{ marginTop: 4, padding: 6, background: '#f8f9fa', borderRadius: 4, fontSize: 13, color: projectName ? '#212529' : '#999' }}>
          {projectName || 'Load data to generate'}
        </div>
      </div>

      <label style={{ display: 'block', marginBottom: 12 }}>
        Job Name
        <input
          type="text"
          value={jobName}
          onChange={(e) => setJobName(e.target.value)}
          style={{ display: 'block', width: '100%', marginTop: 4, padding: 6, boxSizing: 'border-box' }}
        />
      </label>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{ width: '100%', padding: '8px 0', marginBottom: 8, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
      >
        {submitting ? 'Submitting…' : 'Run Latent Space'}
      </button>

      {!dataProjectDict && (
        <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Load data first.</div>
      )}
      {dataProjectDict && !mlflowModelId && (
        <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Select an MLflow model above.</div>
      )}
      {result && (
        <div style={{ fontSize: 13, color: resultColor[result.status] ?? '#333', marginBottom: 8 }}>
          {result.message}
        </div>
      )}

      {divider}

      {/* ── Past jobs ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <JobRunSelect
            label="Past Latent Space Jobs"
            tags={['latent-space-explorer', 'latent-space']}
            value={effectiveJobId}
            onChange={handleSelectPastJob}
          />
        </div>
        <button
          onClick={() => setShowLogs(true)}
          disabled={!activeJobId}
          style={{ marginBottom: 12, padding: '6px 12px', whiteSpace: 'nowrap', cursor: activeJobId ? 'pointer' : 'not-allowed' }}
        >
          View Logs
        </button>
      </div>

      {/* Status indicator */}
      {effectiveJobId && status && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: statusColor, marginBottom: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
          {statusLabel}
        </div>
      )}

      {/* Show Feature Vectors toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: status?.ready ? 'pointer' : 'not-allowed', opacity: status?.ready ? 1 : 0.45 }}>
        <input
          type="checkbox"
          role="switch"
          checked={showFV}
          disabled={!status?.ready}
          onChange={e => handleToggleFV(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
        <span style={{ fontSize: 14 }}>Show Feature Vectors</span>
      </label>

      {/* Logs modal */}
      {showLogs && effectiveJobId && (
        <LogsModal jobId={effectiveJobId} onClose={() => setShowLogs(false)} />
      )}
    </div>
  )
}
