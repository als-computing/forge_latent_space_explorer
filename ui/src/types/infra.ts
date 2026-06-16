export interface InfraState {
  tiled_ready: boolean
  mlflow_ready: boolean
  arroyo_ready: boolean
  data_source_ready: boolean
  any_infra_down: boolean
  last_checked: string
  tiled_error: string | null
  mlflow_error: string | null
  arroyo_error: string | null
  data_source_error: string | null
}
