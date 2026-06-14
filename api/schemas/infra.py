from pydantic import BaseModel


class InfraState(BaseModel):
    tiled_ready: bool
    mlflow_ready: bool
    arroyo_ready: bool
    websocket_ready: bool
    any_infra_down: bool
    last_checked: str
    tiled_error: str | None = None
    mlflow_error: str | None = None
    arroyo_error: str | None = None
    websocket_error: str | None = None
