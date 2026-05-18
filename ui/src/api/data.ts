import type {
  ClusterResponse,
  DataProjectDict,
  FeatureVectorResponse,
  FilesystemChild,
  HeatmapResponse,
  TiledChild,
} from '../types/data'

interface OverviewRequest {
  data_project_dict: DataProjectDict
  log_transform: boolean
  percentiles: [number, number]
  page?: number
  page_size?: number
}

interface HeatmapRequest {
  data_project_dict: DataProjectDict
  selected_indices: number[]
  log_transform: boolean
  percentiles: [number, number]
  display_option: 'mean' | 'std'
}

export async function listFilesystem(
  relPath: string,
): Promise<{ children: FilesystemChild[] }> {
  const params = new URLSearchParams({ rel_path: relPath })
  const res = await fetch(`/api/data/filesystem?${params}`)
  if (!res.ok) throw new Error(`Failed to list filesystem: ${res.status}`)
  return res.json()
}

export async function listTiledNode(
  baseUri: string,
  nodePath: string,
): Promise<{ children: TiledChild[] }> {
  const params = new URLSearchParams({ base_uri: baseUri, node_path: nodePath })
  const res = await fetch(`/api/data/tiled?${params}`)
  if (!res.ok) throw new Error(`Failed to list tiled node: ${res.status}`)
  return res.json()
}

export async function browseFiles(
  rootUri?: string,
  paths?: string[],
): Promise<DataProjectDict> {
  const res = await fetch('/api/data/browse/filesystem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ root_uri: rootUri, paths }),
  })
  if (!res.ok) throw new Error(`Failed to browse files: ${res.status}`)
  return res.json()
}

export async function browseTiled(
  uri: string,
  paths?: string[],
): Promise<DataProjectDict> {
  const res = await fetch('/api/data/browse/tiled', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uri, paths }),
  })
  if (!res.ok) throw new Error(`Failed to browse tiled: ${res.status}`)
  return res.json()
}

export async function fetchDefaultTiledUri(): Promise<string | null> {
  const res = await fetch('/api/data/default-tiled-uri')
  if (!res.ok) return null
  const data = await res.json() as { uri?: string | null }
  return data.uri ?? null
}

export async function fetchFeatureVectors(
  latentSpaceJobId: string,
  projectName: string,
): Promise<FeatureVectorResponse> {
  const params = new URLSearchParams({
    latent_space_job_id: latentSpaceJobId,
    project_name: projectName,
  })
  const res = await fetch(`/api/data/feature-vectors?${params}`)
  if (!res.ok) throw new Error(`Failed to fetch feature vectors: ${res.status}`)
  return res.json()
}

export async function fetchClusters(
  clusteringJobId: string,
  projectName: string,
  latentSpaceJobId = "",
): Promise<ClusterResponse> {
  const params = new URLSearchParams({
    clustering_job_id: clusteringJobId,
    project_name: projectName,
    latent_space_job_id: latentSpaceJobId,
  })
  const res = await fetch(`/api/data/clusters?${params}`)
  if (!res.ok) throw new Error(`Failed to fetch clusters: ${res.status}`)
  return res.json()
}

export async function fetchOverview(
  req: OverviewRequest,
): Promise<{ images: string[]; total: number }> {
  const res = await fetch('/api/data/overview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`Failed to fetch overview: ${res.status}`)
  return res.json()
}

export async function fetchHeatmap(req: HeatmapRequest): Promise<HeatmapResponse> {
  const res = await fetch('/api/data/heatmap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`Failed to fetch heatmap: ${res.status}`)
  return res.json()
}

export async function fetchDataProjectDictFromJob(jobId: string): Promise<DataProjectDict> {
  const params = new URLSearchParams({ dimension_reduction_job_id: jobId })
  const res = await fetch(`/api/data/data-project-dict?${params}`)
  if (!res.ok) throw new Error(`Failed to fetch data project dict: ${res.status}`)
  return res.json()
}

export async function fetchDataProjectDictFromClusteringJob(jobId: string): Promise<DataProjectDict> {
  const params = new URLSearchParams({ clustering_job_id: jobId })
  const res = await fetch(`/api/data/data-project-dict?${params}`)
  if (!res.ok) throw new Error(`Failed to fetch data project dict: ${res.status}`)
  return res.json()
}

export async function fetchMasks(): Promise<string[]> {
  const res = await fetch('/api/data/masks')
  if (!res.ok) throw new Error(`Failed to fetch masks: ${res.status}`)
  const data = await res.json() as { masks: string[] }
  return data.masks
}
