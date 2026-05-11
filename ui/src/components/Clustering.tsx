import { useEffect, useState } from 'react'
import { submitClusteringJob } from '../api/jobs'
import { useJobStatus } from '../hooks/useJobStatus'
import type { JobSubmitResponse } from '../types/jobs'
import type { ParameterValues } from '../types/models'
import JobRunSelect from './JobRunSelect'
import LogsModal from './LogsModal'
import ModelSelect from './ModelSelect'

interface Props {
  projectName: string
  latentSpaceJobId: string | null
  logTransform: boolean
  percentiles: [number, number]
  mask: string
  onJobSubmitted: (jobId: string) => void
  onShowClusters: () => void
  onHideClusters: () => void
}

const resultColor: Record<string, string> = {
  success: 'green',
  dev: '#6366f1',
  error: 'red',
}

const divider = <hr style={{ border: 'none', borderTop: '1px solid #dee2e6', margin: '16px 0' }} />

export default function Clustering({
  projectName,
  latentSpaceJobId,
  logTransform,
  percentiles,
  mask,
  onJobSubmitted,
  onShowClusters,
  onHideClusters,
}: Props) {
  const [clusteringModelName, setClusteringModelName] = useState<string | null>(null)
  const [clusteringParams, setClusteringParams] = useState<ParameterValues>({})
  const [jobName, setJobName] = useState('clustering-job')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<JobSubmitResponse | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [showClusters, setShowClusters] = useState(false)

  const status = useJobStatus(activeJobId, 'clustering', projectName)

  useEffect(() => {
    if (!status?.ready) setShowClusters(false)
  }, [status?.ready])  // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelectPastJob(jobId: string | null) {
    if (!jobId) return
    setActiveJobId(jobId)
    onJobSubmitted(jobId)
    setResult(null)
    setShowClusters(false)
  }

  function handleParamsChange(modelName: string, params: ParameterValues) {
    setClusteringModelName(modelName)
    setClusteringParams(params)
  }

  const canSubmit = !!latentSpaceJobId && !!clusteringModelName && !!projectName && !submitting

  async function handleSubmit() {
    if (!latentSpaceJobId || !clusteringModelName) return
    setSubmitting(true)
    setResult(null)
    setShowClusters(false)
    try {
      const res = await submitClusteringJob({
        model_name: clusteringModelName,
        model_parameters: clusteringParams,
        log_transform: logTransform,
        percentiles,
        mask: mask !== 'None' ? mask : null,
        job_name: jobName,
        project_name: projectName,
        dimension_reduction_job_id: latentSpaceJobId,
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

  function handleToggleClusters(checked: boolean) {
    setShowClusters(checked)
    if (checked) onShowClusters()
    else onHideClusters()
  }

  const statusColor = status
    ? status.ready ? 'green' : status.state === 'FAILED' || status.state === 'CRASHED' ? 'red' : '#f59e0b'
    : '#ccc'
  const statusLabel = status
    ? status.ready ? 'Results ready' : status.state ? `State: ${status.state}` : 'Checking…'
    : null

  return (
    <div>
      {/* ── New job submission ── */}
      <ModelSelect
        label="Clustering Model"
        modelType="clustering"
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
        {submitting ? 'Submitting…' : 'Run Clustering'}
      </button>

      {!latentSpaceJobId && (
        <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Run Dimension Reduction first.</div>
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
            label="Past Clustering Jobs"
            tags={['latent-space-explorer', 'clustering']}
            value={activeJobId}
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
      {activeJobId && status && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: statusColor, marginBottom: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
          {statusLabel}
        </div>
      )}

      {/* Show Clusters toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: status?.ready ? 'pointer' : 'not-allowed', opacity: status?.ready ? 1 : 0.45 }}>
        <input
          type="checkbox"
          role="switch"
          checked={showClusters}
          disabled={!status?.ready}
          onChange={e => handleToggleClusters(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
        <span style={{ fontSize: 14 }}>Show Clusters</span>
      </label>

      {/* Logs modal */}
      {showLogs && activeJobId && (
        <LogsModal jobId={activeJobId} onClose={() => setShowLogs(false)} />
      )}
    </div>
  )
}
