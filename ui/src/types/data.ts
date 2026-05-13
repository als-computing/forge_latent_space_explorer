export interface Dataset {
  uri: string
  cumulative_data_count?: number
  filenames?: string[]
}

export interface DataProjectDict {
  root_uri?: string
  data_type?: string
  datasets: Dataset[]
  project_id?: string | null
}

export interface FilesystemChild {
  rel_path: string
  name: string
  type: 'directory' | 'file'
}

export interface TiledChild {
  node_path: string
  name: string
  type: 'container' | 'array'
}

export interface FeatureVectorResponse {
  vectors: number[][]
  n_components: number
}

export interface ClusterResponse {
  vectors: number[][]
  n_components: number
  clusters: number[]
}

export interface HeatmapResponse {
  data: number[][]
}
