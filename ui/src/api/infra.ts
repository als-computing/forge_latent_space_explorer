import { API_BASE } from './base'
import type { InfraState } from '../types/infra'

export async function fetchInfraHealth(): Promise<InfraState> {
  const res = await fetch(`${API_BASE}/infra/health`)
  if (!res.ok) throw new Error(`Infra check failed: ${res.statusText}`)
  return res.json()
}
