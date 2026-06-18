import { API_BASE } from './base'
import type { DataProjectDict, HeatmapResponse } from '../types/data'

interface LiveHeatmapRequest {
  data_project_dict: DataProjectDict
  selected_indices: number[]
  log_transform: boolean
  percentiles: [number, number]
  display_option: 'mean' | 'std'
}

export async function startLive(
  autoencoderModel: string,
  dimredModel: string,
  experimentName: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/live/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      autoencoder_model: autoencoderModel,
      dimred_model: dimredModel,
      experiment_name: experimentName,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Failed to start live mode')
  }
}

export async function stopLive(): Promise<void> {
  await fetch(`${API_BASE}/live/stop`, { method: 'POST' })
}

export async function fetchLiveHeatmap(req: LiveHeatmapRequest): Promise<HeatmapResponse> {
  const res = await fetch(`${API_BASE}/live/heatmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`Failed to fetch live heatmap: ${res.status}`)
  return res.json()
}
