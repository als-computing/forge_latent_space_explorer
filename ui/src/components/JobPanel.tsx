import { useState } from 'react'
import { submitClusteringJob, submitLatentSpaceJob } from '../api/jobs'
import type { DataProjectDict } from '../types/data'
import type { JobSubmitResponse } from '../types/jobs'
import type { ParameterValues } from '../types/models'
import JobRunSelect from './JobRunSelect'

interface Props {
  dataProjectDict: DataProjectDict | null
  dimRedModelName: string | null
  dimRedParams: ParameterValues
  clusteringModelName: string | null
  clusteringParams: ParameterValues
  mlflowModelId: string | null
  latentSpaceJobId: string | null
  onLatentSpaceJobSubmitted: (jobId: string) => void
}

const statusColor: Record<string, string> = {
  success: 'green',
  dev: '#6366f1',
  error: 'red',
}

function StatusMessage({ result }: { result: JobSubmitResponse | null }) {
  if (!result) return null
  return (
    <div style={{ marginTop: 8, fontSize: 13, color: statusColor[result.status] ?? '#333' }}>
      {result.message}
    </div>
  )
}

export default function JobPanel({
  dataProjectDict,
  dimRedModelName,
  dimRedParams,
  clusteringModelName,
  clusteringParams,
  mlflowModelId,
  latentSpaceJobId,
  onLatentSpaceJobSubmitted,
}: Props) {
  const [projectName, setProjectName] = useState('')
  const [lsJobName, setLsJobName] = useState('latent-space-job')
  const [clJobName, setClJobName] = useState('clustering-job')
  const [lsSubmitting, setLsSubmitting] = useState(false)
  const [clSubmitting, setClSubmitting] = useState(false)
  const [lsResult, setLsResult] = useState<JobSubmitResponse | null>(null)
  const [clResult, setClResult] = useState<JobSubmitResponse | null>(null)
  // Allows picking a past run instead of only using one submitted this session
  const [selectedLsJobId, setSelectedLsJobId] = useState<string | null>(null)

  const activeLsJobId = latentSpaceJobId ?? selectedLsJobId

  const canSubmitLatentSpace =
    !!dataProjectDict && !!dimRedModelName && !!mlflowModelId && !!projectName && !lsSubmitting

  const canSubmitClustering =
    !!activeLsJobId && !!clusteringModelName && !!projectName && !clSubmitting

  async function handleLatentSpaceSubmit() {
    if (!dataProjectDict || !dimRedModelName || !mlflowModelId) return
    setLsSubmitting(true)
    setLsResult(null)
    try {
      const result = await submitLatentSpaceJob({
        data_project_dict: dataProjectDict,
        model_name: dimRedModelName,
        model_parameters: dimRedParams,
        job_name: lsJobName,
        project_name: projectName,
        mlflow_model_id: mlflowModelId,
      })
      setLsResult(result)
      if (result.job_uid) onLatentSpaceJobSubmitted(result.job_uid)
    } catch (e) {
      setLsResult({
        job_uid: null,
        message: e instanceof Error ? e.message : 'Unknown error',
        status: 'error',
      })
    } finally {
      setLsSubmitting(false)
    }
  }

  async function handleClusteringSubmit() {
    if (!activeLsJobId || !clusteringModelName) return
    setClSubmitting(true)
    setClResult(null)
    try {
      const result = await submitClusteringJob({
        model_name: clusteringModelName,
        model_parameters: clusteringParams,
        job_name: clJobName,
        project_name: projectName,
        dimension_reduction_job_id: activeLsJobId,
      })
      setClResult(result)
    } catch (e) {
      setClResult({
        job_uid: null,
        message: e instanceof Error ? e.message : 'Unknown error',
        status: 'error',
      })
    } finally {
      setClSubmitting(false)
    }
  }

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 6, padding: 16, marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>Job Submission</h3>

      <label style={{ display: 'block', marginBottom: 12 }}>
        <span style={{ fontWeight: 600 }}>Project Name</span>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="my-project"
          style={{ display: 'block', width: '100%', marginTop: 4, padding: 6, boxSizing: 'border-box' }}
        />
      </label>

      {/* Latent Space */}
      <div style={{ borderTop: '1px solid #eee', paddingTop: 12, marginBottom: 12 }}>
        <h4 style={{ marginTop: 0, marginBottom: 8 }}>Latent Space Extraction</h4>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Job Name
          <input
            type="text"
            value={lsJobName}
            onChange={(e) => setLsJobName(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4, padding: 6, boxSizing: 'border-box' }}
          />
        </label>
        <button onClick={handleLatentSpaceSubmit} disabled={!canSubmitLatentSpace}>
          {lsSubmitting ? 'Submitting…' : 'Run Latent Space'}
        </button>
        {!mlflowModelId && (
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            Select an MLflow model above first.
          </div>
        )}
        <StatusMessage result={lsResult} />
      </div>

      {/* Clustering */}
      <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
        <h4 style={{ marginTop: 0, marginBottom: 8 }}>Clustering</h4>
        <JobRunSelect
          label="Latent Space Run"
          tags={['latent-space-explorer', 'latent-space']}
          value={latentSpaceJobId ?? selectedLsJobId}
          onChange={setSelectedLsJobId}
        />
        <label style={{ display: 'block', marginBottom: 8 }}>
          Job Name
          <input
            type="text"
            value={clJobName}
            onChange={(e) => setClJobName(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4, padding: 6, boxSizing: 'border-box' }}
          />
        </label>
        <button onClick={handleClusteringSubmit} disabled={!canSubmitClustering}>
          {clSubmitting ? 'Submitting…' : 'Run Clustering'}
        </button>
        {!activeLsJobId && (
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            Submit or select a latent space run above first.
          </div>
        )}
        <StatusMessage result={clResult} />
      </div>
    </div>
  )
}
