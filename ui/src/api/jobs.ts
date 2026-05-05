import type {
  ClusteringJobRequest,
  FlowRunOption,
  JobStatusResponse,
  JobSubmitResponse,
  LatentSpaceJobRequest,
  MlflowModelOption,
} from '../types/jobs'

export async function fetchFlowRuns(tags?: string[]): Promise<FlowRunOption[]> {
  const params = tags ? '?' + tags.map((t) => `tags=${encodeURIComponent(t)}`).join('&') : ''
  const res = await fetch(`/api/jobs/runs${params}`)
  if (!res.ok) throw new Error(`Failed to fetch flow runs: ${res.status}`)
  return res.json()
}

export async function fetchMlflowModels(): Promise<MlflowModelOption[]> {
  const res = await fetch('/api/jobs/mlflow-models')
  if (!res.ok) throw new Error(`Failed to fetch MLflow models: ${res.status}`)
  return res.json()
}

export async function submitLatentSpaceJob(
  req: LatentSpaceJobRequest,
): Promise<JobSubmitResponse> {
  const res = await fetch('/api/jobs/latent-space', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Job submission failed')
  }
  return res.json()
}

export async function fetchJobStatus(
  jobId: string,
  kind: 'latent-space' | 'clustering',
  projectName: string,
): Promise<JobStatusResponse> {
  const params = new URLSearchParams({ kind, project_name: projectName })
  const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/status?${params}`)
  if (!res.ok) throw new Error(`Failed to fetch job status: ${res.status}`)
  return res.json()
}

export async function submitClusteringJob(
  req: ClusteringJobRequest,
): Promise<JobSubmitResponse> {
  const res = await fetch('/api/jobs/clustering', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Job submission failed')
  }
  return res.json()
}
