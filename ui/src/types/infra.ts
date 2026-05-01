export interface InfraState {
  tiled_ready: boolean
  mlflow_ready: boolean
  prefect_ready: boolean
  prefect_worker_ready: boolean
  any_infra_down: boolean
  last_checked: string
}
