import type { DataProjectDict } from './data'

export interface MlflowModelOption {
  label: string
  value: string | null
  algorithm: string
  date: string
}

export interface ModelVersionOption {
  label: string
  value: string
}

export interface LatentSpaceJobRequest {
  data_project_dict: DataProjectDict
  model_name: string
  model_parameters: Record<string, unknown>
  log_transform?: boolean
  percentiles?: number[]
  mask?: string | null
  job_name: string
  project_name: string
  mlflow_model_id: string
}

export interface ClusteringJobRequest {
  model_name: string
  model_parameters: Record<string, unknown>
  log_transform?: boolean
  percentiles?: number[]
  mask?: string | null
  job_name: string
  project_name: string
  dimension_reduction_job_id: string
}

export interface JobSubmitResponse {
  job_uid: string | null
  message: string
  status: 'success' | 'dev' | 'error'
}

export interface FlowRunOption {
  value: string
  label: string
  project_name: string
  algorithm: string
  autoencoder_model: string
  date: string
  state: string
}

export interface JobStatusResponse {
  ready: boolean
  state: string | null
  result_uri: string | null
}
