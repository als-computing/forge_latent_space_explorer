import type { MlflowModelOption } from '../types/jobs'

export async function fetchMlflowModels(): Promise<MlflowModelOption[]> {
  const res = await fetch('/api/jobs/mlflow-models')
  if (!res.ok) throw new Error(`Failed to fetch MLflow models: ${res.status}`)
  return res.json()
}
