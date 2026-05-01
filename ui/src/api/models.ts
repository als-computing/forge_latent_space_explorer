import type { Model, ModelType } from '../types/models'

export async function fetchModels(type?: ModelType): Promise<Model[]> {
  const url = type ? `/api/models/?type=${type}` : '/api/models/'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.statusText}`)
  return res.json()
}
