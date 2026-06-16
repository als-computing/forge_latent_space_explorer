import { API_BASE } from './base'
import type { Model, ModelType } from '../types/models'

export async function fetchModels(type?: ModelType): Promise<Model[]> {
  const url = type ? `${API_BASE}/models/?type=${type}` : `${API_BASE}/models/`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.statusText}`)
  return res.json()
}
