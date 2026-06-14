export interface InfraState {
  tiled_ready: boolean
  mlflow_ready: boolean
  arroyo_ready: boolean
  websocket_ready: boolean
  any_infra_down: boolean
  last_checked: string
  tiled_error: string | null
  mlflow_error: string | null
  arroyo_error: string | null
  websocket_error: string | null
}
