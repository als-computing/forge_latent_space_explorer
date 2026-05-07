import { useEffect, useState } from 'react'
import { submitLatentSpaceJob } from '../api/jobs'
import { useJobStatus } from '../hooks/useJobStatus'
import type { DataProjectDict } from '../types/data'
import type { JobSubmitResponse } from '../types/jobs'
import type { ParameterValues } from '../types/models'
import MlflowModelSelect from './MlflowModelSelect'
import ModelSelect from './ModelSelect'

interface Props {
  dataProjectDict: DataProjectDict | null
  logTransform: boolean
  percentiles: [number, number]
  mask: string
  onJobSubmitted: (jobId: string) => void
  onProjectNameChange: (name: string) => void
  onReadyChange: (ready: boolean) => void
}

const resultColor: Record<string, string> = {
  success: 'green',
  dev: '#6366f1',
  error: 'red',
}

export default function DimensionReduction({
  dataProjectDict,
  logTransform,
  percentiles,
  mask,
  onJobSubmitted,
  onProjectNameChange,
  onReadyChange,
}: Props) {
  const [mlflowModelId, setMlflowModelId] = useState<string | null>(null)
  const [dimRedModelName, setDimRedModelName] = useState<string | null>(null)
  const [dimRedParams, setDimRedParams] = useState<ParameterValues>({})
  const [projectName, setProjectName] = useState('my-project')
  const [jobName, setJobName] = useState('latent-space-job')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<JobSubmitResponse | null>(null)
  const [latentSpaceJobId, setLatentSpaceJobId] = useState<string | null>(null)

  const status = useJobStatus(latentSpaceJobId, 'latent-space', projectName)

  useEffect(() => {
    onReadyChange(status?.ready ?? false)
  }, [status?.ready])  // eslint-disable-line react-hooks/exhaustive-deps

  function handleProjectNameChange(name: string) {
    setProjectName(name)
    onProjectNameChange(name)
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
        setLatentSpaceJobId(res.job_uid)
        onJobSubmitted(res.job_uid)
      }
    } catch (e) {
      setResult({ job_uid: null, message: e instanceof Error ? e.message : 'Unknown error', status: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const statusColor = status
    ? status.ready ? 'green' : status.state === 'FAILED' || status.state === 'CRASHED' ? 'red' : '#f59e0b'
    : '#ccc'
  const statusLabel = status
    ? status.ready ? 'Results ready' : status.state ? `State: ${status.state}` : 'Checking…'
    : null

  return (
    <div>
      <MlflowModelSelect value={mlflowModelId} onChange={setMlflowModelId} />

      <ModelSelect
        label="Dimension Reduction Model"
        modelType="dimension_reduction"
        onParamsChange={handleParamsChange}
      />

      <label style={{ display: 'block', marginBottom: 8 }}>
        <span style={{ fontWeight: 600 }}>Project Name</span>
        <input
          type="text"
          value={projectName}
          onChange={(e) => handleProjectNameChange(e.target.value)}
          style={{ display: 'block', width: '100%', marginTop: 4, padding: 6, boxSizing: 'border-box' }}
        />
      </label>

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

      {status && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: statusColor }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
          {statusLabel}
        </div>
      )}
    </div>
  )
}
